<script lang="ts">
	import { Form } from '$lib/components/ui/form';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { BreathingSettingsData } from '$lib/api-types';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Field, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';

	let { settings }: { settings: BreathingSettingsData } = $props();
	let rounds = $state(untrack(() => settings.rounds));
	let includeHold = $state(untrack(() => settings.includeHold));
	let saving = $state(false);

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		try {
			await apiRequest<BreathingSettingsData>('/api/app/breathing/settings', {
				method: 'PATCH',
				body: JSON.stringify({ rounds, includeHold })
			});
			toast.success('Breathing settings updated.');
			await invalidateAll();
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'Could not update breathing settings.');
		} finally {
			saving = false;
		}
	}
</script>

<Card>
	<CardHeader><CardTitle>Exercise defaults</CardTitle></CardHeader>
	<CardContent>
		<Form id="breathing-settings" class="space-y-5" onsubmit={saveSettings}>
			<Field class="flex-row items-center justify-between gap-4">
				<FieldLabel for="breathing-rounds">Rounds</FieldLabel>
				<Input
					id="breathing-rounds"
					class="w-20 text-center tabular-nums"
					type="number"
					min={1}
					max={20}
					bind:value={rounds}
					required
				/>
			</Field>
			<Field class="flex-row items-center justify-between gap-4">
				<FieldLabel for="include-breath-hold">Include a breath hold</FieldLabel>
				<Checkbox id="include-breath-hold" bind:checked={includeHold} />
			</Field>
		</Form>
	</CardContent>
</Card>

<SettingsSaveBar form="breathing-settings" {saving} backHref="/breathing" />
