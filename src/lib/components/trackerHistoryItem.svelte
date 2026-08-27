<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	let { href, label, value }: { href: string; label: string; value: string } = $props();
</script>

<Button
	{href}
	variant="ghost"
	class="h-auto w-full justify-between gap-4 bg-transparent px-0 py-2.5 text-left hover:bg-transparent"
>
	<span class="font-medium">{label}</span>
	<span class="flex min-w-0 items-center gap-2">
		<span class="truncate text-sm text-(--text)/56">{value}</span>
		<ChevronRight class="size-4 shrink-0 text-(--text)/32" />
	</span>
</Button>
