export function prefersReducedMotion() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function watchReducedMotion(finish: () => void) {
	const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
	const changed = () => {
		if (preference.matches) finish();
	};
	preference.addEventListener('change', changed);
	return () => preference.removeEventListener('change', changed);
}
