#!/usr/bin/python3

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


def parse_args():
    parser = argparse.ArgumentParser(
        description="Convert white-background activity illustrations to transparent WebP files."
    )
    parser.add_argument("source", type=Path, help="Flat directory containing original WebP files")
    parser.add_argument("output", type=Path, help="Empty directory for converted WebP files")
    parser.add_argument("--model", default="isnet-anime", help="rembg model name")
    parser.add_argument(
        "--plan-b",
        action="store_true",
        help="Remove border-connected white regions with a hard topology mask",
    )
    parser.add_argument(
        "--seeds",
        type=Path,
        help="JSON map of filenames to enclosed-background pixel coordinates",
    )
    parser.add_argument("--contact-sheet", type=Path, help="Write a black-background contact sheet")
    return parser.parse_args()


def main():
    args = parse_args()
    validate_paths(args.source, args.output)
    sources = sorted(args.source.glob("*.webp"))
    if not sources:
        raise SystemExit(f"No WebP files found in {args.source}")
    for source in sources:
        validate_original(source)
    manual_seeds = load_seeds(args.seeds)
    if manual_seeds and not args.plan_b:
        raise SystemExit("--seeds requires --plan-b")

    args.output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="activity-image-masks-") as directory:
        mask_directory = Path(directory)
        run_rembg(args.source, mask_directory, args.model)
        for source in sources:
            mask = mask_directory / f"{source.stem}.png"
            process_image(source, mask, args.output / source.name, args.plan_b, manual_seeds)

    if args.contact_sheet:
        write_contact_sheet(args.output, args.contact_sheet)
    print(f"Converted {len(sources)} images into {args.output}")


def validate_paths(source, output):
    if not source.is_dir():
        raise SystemExit(f"Source directory does not exist: {source}")
    if source.resolve() == output.resolve():
        raise SystemExit("Source and output directories must differ")
    if output.exists() and any(output.iterdir()):
        raise SystemExit(f"Output directory must be empty: {output}")
    if not shutil.which("rembg"):
        raise SystemExit("rembg is not installed")


def validate_original(path):
    image = Image.open(path)
    if "A" not in image.getbands():
        return
    if image.getchannel("A").getextrema() != (255, 255):
        raise SystemExit(f"Source already contains transparency: {path}")


def load_seeds(path):
    if not path:
        return {}
    data = json.loads(path.read_text())
    if not isinstance(data, dict):
        raise SystemExit("Seed file must contain a JSON object")
    return data


def run_rembg(source, masks, model):
    subprocess.run(
        ["rembg", "p", "-m", model, "-om", "-ppm", str(source), str(masks)],
        check=True,
    )


def process_image(source, mask_path, output, plan_b, manual_seeds):
    if not mask_path.exists():
        raise SystemExit(f"rembg did not create a mask for {source.name}")
    rgb = Image.open(source).convert("RGB")
    luminance = np.asarray(rgb.convert("L")).astype("int16")
    subject = np.asarray(Image.open(mask_path).convert("L")).copy()
    if plan_b:
        removal = topology_removal(luminance, manual_seeds.get(source.name, []), source.name)
        subject[removal] = 0
    line_alpha = np.clip((245 - luminance) * 5, 0, 255).astype("uint8")
    alpha = np.maximum(subject, line_alpha)
    result = rgb.convert("RGBA")
    result.putalpha(Image.fromarray(alpha, "L"))
    if result.getchannel("A").getextrema() != (0, 255):
        raise SystemExit(f"Output does not contain complete transparency: {source.name}")
    result.save(output, "WEBP", quality=90, method=6)


def topology_removal(luminance, coordinates, filename):
    white = luminance > 220
    border = np.zeros_like(white)
    border[0, :] = white[0, :]
    border[-1, :] = white[-1, :]
    border[:, 0] = white[:, 0]
    border[:, -1] = white[:, -1]
    removal = ndimage.binary_propagation(border, mask=white)
    manual = np.zeros_like(white)
    height, width = white.shape
    for coordinate in coordinates:
        if not isinstance(coordinate, list) or len(coordinate) != 2:
            raise SystemExit(f"Invalid seed for {filename}: {coordinate}")
        x, y = coordinate
        if not (0 <= x < width and 0 <= y < height and white[y, x]):
            raise SystemExit(f"Seed is outside a white region in {filename}: {coordinate}")
        manual[y, x] = True
    if manual.any():
        removal |= ndimage.binary_propagation(manual, mask=white)
    return removal


def write_contact_sheet(output, destination):
    files = sorted(output.glob("*.webp"))
    columns = 4
    tile_width, tile_height = 320, 260
    rows = (len(files) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * tile_width, rows * tile_height), "#111111")
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(files):
        image = Image.open(path).convert("RGBA")
        image.thumbnail((296, 210), Image.Resampling.LANCZOS)
        x = (index % columns) * tile_width
        y = (index // columns) * tile_height
        preview = Image.new("RGBA", (tile_width, 220), "#000000")
        preview.alpha_composite(image, ((tile_width - image.width) // 2, (210 - image.height) // 2))
        sheet.paste(preview.convert("RGB"), (x, y))
        draw.text((x + 12, y + 232), path.name, fill="#ffffff")
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination)
    print(f"Contact sheet: {destination}")


if __name__ == "__main__":
    main()
