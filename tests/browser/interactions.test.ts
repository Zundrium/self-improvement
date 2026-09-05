import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { createRawSnippet, mount, tick, unmount } from 'svelte';
import Button from '$lib/components/ui/button/button.svelte';
import Pressable from '$lib/components/ui/pressable/pressable.svelte';
import SettingsSaveBar from '$lib/components/forms/SettingsSaveBar.svelte';
import ActionBars from './ActionBars.svelte';
import '../../src/routes/global.css';

const mounted: ReturnType<typeof mount>[] = [];
const label = createRawSnippet(() => ({ render: () => '<span>Open tracker</span>' }));

afterEach(async () => {
	for (const component of mounted.splice(0)) await unmount(component);
	document.body.innerHTML = '';
});

describe('shared interaction behavior in Chromium', () => {
	for (const component of [Button, Pressable]) {
		it(`${component.name} suppresses disabled link activation and callbacks`, async () => {
			const clicked = vi.fn();
			mounted.push(
				mount(component, {
					target: document.body,
					props: {
						href: '/steps',
						disabled: true,
						onclick: clicked,
						profile: 'plain',
						size: 'medium',
						children: label
					}
				})
			);
			await tick();
			const link = document.querySelector('a');
			if (!link) throw new Error('Link did not render');
			const event = new MouseEvent('click', { bubbles: true, cancelable: true });
			link.dispatchEvent(event);
			link.focus();
			await userEvent.keyboard('{Enter}');
			expect(clicked).not.toHaveBeenCalled();
			expect(event.defaultPrevented).toBe(true);
			expect(link.hasAttribute('href')).toBe(false);
			expect(link.tabIndex).toBe(-1);
		});
	}

	it('retains keyboard activation and form semantics for enabled buttons', async () => {
		const submitted = vi.fn((event: SubmitEvent) => event.preventDefault());
		const form = document.createElement('form');
		form.id = 'settings';
		form.addEventListener('submit', submitted);
		document.body.append(form);
		mounted.push(
			mount(Button, {
				target: document.body,
				props: {
					profile: 'highlighted',
					size: 'medium',
					type: 'submit',
					form: 'settings',
					children: label
				}
			})
		);
		await tick();
		const button = document.querySelector('button');
		if (!button) throw new Error('Button did not render');
		button.focus();
		await userEvent.keyboard('{Enter}');
		expect(submitted).toHaveBeenCalledTimes(1);
	});

	it('renders save controls without an app shell', async () => {
		mounted.push(
			mount(SettingsSaveBar, {
				target: document.body,
				props: {
					form: 'settings',
					saving: false,
					dirty: false
				}
			})
		);
		await expect.element(page.getByRole('button', { name: 'Saved' })).toBeDisabled();
	});

	it('restores parent actions after a nested workflow closes', async () => {
		mounted.push(mount(ActionBars, { target: document.body }));
		await expect.element(page.getByText('Parent actions')).toBeVisible();
		await page.getByRole('button', { name: 'Toggle workflow' }).click();
		await expect.element(page.getByText('Workflow actions')).toBeVisible();
		await expect.element(page.getByText('Parent actions')).not.toBeInTheDocument();
		await page.getByRole('button', { name: 'Toggle workflow' }).click();
		await expect.element(page.getByText('Parent actions')).toBeVisible();
	});
});
