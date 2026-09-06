import { afterEach, describe, expect, it } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import ActionFeedItem from '../../src/routes/components/ActionFeedItem.svelte';
import type { ActionStatus } from '$lib/actions/contracts';
import '../../src/routes/global.css';

const mounted: ReturnType<typeof mount>[] = [];
afterEach(async () => {
	for (const component of mounted.splice(0)) await unmount(component);
	document.body.innerHTML = '';
	document.documentElement.classList.remove('dark');
});

describe('tracker status cards', () => {
	for (const dark of [false, true]) {
		for (const status of ['complete', 'rest', 'attention', 'actionable'] as ActionStatus[]) {
			it(`renders ${status} in ${dark ? 'dark' : 'light'} mode`, async () => {
				document.documentElement.classList.toggle('dark', dark);
				mounted.push(
					mount(ActionFeedItem, {
						target: document.body,
						props: {
							item: {
								id: 'steps.status',
								trackerIds: ['steps'],
								status,
								priority: 'activity',
								icon: 'tracker',
								title: 'Step status',
								reason: '5,000 of 5,000 steps',
								action: { type: 'navigate', href: '/steps' }
							},
							onexecute: () => {}
						}
					})
				);
				await tick();
				const link = document.querySelector('a');
				if (!link) throw new Error('Missing tracker link');
				expect(link.getAttribute('href')).toBe('/steps');
				link.focus();
				expect(document.activeElement).toBe(link);
				expect(document.querySelector('[aria-label="Completed"]') !== null).toBe(
					status === 'complete'
				);
				expect(getComputedStyle(link, '::before').backgroundImage === 'none').toBe(
					status === 'complete' || status === 'rest'
				);
			});
		}
	}
});
