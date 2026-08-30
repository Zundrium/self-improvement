<script lang="ts">
	import BottomActionBar from './bottomActionBar.svelte';
	import { Button } from './ui/button';

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
	<Button
		{form}
		type="submit"
		size="lg"
		variant={dirty ? 'default' : 'ghost'}
		class="w-full"
		disabled={!dirty || saving || disabled}
	>
		{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
	</Button>
</BottomActionBar>
