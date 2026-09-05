import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { mount, tick, unmount } from 'svelte';
import StepsSettingsHarness from './StepsSettingsHarness.svelte';
import NutritionEntryHarness from './NutritionEntryHarness.svelte';
import NutritionTrackHarness from './NutritionTrackHarness.svelte';
import PeriodDateHarness from './PeriodDateHarness.svelte';
import '../../src/routes/global.css';

const mocks = vi.hoisted(() => ({
	resolveSave: undefined as (() => void) | undefined,
	apiRequest: vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>(
		() =>
			new Promise<void>((resolve) => {
				mocks.resolveSave = resolve;
			})
	),
	localOperation: vi.fn<(operation: string, input: unknown) => Promise<unknown>>(
		() =>
			new Promise<void>((resolve) => {
				mocks.resolveSave = resolve;
			})
	),
	invalidateAll: vi.fn(() => Promise.resolve()),
	goto: vi.fn(() => Promise.resolve())
}));

vi.mock('$lib/api', () => ({ apiRequest: mocks.apiRequest, localOperation: mocks.localOperation }));
vi.mock('$lib/local/secrets', () => ({
	localSecretStore: { openRouterApiKey: vi.fn(() => Promise.resolve('')) }
}));
vi.mock('$app/navigation', () => ({
	beforeNavigate: vi.fn(),
	goto: mocks.goto,
	invalidateAll: mocks.invalidateAll,
	invalidate: mocks.invalidateAll
}));

const mounted: ReturnType<typeof mount>[] = [];
afterEach(async () => {
	for (const component of mounted.splice(0)) await unmount(component);
	document.body.innerHTML = '';
	mocks.apiRequest.mockClear();
	mocks.localOperation.mockClear();
	mocks.invalidateAll.mockClear();
	mocks.goto.mockReset();
	mocks.goto.mockResolvedValue(undefined);
	mocks.resolveSave = undefined;
});

describe('form draft lifecycle in Chromium', () => {
	it('does not apply a previous date save to a new pending entry', async () => {
		const component = mount(PeriodDateHarness, { target: document.body });
		mounted.push(component);
		const notes = page.getByRole('textbox', { name: 'Notes' });
		await notes.fill('First day');
		await page.getByRole('button', { name: 'Save entry' }).click();
		const resolveFirst = mocks.resolveSave;
		component.select('2026-09-04');
		await expect.element(notes).toHaveValue('');
		await notes.fill('Second day');
		await page.getByRole('button', { name: 'Save entry' }).click();
		resolveFirst?.();
		await tick();
		await expect.element(page.getByRole('button', { name: 'Saving…' })).toBeDisabled();
		await expect.element(notes).toHaveValue('Second day');
		expect(
			mocks.apiRequest.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).localDate)
		).toEqual(['2026-09-05', '2026-09-04']);
		mocks.resolveSave?.();
		await expect.element(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
	});

	it('preserves edits made while a settings save is pending', async () => {
		mounted.push(mount(StepsSettingsHarness, { target: document.body }));
		const input = page.getByRole('spinbutton', { name: 'Steps per day' });
		await input.fill('6000');
		await page.getByRole('button', { name: 'Save changes' }).click();
		await input.fill('6500');
		mocks.resolveSave?.();
		await tick();
		await expect.element(input).toHaveValue(6500);
		await expect.element(page.getByRole('button', { name: 'Save changes' })).toBeEnabled();
		expect(JSON.parse(String(mocks.apiRequest.mock.calls[0]?.[1]?.body))).toEqual({
			dailyGoal: 6000
		});
	});

	it('reconciles a clean settings form when loader props change', async () => {
		mounted.push(mount(StepsSettingsHarness, { target: document.body }));
		await page.getByRole('button', { name: 'Load updated settings' }).click();
		await expect.element(page.getByRole('spinbutton', { name: 'Steps per day' })).toHaveValue(7000);
		await expect.element(page.getByRole('button', { name: 'Saved' })).toBeDisabled();
	});

	it('resets the editor and target identity on same-route entry changes', async () => {
		mounted.push(mount(NutritionEntryHarness, { target: document.body }));
		const name = page.getByRole('textbox', { name: 'Log name' });
		await expect.element(name).toHaveValue('First meal');
		await name.fill('Unsaved first edit');
		await page.getByRole('button', { name: 'Open second entry' }).click();
		await expect.element(name).toHaveValue('Second meal');
		await name.fill('Edited second meal');
		await page.getByRole('button', { name: 'Save meal' }).click();
		expect(mocks.localOperation.mock.calls[0]).toMatchObject([
			'updateNutritionEntry',
			{ entryId: 'second' }
		]);
	});

	it('creates a manual meal when no OpenRouter key is configured', async () => {
		mocks.localOperation.mockResolvedValueOnce({});
		mocks.goto.mockRejectedValueOnce(new Error('Navigation failed'));
		mounted.push(mount(NutritionTrackHarness, { target: document.body }));
		await page.getByRole('button', { name: 'Add meal manually' }).click();
		await page.getByRole('textbox', { name: 'Log name' }).fill('Offline lunch');
		await page.getByRole('button', { name: /Ingredient 1/ }).click();
		await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Sandwich');
		await page.getByRole('button', { name: 'Save meal' }).click();
		expect(mocks.localOperation.mock.calls[0]).toMatchObject([
			'createNutritionEntry',
			{ date: '2026-09-05', name: 'Offline lunch' }
		]);
		await expect.element(page.getByText('Meal saved')).toBeVisible();
		await page.getByRole('button', { name: 'Open food log' }).click();
		expect(mocks.localOperation).toHaveBeenCalledTimes(1);
	});
});
