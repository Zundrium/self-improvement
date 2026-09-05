<script lang="ts">
import { ArrowLeft } from '@lucide/svelte';
import { BottomActionButton, BottomActionGroup } from '$lib/components/ui/bottom-action-bar/index';

type Props = {
	form: string;
	saving: boolean;
	dirty?: boolean;
	disabled?: boolean;
	backHref?: string;
};

let { form, saving, dirty = true, disabled = false, backHref }: Props = $props();
</script>

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
			disabled={!dirty || saving || disabled}
		>
			{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
		</BottomActionButton>
	</BottomActionGroup>
