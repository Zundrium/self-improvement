<script lang="ts">
	import { Form } from '$lib/components/ui/form';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { ScreenTimeSettingsData } from '$lib/api-types';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Field, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';

	let { settings }: { settings: ScreenTimeSettingsData } = $props();
	let dailyLimitMinutes = $state(untrack(() => settings.dailyLimitMinutes));
	let saving = $state(false);

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		try {
			await apiRequest<ScreenTimeSettingsData>('/api/app/screen-time/settings', {
				method: 'PATCH',
				body: JSON.stringify({ dailyLimitMinutes })
			});
			toast.success('Screen time settings updated.');
			await invalidateAll();
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'Could not update screen time settings.');
		} finally {
			saving = false;
		}
	}
</script>

<Card>
	<CardHeader><CardTitle>Daily limit</CardTitle></CardHeader>
	<CardContent>
		<Form id="screen-time-settings" class="space-y-0" onsubmit={saveSettings}>
			<Field class="flex-row items-center justify-between gap-4">
				<FieldLabel for="daily-limit">Minutes per day</FieldLabel>
				<Input
					id="daily-limit"
					class="w-24 text-right tabular-nums"
					type="number"
					min={1}
					max={1440}
					bind:value={dailyLimitMinutes}
					required
				/>
			</Field>
		</Form>
	</CardContent>
</Card>

<SettingsSaveBar form="screen-time-settings" {saving} backHref="/screen-time" />
