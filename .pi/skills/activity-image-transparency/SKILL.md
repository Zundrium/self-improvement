---
name: activity-image-transparency
description: Convert the project's white-background fitness and Stretch line illustrations into transparent WebP assets. Use when adding, replacing, or repairing activity images under static/fitness/activities or static/stretch/activities.
---

# Activity image transparency

Use `scripts/process.py`. Resolve this path from this skill directory.

Always process original white-background files. Never use an already transparent or previously processed file as the source. The script rejects transparent sources.

Write results to `/tmp` first. Never overwrite project assets before reviewing them against black.

## Workflow

1. Put the original WebP files in a flat temporary source directory.
2. Run the normal rembg pass:

```sh
rm -rf /tmp/activity-images-output
/usr/bin/python3 .pi/skills/activity-image-transparency/scripts/process.py \
  /tmp/activity-images-source \
  /tmp/activity-images-output \
  --contact-sheet /tmp/activity-images-contact.png
```

The default uses `isnet-anime`, a post-processed subject mask, restored dark line work, and WebP quality 90. It preserves white figure fills, arrows, equipment, and anti-aliased outlines.

3. Review every image on the black contact sheet. Check gaps between limbs, enclosed motion guides, props, wall lines, and translucent gray regions.
4. Copy only approved outputs into the matching `static/<tracker>/activities/` directory.
5. Bump any image cache query used by the route. Update matching tests.
6. Remove temporary review routes or files before committing.

Do not invert the images in dark mode. Their white fills must remain white.

## Plan B

Use Plan B when rembg fills background gaps or leaves gray regions:

```sh
rm -rf /tmp/activity-images-output
/usr/bin/python3 .pi/skills/activity-image-transparency/scripts/process.py \
  /tmp/activity-images-source \
  /tmp/activity-images-output \
  --plan-b \
  --contact-sheet /tmp/activity-images-contact.png
```

Plan B removes border-connected white regions with a hard topology mask. It avoids rembg's uncertain soft alpha while retaining enclosed white body and clothing fills.

Some incorrect background regions are fully enclosed by dark lines. Add one source-pixel seed inside each such region:

```json
{
  "leg-circles.webp": [[392, 111]],
  "raised-legs-circles.webp": [[388, 87]]
}
```

Then pass the JSON file with `--seeds /tmp/activity-image-seeds.json`. Seeds use `[x, y]` coordinates from the original image. Add seeds only after Plan B still leaves an enclosed white region.

Do not use alpha matting to fix semantic gaps. It only refines edges. Do not use `u2net_human_seg`; it performed poorly on this line art. Avoid the BiRefNet models in this environment because inference exceeded available memory.

## Validation

Validate all final assets with Pillow:

```sh
/usr/bin/python3 - <<'PY'
from pathlib import Path
from PIL import Image

paths = list(Path('static/fitness/activities').glob('*.webp'))
paths += list(Path('static/stretch/activities').glob('*.webp'))
for path in paths:
    image = Image.open(path)
    assert image.format == 'WEBP'
    assert image.mode == 'RGBA'
    assert image.getchannel('A').getextrema() == (0, 255)
print(f'{len(paths)} transparent WebP assets validated')
PY
```

Run `npm run check`, `npm run lint`, and `npm run test`. Do not run the build without local approval.
