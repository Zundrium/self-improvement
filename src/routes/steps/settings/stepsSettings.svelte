<script lang="ts">
	import { Form } from '$lib/components/ui/form';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { StepsSettingsData } from '$lib/api-types';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Field, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';

	let { settings }: { settings: StepsSettingsData } = $props();
	let dailyGoal = $state(untrack(() => settings.dailyGoal));
	let saving = $state(false);

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		try {
			await apiRequest<StepsSettingsData>('/api/app/steps/settings', {
				method: 'PATCH',
				body: JSON.stringify({ dailyGoal })
			});
			toast.success('Steps settings updated.');
			await invalidateAll();
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'Could not update steps settings.');
		} finally {
			saving = false;
		}
	}
</script>

<Card>
	<CardHeader><CardTitle>Daily goal</CardTitle></CardHeader>
	<CardContent>
		<Form id="steps-settings" class="space-y-0" onsubmit={saveSettings}>
			<Field class="flex-row items-center justify-between gap-4">
				<FieldLabel for="daily-goal">Steps per day</FieldLabel>
				<Input
					id="daily-goal"
					class="w-28 text-right tabular-nums"
					type="number"
					min={1000}
					max={100000}
					bind:value={dailyGoal}
					required
				/>
			</Field>
		</Form>
	</CardContent>
</Card>

<SettingsSaveBar form="steps-settings" {saving} backHref="/steps" />
