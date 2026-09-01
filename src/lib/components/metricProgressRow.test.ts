import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import MetricProgressRow from './metricProgressRow.svelte';
import Progress from './ui/progress/progress.svelte';

describe('MetricProgressRow', () => {
	it('uses the tracker gradient for its progress indicator', () => {
		const { body } = render(MetricProgressRow, {
			props: {
				label: 'Mon',
				value: 5000,
				max: 10000,
				displayValue: '5,000',
				colors: { primary: '#00F094', secondary: '#1BBDDA', tertiary: '#4568BA' }
			}
		});

		expect(body).toContain(
			'--progress-indicator-background: linear-gradient(135deg, #00F094 0%, #1BBDDA 52%, #4568BA 100%)'
		);
	});

	it('supports custom progress indicator backgrounds', () => {
		const { body } = render(Progress, {
			props: { value: 1, indicatorBackground: '#6d28d9' }
		});

		expect(body).toContain('--progress-indicator-background: #6d28d9');
	});
});
