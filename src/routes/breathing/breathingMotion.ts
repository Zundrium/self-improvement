import { gsap } from 'gsap';
import type { Action } from 'svelte/action';

export type BreathingMotionOptions = {
	phase: 'inhale' | 'hold' | 'exhale';
	seconds: number;
	running: boolean;
};

const RESTING_SCALE = 0.42;
const VISUAL_SELECTOR = '[data-breathing-visual]';

export const breathingEnter: Action<HTMLElement> = (node) => {
	const visual = node.querySelector(VISUAL_SELECTOR);
	if (!visual || prefersReducedMotion()) return;
	gsap.set(visual, { autoAlpha: 0 });
	const tween = gsap.to(visual, {
		autoAlpha: 1,
		duration: 1.8,
		delay: 0.15,
		ease: 'power2.out',
		clearProps: 'opacity,visibility'
	});
	return { destroy: () => tween.kill() };
};

export const breathingDisabledFade: Action<HTMLElement, boolean> = (node, disabled) => {
	gsap.set(node, { opacity: disabled ? 0.4 : 1 });
	return {
		update(next) {
			animateDisabledState(node, next);
		},
		destroy() {
			gsap.killTweensOf(node);
			gsap.set(node, { clearProps: 'opacity' });
		}
	};
};

export const breathingPhaseText: Action<HTMLElement, boolean> = (node, running) => {
	gsap.set(node, { autoAlpha: running ? 1 : 0 });
	return {
		update(next) {
			animatePhaseText(node, next);
		},
		destroy() {
			gsap.killTweensOf(node);
			gsap.set(node, { clearProps: 'opacity,visibility' });
		}
	};
};

export const breathingPhaseScale: Action<HTMLElement, BreathingMotionOptions> = (node, options) => {
	let state = motionState(options);
	setInitialScale(node, options);
	return {
		update(next) {
			const nextState = motionState(next);
			if (state === nextState) return;
			state = nextState;
			animatePhase(node, next);
		},
		destroy() {
			gsap.killTweensOf(node);
			gsap.set(node, { clearProps: 'transform,transformOrigin' });
		}
	};
};

export const breathingHoldProgress: Action<HTMLElement, BreathingMotionOptions> = (
	node,
	options
) => {
	let state = motionState(options);
	setInitialHoldProgress(node, options);
	return {
		update(next) {
			const nextState = motionState(next);
			if (state === nextState) return;
			state = nextState;
			animateHoldProgress(node, next);
		},
		destroy() {
			gsap.killTweensOf(node);
			gsap.set(node, { clearProps: 'transform,transformOrigin' });
		}
	};
};

function setInitialScale(node: HTMLElement, options: BreathingMotionOptions) {
	const scale = options.running ? phaseScale(options.phase) : RESTING_SCALE;
	gsap.set(node, { scale, transformOrigin: 'center center', force3D: true });
}

function animatePhase(node: HTMLElement, options: BreathingMotionOptions) {
	gsap.killTweensOf(node);
	if (prefersReducedMotion())
		return void gsap.set(node, {
			scale: options.running ? phaseScale(options.phase) : RESTING_SCALE
		});
	if (!options.running) return resetSphere(node);
	if (options.phase === 'hold') return;
	gsap.to(node, {
		scale: phaseScale(options.phase),
		duration: options.seconds,
		ease: 'sine.inOut',
		overwrite: true
	});
}

function setInitialHoldProgress(node: HTMLElement, options: BreathingMotionOptions) {
	gsap.set(node, {
		scale: holdProgressScale(options),
		transformOrigin: 'center center',
		force3D: true
	});
}

function animateHoldProgress(node: HTMLElement, options: BreathingMotionOptions) {
	gsap.killTweensOf(node);
	const scale = holdProgressScale(options);
	if (prefersReducedMotion()) return void gsap.set(node, { scale });
	if (!options.running || options.phase === 'inhale') return void gsap.set(node, { scale });
	gsap.to(node, {
		scale,
		duration: options.seconds,
		ease: options.phase === 'hold' ? 'none' : 'sine.inOut',
		overwrite: true
	});
}

function animateDisabledState(node: HTMLElement, disabled: boolean) {
	gsap.killTweensOf(node);
	if (prefersReducedMotion()) return void gsap.set(node, { opacity: disabled ? 0.4 : 1 });
	gsap.to(node, {
		opacity: disabled ? 0.4 : 1,
		duration: 0.35,
		ease: 'power2.out',
		overwrite: true
	});
}

function animatePhaseText(node: HTMLElement, visible: boolean) {
	gsap.killTweensOf(node);
	if (prefersReducedMotion()) return void gsap.set(node, { autoAlpha: visible ? 1 : 0 });
	gsap.to(node, {
		autoAlpha: visible ? 1 : 0,
		duration: visible ? 0.6 : 0.3,
		delay: visible ? 0.15 : 0,
		ease: 'power2.out',
		overwrite: true
	});
}

function resetSphere(node: HTMLElement) {
	gsap.to(node, {
		scale: RESTING_SCALE,
		duration: 0.8,
		delay: 0.3,
		ease: 'power2.inOut',
		overwrite: true
	});
}

function phaseScale(phase: BreathingMotionOptions['phase']) {
	return phase === 'exhale' ? RESTING_SCALE : 1;
}

function holdProgressScale(options: BreathingMotionOptions) {
	return options.running && options.phase === 'hold' ? 1 : 0;
}

function motionState(options: BreathingMotionOptions) {
	return options.running ? `${options.phase}:${options.seconds}` : 'resting';
}

function prefersReducedMotion() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
