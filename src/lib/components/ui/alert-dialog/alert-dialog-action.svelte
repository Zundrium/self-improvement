<script lang="ts" module>
	import type { ButtonProps } from '$lib/components/ui/button';
	import type { AlertDialog as AlertDialogTypes } from 'bits-ui';

	export type AlertDialogActionProps = Omit<AlertDialogTypes.ActionProps, 'child'> &
	Pick<ButtonProps, 'variant' | 'size' | 'format' | 'motionColors' | 'motionScale'>;
</script>

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'default',
		size,
		format = 'text',
		motionColors,
		motionScale,
		children,
		...restProps
	}: AlertDialogActionProps = $props();
</script>

<AlertDialogPrimitive.Action bind:ref {...restProps}>
	{#snippet child({ props })}
		<Button
			{...props}
			class={className}
			{variant}
			{size}
			{format}
			{motionColors}
			{motionScale}
		>
			{@render children?.()}
		</Button>
	{/snippet}
</AlertDialogPrimitive.Action>
