import { gsap } from 'gsap';
import type { Action } from 'svelte/action';
import { prefersReducedMotion, watchReducedMotion } from './preference';

const numberPattern = /-?\d[\d,]*(?:\.\d+)?/g;

export function valueInterpolator(from: string, to: string) {
	const start = [...from.matchAll(numberPattern)];
	const end = [...to.matchAll(numberPattern)];
	if (!end.length || start.length !== end.length) return;
	if (from.replace(numberPattern, '#') !== to.replace(numberPattern, '#')) return;
	return (progress: number) => {
		if (progress >= 1) return to;
		let index = 0;
		return to.replace(numberPattern, (token) => {
			const previous = start[index++][0];
			const initial = Number(previous.replaceAll(',', ''));
			const final = Number(token.replaceAll(',', ''));
			const decimals = token.split('.')[1]?.length ?? 0;
			return (initial + (final - initial) * progress).toLocaleString('en-US', {
				useGrouping: token.includes(',') || previous.includes(','),
				minimumIntegerDigits: token.startsWith('0') ? token.split('.')[0].length : 1,
				minimumFractionDigits: decimals,
				maximumFractionDigits: decimals
			});
		});
	};
}

export type AnimatedValueOptions = { value: string | number; format?: (value: number) => string };

export const animatedValue: Action<HTMLElement, AnimatedValueOptions> = (node, options) => {
	const text = ({ value, format }: AnimatedValueOptions) =>
		format && typeof value === 'number' ? format(value) : String(value);
	let target = text(options);
	let displayedNumber = typeof options.value === 'number' ? options.value : 0;
	let numericTarget = displayedNumber;
	let tween: gsap.core.Tween | undefined;
	node.textContent = target;
	const finish = () => {
		tween?.kill();
		displayedNumber = numericTarget;
		node.textContent = target;
	};
	const unwatch = watchReducedMotion(finish);
	return {
		update(next) {
			const previousNumber = displayedNumber;
			const nextNumber = typeof next.value === 'number' ? next.value : 0;
			if (text(next) === target && nextNumber === numericTarget) return;
			numericTarget = nextNumber;
			target = text(next);
			tween?.kill();
			const format = next.format;
			const interpolate =
				format && typeof next.value === 'number'
					? (progress: number) => {
							displayedNumber = previousNumber + (numericTarget - previousNumber) * progress;
							return format(displayedNumber);
						}
					: valueInterpolator(node.textContent ?? '', target);
			if (!interpolate || prefersReducedMotion()) return finish();
			const state = { progress: 0 };
			tween = gsap.to(state, {
				progress: 1,
				duration: 0.55,
				ease: 'power2.out',
				onUpdate: () => {
					node.textContent = interpolate(state.progress);
				},
				onComplete: finish
			});
		},
		destroy() {
			tween?.kill();
			unwatch();
		}
	};
};
