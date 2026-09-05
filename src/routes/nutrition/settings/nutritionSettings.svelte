<script lang="ts">
import { Form } from '$lib/components/ui/form';
import { APP_RESOURCES, refreshAppData } from '$lib/app/resources';
import { untrack } from 'svelte';
import { toast } from '$lib/components/ui/toast';
import { localOperation } from '$lib/api';
import type { NutritionProfile } from '$lib/api-types';
import SettingsSaveBar from '$lib/components/forms/SettingsSaveBar.svelte';
import { Button } from '$lib/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Field, FieldLabel } from '$lib/components/ui/field';
import { Input } from '$lib/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import { sameDraft, submittedSnapshot } from '$lib/forms/draft';
import { guardUnsavedNavigation } from '$lib/forms/unsaved-navigation.svelte';

type Props = { profile: NutritionProfile | null; estimatedTdee: number | null };
let { profile, estimatedTdee }: Props = $props();
let gender = $state(untrack(() => profile?.gender ?? 'male'));
let activityLevel = $state(untrack(() => profile?.activityLevel ?? 'sedentary'));
let goalMode = $state(untrack(() => profile?.goalMode ?? 'estimated'));
let eatingWindowEnabled = $state(untrack(() => profile?.eatingWindowEnabled ?? false));
let eatingWindowStart = $state(untrack(() => profile?.eatingWindowStart ?? '12:00'));
let eatingWindowEnd = $state(untrack(() => profile?.eatingWindowEnd ?? '20:00'));
let weightKg = $state(untrack(() => profile?.weightKg ?? 70));
let heightCm = $state(untrack(() => profile?.heightCm ?? 170));
let age = $state(untrack(() => profile?.age ?? 30));
let customGoal = $state(untrack(() => profile?.dailyCalorieGoal ?? 2000));
let saving = $state(false);
let saved = $state(untrack(() => currentSettings()));
const current = $derived(currentSettings());
const dirty = $derived(!sameDraft(current, saved));
guardUnsavedNavigation(() => dirty && !saving);
const activityLabel = $derived(
	(
		{
			sedentary: 'Sedentary',
			light: 'Light activity',
			moderate: 'Moderate activity',
			active: 'Active',
			very_active: 'Very active'
		} as Record<string, string>
	)[activityLevel]
);

async function saveNutrition(event: SubmitEvent) {
	event.preventDefault();
	saving = true;
	const submitted = submittedSnapshot(current);
	try {
		await localOperation('saveNutritionProfile', { mode: 'update', profile: submitted });
		saved = submitted;
		toast.success('Nutrition settings updated.');
		await refreshAppData(APP_RESOURCES.bootstrap).catch(() =>
			toast.error('Saved, but could not refresh the page.')
		);
	} catch (cause) {
		toast.error(cause instanceof Error ? cause.message : 'Could not update nutrition settings.');
	} finally {
		saving = false;
	}
}

function currentSettings() {
	return {
		weightKg: Number(weightKg),
		heightCm: Number(heightCm),
		age: Number(age),
		gender,
		activityLevel,
		goalMode,
		customGoal: Number(customGoal),
		eatingWindowEnabled,
		eatingWindowStart,
		eatingWindowEnd
	};
}
</script>

