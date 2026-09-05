export const flowOptions = [
	{ value: 'spotting', label: 'Spotting' },
	{ value: 'light', label: 'Light' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'heavy', label: 'Heavy' }
] as const;

export function periodInputFromForm(form: FormData) {
	const localDate = String(form.get('localDate') ?? '');
	const flow = String(form.get('flow') ?? '');
	const notes = String(form.get('notes') ?? '').trim();
	if (!isValidDate(localDate)) throw new Error('Choose a valid date.');
	if (!isMenstruationFlow(flow)) throw new Error('Choose a valid flow.');
	if (notes.length > 1_000) throw new Error('Keep notes under 1,000 characters.');
	return { localDate, flow, notes };
}

export function isValidDate(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const parsed = new Date(`${value}T00:00:00.000Z`);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function flowLabel(flow: MenstruationFlow) {
	return flowOptions.find((option) => option.value === flow)?.label ?? flow;
}

import { isMenstruationFlow, type MenstruationFlow } from '$lib/local/period/model';

export { cycleSummary, type MenstruationFlow } from '$lib/local/period/model';
