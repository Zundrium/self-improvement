import { gsap } from 'gsap';
import type { Action } from 'svelte/action';

export type GradientColors = { primary: string; secondary: string; tertiary: string };
export type InteractionScaleOptions = { disabled?: boolean; hover?: number; pressed?: number };
export type SurfaceMotion = 'accordion' | 'dialog' | 'menu' | 'overlay';
export type StaggerOptions = { delay?: number; selector?: string; y?: number };

const PRESS_SELECTOR =
	"button, a[data-slot='button'], [data-motion-press], [role='button'][tabindex]";
export const motionRoot: Action<HTMLElement> = () => {
	const activePointers = new Map<number, HTMLElement>();
	const activeKeys = new Set<HTMLElement>();

	const pointerDown = (event: PointerEvent) => pressPointer(event, activePointers);
	const pointerUp = (event: PointerEvent) => releasePointer(event, activePointers);
	const keyDown = (event: KeyboardEvent) => pressKey(event, activeKeys);
	const keyUp = (event: KeyboardEvent) => releaseKey(event, activeKeys);

	document.addEventListener('pointerdown', pointerDown, true);
	document.addEventListener('pointerup', pointerUp, true);
	document.addEventListener('pointercancel', pointerUp, true);
	document.addEventListener('keydown', keyDown, true);
	document.addEventListener('keyup', keyUp, true);

	return {
		destroy() {
			document.removeEventListener('pointerdown', pointerDown, true);
			document.removeEventListener('pointerup', pointerUp, true);
			document.removeEventListener('pointercancel', pointerUp, true);
			document.removeEventListener('keydown', keyDown, true);
			document.removeEventListener('keyup', keyUp, true);
		}
	};
};

export const pageEnter: Action<HTMLElement> = (node) => {
	if (reducedMotion()) return showImmediately(node);
	node.style.visibility = 'hidden';
	const frame = requestAnimationFrame(() => revealPage(node));
	return { destroy: () => cancelAnimationFrame(frame) };
};

export const interactionScale: Action<HTMLElement, InteractionScaleOptions | undefined> = (
	node,
	options = {}
) => {
	let settings = options;
	let hovered = false;
	gsap.set(node, { force3D: true, scaleX: 1, scaleY: 1, transformOrigin: 'center center' });
	const scaleXTo = gsap.quickTo(node, 'scaleX', { duration: 0.2, ease: 'power2.out' });
	const scaleYTo = gsap.quickTo(node, 'scaleY', { duration: 0.2, ease: 'power2.out' });
	const moveTo = (scale: number, duration: number) => {
		if (reducedMotion()) return void gsap.set(node, { scaleX: 1, scaleY: 1 });
		scaleXTo.tween.duration(duration);
		scaleYTo.tween.duration(duration);
		scaleXTo(scale);
		scaleYTo(scale);
	};
	const enter = (event: PointerEvent) => {
		if (event.pointerType !== 'mouse' || settings.disabled) return;
		hovered = true;
		moveTo(settings.hover ?? 1.01, 0.2);
	};
	const leave = () => {
		hovered = false;
		moveTo(1, 0.2);
	};
	const down = (event: PointerEvent) => {
		if (event.button !== 0 || settings.disabled) return;
		moveTo(settings.pressed ?? 0.96, 0.1);
	};
	const up = () => {
		const scale = hovered && !settings.disabled ? (settings.hover ?? 1.01) : 1;
		moveTo(scale, 0.28);
	};
	node.dataset.motionScale = '';
	node.addEventListener('pointerenter', enter);
	node.addEventListener('pointerleave', leave);
	node.addEventListener('pointerdown', down);
	node.addEventListener('pointerup', up);
	node.addEventListener('pointercancel', up);
	return {
		update(next = {}) {
			settings = next;
			if (settings.disabled) moveTo(1, 0.2);
		},
		destroy() {
			node.removeEventListener('pointerenter', enter);
			node.removeEventListener('pointerleave', leave);
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', up);
			delete node.dataset.motionScale;
			scaleXTo.tween.kill();
			scaleYTo.tween.kill();
			gsap.set(node, { clearProps: 'transform,transformOrigin' });
		}
	};
};

