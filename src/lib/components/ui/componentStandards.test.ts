import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

const sourceRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));

function svelteFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = `${directory}/${entry.name}`;
		if (entry.isDirectory()) return svelteFiles(path);
		return entry.name.endsWith('.svelte') ? [path] : [];
	});
}

function nativeTagViolations(tag: 'button' | 'form', allowedFiles: string[]): string[] {
	const tagPattern = new RegExp(`<${tag}(?:\\s|>)`);
	return svelteFiles(sourceRoot)
		.filter((path) => !allowedFiles.some((file) => path === `${sourceRoot}/${file}`))
		.filter((path) => tagPattern.test(readFileSync(path, 'utf8')))
		.map((path) => path.slice(sourceRoot.length + 1));
}

type ComponentNode = {
	type?: string;
	name?: string;
	attributes?: Array<{
		type?: string;
		name?: string;
		value?: true | Array<{ data?: string }>;
	}>;
	[key: string]: unknown;
};

function componentNodes(value: unknown): ComponentNode[] {
	if (!value || typeof value !== 'object') return [];
	const node = value as ComponentNode;
	const nested = Object.entries(node)
		.filter(([key]) => key !== 'metadata')
		.flatMap(([, child]) =>
			Array.isArray(child) ? child.flatMap(componentNodes) : componentNodes(child)
		);
	return node.type === 'Component' ? [node, ...nested] : nested;
}

function buttonSizingViolations(): string[] {
	const allowedSizes = new Set(['small', 'medium', 'large']);
	const sizingClass = /(?:^|\s)(?:[a-z]+:)*(?:h|size|p[trblxyse]?)-\S+/;
	return svelteFiles(sourceRoot).flatMap((path) => {
		const source = readFileSync(path, 'utf8');
		const buttons = componentNodes(parse(source, { modern: true }).fragment).filter(
			(node) => node.name === 'Button'
		);
		const invalid = buttons.some((button) => {
			const sizeAttribute = button.attributes?.find((attribute) => attribute.name === 'size');
			const classValue = button.attributes?.find((attribute) => attribute.name === 'class')?.value;
			const size = Array.isArray(sizeAttribute?.value) ? sizeAttribute.value[0]?.data : undefined;
			const className = Array.isArray(classValue)
				? classValue.map((part) => part.data ?? '').join('')
				: undefined;
			return Boolean(
				!sizeAttribute ||
					(size && !allowedSizes.has(size)) ||
					(className && sizingClass.test(className))
			);
		});
		return invalid ? [path.slice(sourceRoot.length + 1)] : [];
	});
}

describe('shared UI component standards', () => {
	it('renders native buttons only through shared interaction primitives', () => {
		expect(
			nativeTagViolations('button', [
				'lib/components/ui/button/button.svelte',
				'lib/components/ui/pressable/pressable.svelte'
			])
		).toEqual([]);
	});

	it('uses universal button sizes without local dimensional overrides', () => {
		expect(buttonSizingViolations()).toEqual([]);
	});

	it('renders native forms only through Form', () => {
		expect(nativeTagViolations('form', ['lib/components/ui/form/form.svelte'])).toEqual([]);
	});
});
