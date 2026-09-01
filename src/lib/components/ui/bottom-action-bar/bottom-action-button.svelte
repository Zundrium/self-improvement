<script lang="ts" module>
	import type { ButtonProps } from '$lib/components/ui/button';

	export type BottomActionTone = 'neutral' | 'primary' | 'secondary' | 'destructive';
	export type BottomActionFormat = 'text' | 'icon';
	export type BottomActionButtonProps = Omit<
		ButtonProps,
		'profile' | 'tone' | 'size' | 'format' | 'motionColors'
	> & {
		tone?: BottomActionTone;
		format?: BottomActionFormat;
		expand?: boolean;
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button, type ButtonColorProfile } from '$lib/components/ui/button';

	let {
		tone = 'neutral',
		format = 'text',
		expand = true,
		class: className,
		children,
		...restProps
	}: BottomActionButtonProps = $props();

	const profile = $derived<ButtonColorProfile>(
		tone === 'primary' ? 'highlighted' : tone === 'secondary' ? 'active' : 'plain'
	);
</script>

<Button
	{profile}
	tone={tone === 'destructive' ? 'destructive' : 'standard'}
	size="medium"
	{format}
	class={cn(
		'bottom-action-button rounded-full',
		format === 'text' && expand ? 'min-w-0 flex-1' : 'shrink-0',
		className
	)}
	data-action-tone={tone}
	data-action-format={format}
	data-action-expand={expand}
	{...restProps}
>
	{@render children?.()}
</Button>

<style>
	:global(.bottom-action-button[data-action-format='text'][data-action-expand='true']) {
		width: 100%;
	}
</style>
