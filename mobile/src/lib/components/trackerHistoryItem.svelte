<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';

	let { href, label, value }: { href: string; label: string; value: string } = $props();
</script>

<Button
	{href}
	variant="ghost"
	class="h-auto w-full justify-between rounded-none bg-transparent px-0 py-3 hover:bg-transparent"
>
	<span>{label}</span>
	<Badge>{value}</Badge>
</Button>
