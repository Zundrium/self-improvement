import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourceRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));

function svelteFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = `${directory}/${entry.name}`;
		if (entry.isDirectory()) return svelteFiles(path);
		return entry.name.endsWith('.svelte') ? [path] : [];
	});
}

function nativeTagViolations(tag: 'button' | 'form', allowedFile: string): string[] {
	const tagPattern = new RegExp(`<${tag}(?:\\s|>)`);
	return svelteFiles(sourceRoot)
		.filter((path) => path !== `${sourceRoot}/${allowedFile}`)
		.filter((path) => tagPattern.test(readFileSync(path, 'utf8')))
		.map((path) => path.slice(sourceRoot.length + 1));
}

describe('shared UI component standards', () => {
	it('renders native buttons only through Button', () => {
		expect(nativeTagViolations('button', 'lib/components/ui/button/button.svelte')).toEqual([]);
	});

	it('renders native forms only through Form', () => {
		expect(nativeTagViolations('form', 'lib/components/ui/form/form.svelte')).toEqual([]);
	});
});
