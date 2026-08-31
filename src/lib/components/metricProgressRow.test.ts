import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import MetricProgressRow from './metricProgressRow.svelte';
import Progress from './ui/progress/progress.svelte';

describe('MetricProgressRow', () => {
	it('uses the tracker primary color for its progress indicator', () => {
		const { body } = render(MetricProgressRow, {
			props: {
				label: 'Mon',
				value: 5000,
				max: 10000,
				displayValue: '5,000',
				colors: { primary: '#047857', secondary: '#0f766e' }
			}
		});

		expect(body).toContain('--progress-indicator-color: #047857');
	});

	it('keeps the existing indicator style override available to other progress views', () => {
		const { body } = render(Progress, {
			props: { value: 1, indicatorStyle: 'background: #6d28d9' }
		});

		expect(body).toContain('background: #6d28d9');
	});
});
