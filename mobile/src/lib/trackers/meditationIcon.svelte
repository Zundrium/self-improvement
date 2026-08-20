<script lang="ts">
	import Icon from '@iconify/svelte';

	let { class: className, color }: { class?: string; color?: string } = $props();
</script>

<Icon
	icon="iconoir:yoga"
	class={className}
	style={color ? `color: ${color}` : undefined}
	aria-hidden="true"
/>