export const staggerChildren: Action<HTMLElement, StaggerOptions | undefined> = (
	node,
	options = {}
) => {
	const animated = new WeakSet<Element>();
	let settings = options;
	const frame = requestAnimationFrame(() => revealNewChildren(node, settings, animated));
	const observer = new MutationObserver(() => revealNewChildren(node, settings, animated));
	observer.observe(node, { childList: true, subtree: false });
	return {
		update(next = {}) {
			settings = next;
		},
		destroy() {
			cancelAnimationFrame(frame);
			observer.disconnect();
			gsap.killTweensOf(childrenFor(node, settings.selector));
		}
	};
};

export const progressRing: Action<SVGCircleElement, number> = (node, percentage) => {
	const progress = { value: 0 };
	let tween: gsap.core.Tween | undefined;
	let lastUpdate = performance.now();
	const render = () => (node.style.strokeDasharray = `${progress.value} 100`);
	const moveTo = (value: number, initial = false) => {
		const rapidUpdate = performance.now() - lastUpdate < 250;
		lastUpdate = performance.now();
		tween?.kill();
		if (reducedMotion() || (!initial && rapidUpdate)) return setProgress(progress, value, render);
		tween = gsap.to(progress, {
			value: clampPercentage(value),
			duration: initial ? 0.9 : 0.45,
			ease: initial ? 'power3.out' : 'power2.out',
			overwrite: true,
			onUpdate: render
		});
	};
	setProgress(progress, 0, render);
	moveTo(percentage, true);
	return { update: moveTo, destroy: () => tween?.kill() };
};

export const spin: Action<HTMLElement, boolean | undefined> = (node, active = true) => {
	let tween: gsap.core.Tween | undefined;
	const sync = (shouldSpin: boolean) => {
		tween?.kill();
		tween = undefined;
		if (!shouldSpin || reducedMotion()) {
			gsap.set(node, { clearProps: 'transform' });
			return;
		}
		tween = gsap.to(node, {
			rotation: 360,
			duration: 0.85,
			ease: 'none',
			repeat: -1
		});
	};
	sync(active);
	return {
		update(next = true) {
			sync(next);
		},
		destroy() {
			tween?.kill();
			gsap.set(node, { clearProps: 'transform' });
		}
	};
};

export type LinearProgressOptions = { value: number; animated?: boolean };

export const linearProgress: Action<HTMLElement, LinearProgressOptions> = (node, options) => {
	let tween: gsap.core.Tween | undefined;
	const moveTo = ({ value, animated = true }: LinearProgressOptions, initial = false) => {
		const xPercent = clampPercentage(value) - 100;
		tween?.kill();
		if (!animated || reducedMotion()) return setLinearProgress(node, xPercent);
		tween = gsap.to(node, {
			xPercent,
			duration: initial ? 0.8 : 0.4,
			ease: initial ? 'power3.out' : 'power2.out',
			overwrite: true
		});
	};
	setLinearProgress(node, -100);
	moveTo(options, true);
	return { update: moveTo, destroy: () => tween?.kill() };
};

export const gradientColors: Action<HTMLElement, GradientColors | undefined> = (node, colors) => {
	let current = colors;
	if (colors) setGradient(node, colors);
	return {
		update(next) {
			if (sameColors(current, next)) return;
			current = next;
			if (!next) return clearGradient(node);
			if (reducedMotion()) return setGradient(node, next);
			gsap.to(node, {
				'--motion-primary': next.primary,
				'--motion-secondary': next.secondary,
				'--motion-tertiary': next.tertiary,
				duration: 0.35,
				ease: 'power2.out',
				overwrite: 'auto'
			});
		},
		destroy: () => gsap.killTweensOf(node)
	};
};

