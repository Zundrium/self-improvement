<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useBottomActionBarState } from './bottomActionBarState.svelte';

	type Props = {
		children: Snippet;
		contentClass?: string;
		mobileOnly?: boolean;
	};

	let { children, contentClass = 'max-w-md', mobileOnly = true }: Props = $props();
	const state = useBottomActionBarState();
	const id = Symbol('bottom-action-bar');

	$effect(() => {
		state.show({ id, children, contentClass, mobileOnly });
		return () => state.hide(id);
	});
</script>
