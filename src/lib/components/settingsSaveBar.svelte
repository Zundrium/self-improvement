<script lang="ts">
	import { BottomActionBar, BottomActionButton, BottomActionGroup } from './ui/bottom-action-bar';

	type Props = {
		form: string;
		saving: boolean;
		dirty?: boolean;
		disabled?: boolean;
		contentClass?: string;
	};

	let {
		form,
		saving,
		dirty = true,
		disabled = false,
		contentClass = 'max-w-(--app-compact-max-width)'
	}: Props = $props();
</script>

<BottomActionBar {contentClass} mobileOnly={false}>
	<BottomActionGroup>
		<BottomActionButton
			{form}
			type="submit"
			tone={dirty ? 'primary' : 'neutral'}
			disabled={!dirty || saving || disabled}
		>
			{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
		</BottomActionButton>
	</BottomActionGroup>
</BottomActionBar>
