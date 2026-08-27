<script lang="ts">
	import { PersonStanding } from '@lucide/svelte';

	let { class: className, color }: { class?: string; color?: string } = $props();
</script>

<PersonStanding
	class={className}
	style={color ? `color: ${color}` : undefined}
	aria-hidden="true"
/>