{#if profile}
	<Form id="nutrition-settings" class="space-y-5" onsubmit={saveNutrition}>
		<Card>
			<CardHeader><CardTitle>Body profile</CardTitle></CardHeader>
			<CardContent class="gap-5">
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel for="weightKg">Weight in kg</FieldLabel>
					<Input
						id="weightKg"
						name="weightKg"
						class="w-24 text-right tabular-nums"
						type="number"
						step="0.1"
						min="20"
						max="300"
						bind:value={weightKg}
						required
					/>
				</Field>
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel for="heightCm">Height in cm</FieldLabel>
					<Input
						id="heightCm"
						name="heightCm"
						class="w-24 text-right tabular-nums"
						type="number"
						step="0.1"
						min="100"
						max="250"
						bind:value={heightCm}
						required
					/>
				</Field>
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel for="age">Age</FieldLabel>
					<Input
						id="age"
						name="age"
						class="w-20 text-center tabular-nums"
						type="number"
						min="10"
						max="120"
						bind:value={age}
						required
					/>
				</Field>
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel for="nutrition-gender">Gender</FieldLabel>
					<Select type="single" name="gender" bind:value={gender}>
						<SelectTrigger id="nutrition-gender">{gender === 'male' ? 'Male' : 'Female'}</SelectTrigger>
						<SelectContent>
							<SelectItem value="male">Male</SelectItem>
							<SelectItem value="female">Female</SelectItem>
						</SelectContent>
					</Select>
				</Field>
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel for="nutrition-activity">Activity level</FieldLabel>
					<Select type="single" name="activityLevel" bind:value={activityLevel}>
						<SelectTrigger id="nutrition-activity">{activityLabel}</SelectTrigger>
						<SelectContent>
							<SelectItem value="sedentary">Sedentary</SelectItem>
							<SelectItem value="light">Light activity</SelectItem>
							<SelectItem value="moderate">Moderate activity</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="very_active">Very active</SelectItem>
						</SelectContent>
					</Select>
				</Field>
			</CardContent>
		</Card>

		<Card>
			<CardHeader><CardTitle>Calorie goal</CardTitle></CardHeader>
			<CardContent class="gap-5">
				<div class="flex items-center justify-between gap-4 text-sm">
					<span class="font-medium">Estimated maintenance</span>
					<span class="tabular-nums">{estimatedTdee} kcal/day</span>
				</div>
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel for="nutrition-goal-mode">Goal calculation</FieldLabel>
					<Select type="single" name="goalMode" bind:value={goalMode}>
						<SelectTrigger id="nutrition-goal-mode">
							{goalMode === 'custom' ? 'Manual goal' : 'Use estimate'}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="estimated">Use TDEE estimate</SelectItem>
							<SelectItem value="custom">Set a manual calorie goal</SelectItem>
						</SelectContent>
					</Select>
				</Field>
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel for="customGoal">Daily calories</FieldLabel>
					<Input
						id="customGoal"
						name="customGoal"
						class="w-28 text-right tabular-nums"
						type="number"
						min="500"
						max="10000"
						bind:value={customGoal}
						disabled={goalMode !== 'custom'}
						required={goalMode === 'custom'}
					/>
				</Field>
			</CardContent>
		</Card>

		<Card>
			<CardHeader><CardTitle>Eating window</CardTitle></CardHeader>
			<CardContent class="gap-5">
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel for="eatingWindowEnabled">Enabled</FieldLabel>
					<Checkbox id="eatingWindowEnabled" bind:checked={eatingWindowEnabled} />
				</Field>
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel for="eatingWindowStart">Starts</FieldLabel>
					<Input
						id="eatingWindowStart"
						class="w-32 tabular-nums"
						type="time"
						bind:value={eatingWindowStart}
						disabled={!eatingWindowEnabled}
						required={eatingWindowEnabled}
					/>
				</Field>
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel for="eatingWindowEnd">Ends</FieldLabel>
					<Input
						id="eatingWindowEnd"
						class="w-32 tabular-nums"
						type="time"
						bind:value={eatingWindowEnd}
						disabled={!eatingWindowEnabled}
						required={eatingWindowEnabled}
					/>
				</Field>
			</CardContent>
		</Card>
	</Form>
	<PageActionBar mobileOnly={false} contentClass="max-w-3xl">
		<SettingsSaveBar form="nutrition-settings" {saving} {dirty} backHref="/nutrition/log/today" />
	</PageActionBar>
{:else}
	<Card>
		<CardHeader><CardTitle>Nutrition goals</CardTitle></CardHeader>
		<CardContent>
			<Button profile="highlighted" size="medium" href="/nutrition/onboarding">Set up nutrition</Button>
		</CardContent>
	</Card>
{/if}