export const drawerEnter: Action<HTMLElement, () => void> = (node, dismiss) => {
	if (!reducedMotion()) {
		gsap.fromTo(
			node,
			{ y: drawerTravel(node), force3D: true },
			{ y: 0, force3D: true, duration: 0.5, ease: 'power3.out' }
		);
	}
	const gesture = drawerGesture(node, dismiss);
	return {
		destroy() {
			gesture.destroy?.();
			gsap.killTweensOf(node);
		}
	};
};

export function closeDrawer(node: HTMLElement | undefined) {
	if (!node || reducedMotion()) return Promise.resolve();
	return new Promise<void>((resolve) => {
		gsap.to(node, {
			y: drawerTravel(node),
			force3D: true,
			duration: 0.28,
			ease: 'power2.in',
			onComplete: resolve
		});
	});
}

export function dismissLoadingScreen() {
	const screen = document.getElementById('app-loading-screen');
	if (!screen) return;
	if (reducedMotion()) return screen.remove();
	gsap.to(screen, {
		autoAlpha: 0,
		duration: 0.35,
		ease: 'power2.out',
		onComplete: () => screen.remove()
	});
}

export function watchMotionState(node: HTMLElement, kind: SurfaceMotion) {
	const sync = () => animateSurfaceState(node, kind);
	const observer = new MutationObserver(sync);
	observer.observe(node, { attributes: true, attributeFilter: ['data-state'] });
	if (node.dataset.state === 'open') sync();
	else hideInitialSurface(node, kind);
	return () => {
		observer.disconnect();
		gsap.killTweensOf(node);
		hideInitialSurface(node, kind);
	};
}

export function watchExpanded(node: HTMLElement) {
	const icon = node.querySelector('[data-motion-chevron]');
	if (!icon) return;
	const sync = () => rotateChevron(icon, node.getAttribute('aria-expanded') === 'true');
	const observer = new MutationObserver(sync);
	observer.observe(node, { attributes: true, attributeFilter: ['aria-expanded'] });
	sync();
	return () => {
		observer.disconnect();
		gsap.killTweensOf(icon);
	};
}

function revealPage(node: HTMLElement) {
	node.style.visibility = 'visible';
	if (node.querySelector('[data-motion-page-enter="custom"]')) return;
	const targets = pageTargets(node);
	if (!targets.length) return;
	gsap.fromTo(
		targets,
		{ autoAlpha: 0, y: 20, scale: 0.985 },
		{
			autoAlpha: 1,
			y: 0,
			scale: 1,
			duration: 0.65,
			ease: 'power3.out',
			stagger: 0.06,
			clearProps: 'opacity,visibility,transform'
		}
	);
}

function pageTargets(node: HTMLElement) {
	const explicit = [...node.querySelectorAll<HTMLElement>('[data-motion-item]')];
	const topLevel = explicit.filter(
		(target) => !target.parentElement?.closest('[data-motion-item]')
	);
	if (topLevel.length) return topLevel;
	const main = node.querySelector('main');
	const roots = main?.children.length ? [...main.children] : [...node.children];
	if (roots.length !== 1 || roots[0].children.length < 2) return roots;
	return [...roots[0].children];
}

function revealNewChildren(node: HTMLElement, options: StaggerOptions, animated: WeakSet<Element>) {
	const targets = childrenFor(node, options.selector).filter((child) => !animated.has(child));
	targets.forEach((child) => animated.add(child));
	if (!targets.length || reducedMotion()) return;
	gsap.fromTo(
		targets,
		{ autoAlpha: 0, y: options.y ?? 14, scale: 0.985 },
		{
			autoAlpha: 1,
			y: 0,
			scale: 1,
			duration: 0.5,
			delay: options.delay ?? 0.12,
			ease: 'power3.out',
			stagger: 0.055,
			force3D: true,
			clearProps: 'opacity,visibility'
		}
	);
}

function childrenFor(node: HTMLElement, selector = ':scope > *') {
	return [...node.querySelectorAll<HTMLElement>(selector)];
}

function animateSurfaceState(node: HTMLElement, kind: SurfaceMotion) {
	const open = node.dataset.state === 'open';
	if (kind === 'accordion') return animateAccordion(node, open);
	if (open) return animateSurfaceIn(node, kind);
	animateSurfaceOut(node, kind);
}

