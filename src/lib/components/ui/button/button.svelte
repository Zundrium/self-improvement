<script lang="ts" module>
import './button.css';
import { cn } from '$lib/utils.js';
import { Pressable, type PressableProps } from '$lib/components/ui/pressable';

export type ButtonColorProfile = 'plain' | 'highlighted' | 'active' | 'text';
export type ButtonTone = 'standard' | 'destructive';
export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonFormat = 'text' | 'icon';
export type ButtonVisualProps = {
	profile: ButtonColorProfile;
	tone?: ButtonTone;
	size: ButtonSize;
	format?: ButtonFormat;
};

export type ButtonProps = PressableProps & ButtonVisualProps;

const sizes: Record<ButtonSize, string> = {
	small: 'h-11 text-sm',
	medium: 'h-12 text-sm',
	large: 'h-13 text-base'
};

const textPadding: Record<ButtonSize, string> = {
	small: 'px-5',
	medium: 'px-6',
	large: 'px-7'
};

const formats: Record<ButtonFormat, string> = {
	text: '',
	icon: 'aspect-square shrink-0 px-0'
};
</script>

<script lang="ts">
	let {
		class: className,
		profile,
		tone = 'standard',
		size,
		format = 'text',
		ref = $bindable(null),
		children,
		...restProps
	}: ButtonProps = $props();

</script>

<Pressable
	{...restProps}
	bind:ref
	data-slot="button"
	data-color-profile={profile}
	data-tone={tone}
	class={cn(
		'items-center justify-center rounded-3xl whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:shrink-0',
		sizes[size],
		formats[format],
		format === 'text' && textPadding[size],
		className
	)}
>
	{@render children?.()}
</Pressable>
