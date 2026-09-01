<script lang="ts">
	import { Form } from '$lib/components/ui/form';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { NutritionProfile } from '$lib/api-types';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Field, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';

	type Props = { profile: NutritionProfile | null; estimatedTdee: number | null };
	let { profile, estimatedTdee }: Props = $props();
	let gender = $state(untrack(() => profile?.gender ?? 'male'));
	let activityLevel = $state(untrack(() => profile?.activityLevel ?? 'sedentary'));
	let goalMode = $state(untrack(() => profile?.goalMode ?? 'estimated'));
	let eatingWindowEnabled = $state(untrack(() => profile?.eatingWindowEnabled ?? false));
	let eatingWindowStart = $state(untrack(() => profile?.eatingWindowStart ?? '12:00'));
	let eatingWindowEnd = $state(untrack(() => profile?.eatingWindowEnd ?? '20:00'));
	let saving = $state(false);
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
		const fields = Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement));
		const form = { ...fields, eatingWindowEnabled, eatingWindowStart, eatingWindowEnd };
		try {
			await apiRequest('/api/app/profile', { method: 'PATCH', body: JSON.stringify(form) });
			toast.success('Nutrition settings updated.');
			await invalidateAll();
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'Could not update nutrition settings.');
		} finally {
			saving = false;
		}
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
						value={profile.weightKg}
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
						value={profile.heightCm}
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
						value={profile.age}
						required
					/>
				</Field>
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel>Gender</FieldLabel>
					<Select type="single" name="gender" bind:value={gender}>
						<SelectTrigger>{gender === 'male' ? 'Male' : 'Female'}</SelectTrigger>
						<SelectContent>
							<SelectItem value="male">Male</SelectItem>
							<SelectItem value="female">Female</SelectItem>
						</SelectContent>
					</Select>
				</Field>
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel>Activity level</FieldLabel>
					<Select type="single" name="activityLevel" bind:value={activityLevel}>
						<SelectTrigger>{activityLabel}</SelectTrigger>
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
					<FieldLabel>Goal calculation</FieldLabel>
					<Select type="single" name="goalMode" bind:value={goalMode}>
						<SelectTrigger>
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
						value={profile.dailyCalorieGoal}
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
	<SettingsSaveBar
		form="nutrition-settings"
		{saving}
		backHref="/nutrition/log/today"
		contentClass="max-w-3xl"
	/>
{:else}
	<Card>
		<CardHeader><CardTitle>Nutrition goals</CardTitle></CardHeader>
		<CardContent>
			<Button profile="highlighted" size="medium" href="/nutrition/onboarding">Set up nutrition</Button>
		</CardContent>
	</Card>
{/if}