function hideInitialSurface(node: HTMLElement, kind: SurfaceMotion) {
	node.inert = true;
	if (kind === 'accordion') return hideAccordion(node);
	hideSurface(node);
}

function animateSurfaceIn(node: HTMLElement, kind: Exclude<SurfaceMotion, 'accordion'>) {
	node.hidden = false;
	node.inert = false;
	if (reducedMotion()) return void gsap.set(node, { autoAlpha: 1 });
	const overlay = kind === 'overlay';
	gsap.fromTo(
		node,
		{ autoAlpha: 0, scale: overlay ? 1 : kind === 'dialog' ? 0.94 : 0.97, y: overlay ? 0 : 8 },
		{
			autoAlpha: 1,
			scale: 1,
			y: 0,
			duration: overlay ? 0.25 : 0.4,
			ease: 'power3.out',
			overwrite: true,
			clearProps: 'opacity,visibility,transform'
		}
	);
}

function animateSurfaceOut(node: HTMLElement, kind: Exclude<SurfaceMotion, 'accordion'>) {
	node.inert = true;
	if (node.hidden) return;
	const overlay = kind === 'overlay';
	if (reducedMotion()) return hideSurface(node);
	gsap.to(node, {
		autoAlpha: 0,
		scale: overlay ? 1 : 0.97,
		y: overlay ? 0 : 4,
		duration: overlay ? 0.18 : 0.22,
		ease: 'power2.in',
		overwrite: true,
		onComplete: () => node.dataset.state === 'closed' && hideSurface(node)
	});
}

function animateAccordion(node: HTMLElement, open: boolean) {
	node.inert = !open;
	if (open) return expandAccordion(node);
	if (node.hidden) return;
	if (reducedMotion()) return hideAccordion(node);
	gsap.to(node, {
		height: 0,
		autoAlpha: 0,
		duration: 0.28,
		ease: 'power2.inOut',
		overwrite: true,
		onComplete: () => node.dataset.state === 'closed' && hideAccordion(node)
	});
}

function expandAccordion(node: HTMLElement) {
	node.hidden = false;
	if (reducedMotion()) return void gsap.set(node, { height: 'auto', autoAlpha: 1 });
	gsap.fromTo(
		node,
		{ height: 0, autoAlpha: 0 },
		{
			height: node.scrollHeight,
			autoAlpha: 1,
			duration: 0.4,
			ease: 'power3.out',
			overwrite: true,
			onComplete: () => gsap.set(node, { height: 'auto', clearProps: 'opacity,visibility' })
		}
	);
}

function hideAccordion(node: HTMLElement) {
	node.hidden = true;
	gsap.set(node, { height: 0, clearProps: 'opacity,visibility' });
}

function hideSurface(node: HTMLElement) {
	node.hidden = true;
	gsap.set(node, { clearProps: 'opacity,visibility,transform' });
}

function rotateChevron(icon: Element, expanded: boolean) {
	if (reducedMotion()) return void gsap.set(icon, { rotation: expanded ? 180 : 0 });
	gsap.to(icon, {
		rotation: expanded ? 180 : 0,
		duration: 0.32,
		ease: 'power2.out',
		overwrite: true
	});
}

function drawerGesture(node: HTMLElement, dismiss: () => void): { destroy?: () => void } {
	const handle = node.querySelector<HTMLElement>('[data-drawer-handle]');
	if (!handle || reducedMotion()) return {};
	let startY = 0;
	let distance = 0;
	const start = (event: PointerEvent) => {
		startY = event.clientY;
		distance = 0;
		handle.setPointerCapture(event.pointerId);
	};
	const move = (event: PointerEvent) => {
		if (!handle.hasPointerCapture(event.pointerId)) return;
		distance = Math.max(0, event.clientY - startY);
		gsap.set(node, { y: distance });
	};
	const end = (event: PointerEvent) => {
		if (!handle.hasPointerCapture(event.pointerId)) return;
		handle.releasePointerCapture(event.pointerId);
		if (distance > 72) {
			return void gsap.to(node, {
				y: drawerTravel(node),
				force3D: true,
				duration: 0.22,
				onComplete: dismiss
			});
		}
		gsap.to(node, { y: 0, force3D: true, duration: 0.45, ease: 'elastic.out(1, 0.55)' });
	};
	handle.addEventListener('pointerdown', start);
	handle.addEventListener('pointermove', move);
	handle.addEventListener('pointerup', end);
	handle.addEventListener('pointercancel', end);
	return {
		destroy() {
			handle.removeEventListener('pointerdown', start);
			handle.removeEventListener('pointermove', move);
			handle.removeEventListener('pointerup', end);
			handle.removeEventListener('pointercancel', end);
		}
	};
}

