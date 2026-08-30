<script lang="ts">
	import { Form } from '$lib/components/ui/form';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { PeriodSettingsData } from '$lib/api-types';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Field, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { flowLabel, flowOptions, type MenstruationFlow } from '../period';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let defaultFlow = $state<MenstruationFlow>(untrack(() => data.defaultFlow));
	let fallbackCycleDays = $state(untrack(() => data.fallbackCycleDays));
	let saving = $state(false);

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		try {
			await apiRequest<PeriodSettingsData>('/api/app/period/settings', {
				method: 'PATCH',
				body: JSON.stringify({ defaultFlow, fallbackCycleDays })
			});
			toast.success('Period settings updated.');
			await invalidateAll();
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'Could not update period settings.');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>Period settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-5">
	<Card>
		<CardHeader><CardTitle>Cycle defaults</CardTitle></CardHeader>
		<CardContent>
			<Form id="period-settings" class="space-y-5" onsubmit={saveSettings}>
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel>Default flow</FieldLabel>
					<Select type="single" bind:value={defaultFlow}>
						<SelectTrigger>{flowLabel(defaultFlow)}</SelectTrigger>
						<SelectContent>
							{#each flowOptions as option (option.value)}
								<SelectItem value={option.value}>{option.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</Field>
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel for="fallback-cycle-days">Cycle length in days</FieldLabel>
					<Input
						id="fallback-cycle-days"
						class="w-20 text-center tabular-nums"
						type="number"
						min={15}
						max={60}
						bind:value={fallbackCycleDays}
						required
					/>
				</Field>
			</Form>
		</CardContent>
	</Card>
</TrackerPage>

<SettingsSaveBar form="period-settings" {saving} backHref="/period" />
