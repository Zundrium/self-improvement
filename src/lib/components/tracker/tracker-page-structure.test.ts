import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse, type AST } from 'svelte/compiler';
import type { AppTrackerId } from '$lib/trackers/registry';

const trackerPageFiles = {
	steps: 'src/routes/steps/+page.svelte',
	sleep: 'src/routes/sleep/+page.svelte',
	'screen-time': 'src/routes/screen-time/+page.svelte',
	fitness: 'src/routes/fitness/+page.svelte',
	nutrition: 'src/routes/nutrition/log/[date]/+page.svelte',
	meditation: 'src/routes/meditation/+page.svelte',
	breathing: 'src/routes/breathing/+page.svelte',
	stretch: 'src/routes/stretch/+page.svelte',
	chores: 'src/routes/chores/+page.svelte',
	happiness: 'src/routes/happiness/+page.svelte',
	period: 'src/routes/period/+page.svelte'
} satisfies Record<AppTrackerId, string>;

describe('tracker page composition', () => {
	it.each(Object.entries(trackerPageFiles))(
		'%s composes its content body from reusable section components',
		(_trackerId, file) => {
			const source = readFileSync(file, 'utf8');
			const root = parse(source, { filename: file, modern: true });
			const trackerPage = root.fragment.nodes.find(
				(node): node is AST.Component => node.type === 'Component' && node.name === 'TrackerPage'
			);

			expect(trackerPage, `${file} must use TrackerPage`).toBeDefined();
			expect(sectionCompositionErrors(trackerPage?.fragment.nodes ?? [])).toEqual([]);
		}
	);
});

function sectionCompositionErrors(nodes: AST.Fragment['nodes'], path = 'TrackerPage'): string[] {
	return nodes.flatMap((node) => sectionNodeErrors(node, path));
}

function sectionNodeErrors(node: AST.Fragment['nodes'][number], path: string): string[] {
	switch (node.type) {
		case 'Text':
			return node.data.trim() ? [`${path} contains raw text`] : [];
		case 'Comment':
		case 'ConstTag':
			return [];
		case 'Component': {
			if (!isSectionComponent(node.name)) return [`${path} contains <${node.name}>`];
			if (node.name === 'TrackerSections') {
				return sectionCompositionErrors(node.fragment.nodes, `${path} > TrackerSections`);
			}
			return hasInlineContent(node.fragment.nodes)
				? [`${path} configures <${node.name}> with inline content`]
				: [];
		}
		case 'IfBlock':
			return [
				...sectionCompositionErrors(node.consequent.nodes, `${path} > if`),
				...sectionCompositionErrors(node.alternate?.nodes ?? [], `${path} > else`)
			];
		case 'EachBlock':
			return [
				...sectionCompositionErrors(node.body.nodes, `${path} > each`),
				...sectionCompositionErrors(node.fallback?.nodes ?? [], `${path} > fallback`)
			];
		case 'KeyBlock':
			return sectionCompositionErrors(node.fragment.nodes, `${path} > key`);
		case 'AwaitBlock':
			return [node.pending, node.then, node.catch].flatMap((fragment) =>
				sectionCompositionErrors(fragment?.nodes ?? [], `${path} > await`)
			);
		default:
			return [`${path} contains ${node.type}`];
	}
}

function hasInlineContent(nodes: AST.Fragment['nodes']) {
	return nodes.some((node) => node.type !== 'Text' || Boolean(node.data.trim()));
}

function isSectionComponent(name: string) {
	return name.endsWith('Section') || name.endsWith('Sections');
}
