<script lang="ts" module>
	import type { ButtonProps } from '$lib/components/ui/button';
	import type { AlertDialog as AlertDialogTypes } from 'bits-ui';

	export type AlertDialogActionProps = Omit<AlertDialogTypes.ActionProps, 'child'> &
		Partial<Pick<ButtonProps, 'profile' | 'tone' | 'format' | 'motionColors' | 'motionScale'>> &
		Pick<ButtonProps, 'size'>;
</script>

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		profile = 'highlighted',
		tone = 'standard',
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
			{profile}
			{tone}
			{size}
			{format}
			{motionColors}
			{motionScale}
		>
			{@render children?.()}
		</Button>
	{/snippet}
</AlertDialogPrimitive.Action>
