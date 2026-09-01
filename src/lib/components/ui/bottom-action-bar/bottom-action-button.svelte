<script lang="ts" module>
	import type { ButtonProps } from '$lib/components/ui/button';

	export type BottomActionTone = 'neutral' | 'primary' | 'secondary' | 'destructive';
	export type BottomActionFormat = 'text' | 'icon';
	export type BottomActionButtonProps = Omit<
		ButtonProps,
		'variant' | 'size' | 'format' | 'motionColors'
	> & {
		tone?: BottomActionTone;
		format?: BottomActionFormat;
		expand?: boolean;
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';

	let {
		tone = 'neutral',
		format = 'text',
		expand = true,
		class: className,
		children,
		...restProps
	}: BottomActionButtonProps = $props();
</script>

<Button
	variant={tone === 'destructive' ? 'destructive' : 'ghost'}
	size="medium"
	{format}
	class={cn(
		'bottom-action-button',
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
	:global(.bottom-action-button) {
		border-radius: 9999px;
		transition:
			background-color 150ms ease,
			color 150ms ease,
			filter 150ms ease;
	}

	:global(.bottom-action-button[data-action-format='text'][data-action-expand='true']) {
		width: 100%;
	}

	:global(.bottom-action-button[data-action-tone='neutral']) {
		background: color-mix(in srgb, var(--text) 6%, transparent);
		color: color-mix(in srgb, var(--text) 72%, transparent);
	}

	:global(.bottom-action-button[data-action-tone='neutral']:hover) {
		background: color-mix(in srgb, var(--text) 10%, transparent);
		color: var(--text);
	}

	:global(.bottom-action-button[data-action-tone='primary']),
	:global(.bottom-action-button[data-action-tone='secondary']) {
		background: linear-gradient(
			135deg,
			var(--bottom-action-primary, var(--text)) 0%,
			var(--bottom-action-secondary, var(--text)) 52%,
			var(--bottom-action-tertiary, var(--text)) 100%
		);
		color: #ffffff;
	}

	:global(.bottom-action-button[data-action-tone='primary']:hover),
	:global(.bottom-action-button[data-action-tone='secondary']:hover) {
		filter: brightness(1.08);
	}

	:global(.bottom-action-button[data-action-tone='destructive']) {
		background: color-mix(in srgb, #ef4444 10%, transparent);
		color: #dc2626;
	}

	:global(.bottom-action-button[data-action-tone='destructive']:hover) {
		background: color-mix(in srgb, #ef4444 18%, transparent);
	}

	:global(.dark .bottom-action-button[data-action-tone='destructive']) {
		color: #f87171;
	}
</style>
