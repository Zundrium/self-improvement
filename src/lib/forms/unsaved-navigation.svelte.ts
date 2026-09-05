import { beforeNavigate } from '$app/navigation';
import { onMount } from 'svelte';

const MESSAGE = 'You have unsaved changes. Leave this page and discard them?';

export function guardUnsavedNavigation(isDirty: () => boolean) {
	beforeNavigate(({ cancel }) => {
		if (isDirty() && !globalThis.confirm(MESSAGE)) cancel();
	});

	onMount(() => {
		const warn = (event: BeforeUnloadEvent) => {
			if (!isDirty()) return;
			event.preventDefault();
			event.returnValue = '';
		};
		globalThis.addEventListener('beforeunload', warn);
		return () => globalThis.removeEventListener('beforeunload', warn);
	});
}
