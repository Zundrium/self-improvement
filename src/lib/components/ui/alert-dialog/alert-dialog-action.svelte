<script lang="ts" module>
import type {
	ButtonFormat,
	ButtonSize,
	ButtonTone,
	ButtonColorProfile
} from '$lib/components/ui/button';
import type { GradientColors, InteractionScaleOptions } from '$lib/motion/gsap';
import type { AlertDialog as AlertDialogTypes } from 'bits-ui';

export type AlertDialogActionProps = Omit<AlertDialogTypes.ActionProps, 'child'> & {
	profile?: ButtonColorProfile;
	tone?: ButtonTone;
	format?: ButtonFormat;
	size: ButtonSize;
	motionColors?: GradientColors;
	motionScale?: InteractionScaleOptions;
};
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
