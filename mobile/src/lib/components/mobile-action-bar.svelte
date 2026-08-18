<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div
	class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-(--text)/8 bg-(--bg)/90 px-4 pt-3 pb-4 backdrop-blur-xl sm:hidden"
>
	<div class="mx-auto w-full max-w-md">
		{@render children()}
	</div>
</div>
