import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { createRawSnippet, mount, tick, unmount } from 'svelte';
import Button from '$lib/components/ui/button/button.svelte';
import { dismissTopOverlay } from '$native/back-navigation';
import DialogHarness from './DialogHarness.svelte';
import '../../src/routes/global.css';

const mounted: ReturnType<typeof mount>[] = [];
afterEach(async () => {
	for (const component of mounted.splice(0)) await unmount(component);
	document.documentElement.classList.remove('dark');
	document.body.innerHTML = '';
});

function rgb(color: string) {
	const context = document.createElement('canvas').getContext('2d');
	if (!context) throw new Error('Canvas is unavailable');
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
}

function luminance(color: string) {
	const channels = rgb(color).map((value) => {
		const srgb = value / 255;
		return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
	});
	return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a: string, b: string) {
	const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('rendered accessibility contracts', () => {
	it('keeps small status and muted text readable in both themes', () => {
		const probe = document.createElement('p');
		document.body.append(probe);
		for (const dark of [false, true]) {
			document.documentElement.classList.toggle('dark', dark);
			for (const status of ['success', 'danger', 'info']) {
				probe.style.color = 'var(--status-foreground)';
				probe.style.backgroundColor = `var(--status-${status})`;
				const style = getComputedStyle(probe);
				expect(contrast(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5);
			}
			probe.style.color = 'var(--text-muted)';
			probe.style.backgroundColor = 'var(--bg)';
			const style = getComputedStyle(probe);
			expect(contrast(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5);
		}
	});

	it('keeps action gradients readable even at the brightest possible palette endpoint', async () => {
		mounted.push(
			mount(Button, {
				target: document.body,
				props: {
					profile: 'highlighted',
					size: 'medium',
					children: createRawSnippet(() => ({ render: () => '<span>Save</span>' }))
				}
			})
		);
		await tick();
		const button = document.querySelector('button');
		if (!button) throw new Error('Button did not render');
		button.style.setProperty('--motion-primary', '#ffffff');
		button.style.setProperty('--motion-secondary', '#ffffff');
		button.style.setProperty('--motion-tertiary', '#ffffff');
		const style = getComputedStyle(button);
		const endpoints = style.backgroundImage.match(/color\(srgb [^)]+\)/g);
		expect(endpoints).toHaveLength(3);
		for (const color of endpoints ?? [])
			expect(contrast(style.color, color)).toBeGreaterThanOrEqual(4.5);
	});

	it('bounds long dialogs and forwards Android back to the overlay', async () => {
		mounted.push(mount(DialogHarness, { target: document.body }));
		await page.getByRole('button', { name: 'Open details' }).click();
		await expect.element(page.getByRole('dialog')).toBeVisible();
		const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
		if (!dialog) throw new Error('Dialog did not render');
		expect(dialog.getBoundingClientRect().height).toBeLessThanOrEqual(window.innerHeight - 30);
		expect(getComputedStyle(dialog).overflowY).toBe('auto');
		expect(dismissTopOverlay()).toBe(true);
		await expect.poll(() => dialog.getAttribute('data-state')).toBe('closed');
		await expect.element(dialog).not.toBeVisible();
	});
});