function pressPointer(event: PointerEvent, active: Map<number, HTMLElement>) {
	if (event.button !== 0) return;
	const target = interactiveTarget(event.target);
	if (!target) return;
	active.set(event.pointerId, target);
	pressElement(target);
}

function releasePointer(event: PointerEvent, active: Map<number, HTMLElement>) {
	const target = active.get(event.pointerId);
	if (!target) return;
	active.delete(event.pointerId);
	releaseElement(target);
}

function pressKey(event: KeyboardEvent, active: Set<HTMLElement>) {
	if (!['Enter', ' '].includes(event.key) || event.repeat) return;
	const target = interactiveTarget(event.target);
	if (!target) return;
	active.add(target);
	pressElement(target);
}

function releaseKey(event: KeyboardEvent, active: Set<HTMLElement>) {
	if (!['Enter', ' '].includes(event.key)) return;
	const target = interactiveTarget(event.target);
	if (!target || !active.delete(target)) return;
	releaseElement(target);
}

function interactiveTarget(target: EventTarget | null) {
	if (!(target instanceof Element) || target.closest('[data-motion-scale]')) return;
	const element = target.closest<HTMLElement>(PRESS_SELECTOR);
	if (!element || element.matches(':disabled, [aria-disabled="true"]')) return;
	return element;
}

function pressElement(node: HTMLElement) {
	if (reducedMotion()) return;
	const scale = Number(node.dataset.motionPressScale ?? 0.965);
	if (!node.style.getPropertyValue('--motion-press-scale')) {
		node.style.setProperty('--motion-press-scale', '1');
	}
	gsap.to(node, {
		'--motion-press-scale': scale,
		duration: 0.12,
		ease: 'power2.out',
		overwrite: 'auto'
	});
}

function releaseElement(node: HTMLElement) {
	if (reducedMotion()) return;
	gsap.to(node, {
		'--motion-press-scale': 1,
		duration: 0.5,
		ease: 'elastic.out(1, 0.45)',
		overwrite: 'auto'
	});
}

function sameColors(current: GradientColors | undefined, next: GradientColors | undefined) {
	return (
		current?.primary === next?.primary &&
		current?.secondary === next?.secondary &&
		current?.tertiary === next?.tertiary
	);
}

function drawerTravel(node: HTMLElement) {
	return Math.ceil(node.getBoundingClientRect().height);
}

function setGradient(node: HTMLElement, colors: GradientColors) {
	node.style.setProperty('--motion-primary', colors.primary);
	node.style.setProperty('--motion-secondary', colors.secondary);
	node.style.setProperty('--motion-tertiary', colors.tertiary);
}

function clearGradient(node: HTMLElement) {
	node.style.removeProperty('--motion-primary');
	node.style.removeProperty('--motion-secondary');
	node.style.removeProperty('--motion-tertiary');
}

function setProgress(progress: { value: number }, value: number, render: () => void) {
	progress.value = clampPercentage(value);
	render();
}

function setLinearProgress(node: HTMLElement, xPercent: number) {
	node.style.transform = `translate3d(${xPercent}%, 0, 0)`;
}

function clampPercentage(value: number) {
	return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

function reducedMotion() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function showImmediately(node: HTMLElement) {
	node.style.visibility = 'visible';
	return {};
}
