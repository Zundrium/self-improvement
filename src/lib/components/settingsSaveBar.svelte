<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { BottomActionBar, BottomActionButton, BottomActionGroup } from './ui/bottom-action-bar';

	type Props = {
		form: string;
		saving: boolean;
		dirty?: boolean;
		disabled?: boolean;
		backHref?: string;
		contentClass?: string;
	};

	let {
		form,
		saving,
		dirty = true,
		disabled = false,
		backHref,
		contentClass = 'max-w-(--app-compact-max-width)'
	}: Props = $props();
</script>

<BottomActionBar {contentClass} mobileOnly={false}>
	<BottomActionGroup>
		{#if backHref}
			<BottomActionButton href={backHref} format="icon" aria-label="Back">
				<ArrowLeft class="size-5" />
			</BottomActionButton>
		{/if}
		<BottomActionButton
			{form}
			type="submit"
			tone={dirty ? 'primary' : 'neutral'}
			class={dirty && !backHref ? 'settings-save-action' : undefined}
			disabled={!dirty || saving || disabled}
		>
			{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
		</BottomActionButton>
	</BottomActionGroup>
</BottomActionBar>

<style>
	:global(.bottom-action-button.settings-save-action) {
		background: var(--text);
		color: var(--bg);
	}
</style>
