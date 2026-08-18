import { describe, expect, it } from 'vitest';
import { happinessInputFromForm, reasonOptionsForRating } from './happiness';

describe('happiness reasons', () => {
	it('uses negative reasons for levels one and two', () => {
		expect(reasonOptionsForRating(1).map((option) => option.value)).toContain('sad_event');
		expect(reasonOptionsForRating(2).map((option) => option.value)).toContain('self_esteem');
	});

	it('uses distinct positive reasons for middle and high levels', () => {
		const middleReasons = reasonOptionsForRating(3).map((option) => option.value);
		const highReasons = reasonOptionsForRating(5).map((option) => option.value);
		expect(middleReasons).toContain('small_win');
		expect(highReasons).toContain('achievement');
		expect(middleReasons).not.toContain('achievement');
	});

	it('rejects a reason from another happiness level', () => {
		const form = new FormData();
		form.set('localDate', '2026-08-18');
		form.set('rating', '2');
		form.append('reasons', 'achievement');
		expect(() => happinessInputFromForm(form)).toThrow('match your happiness level');
	});
});
