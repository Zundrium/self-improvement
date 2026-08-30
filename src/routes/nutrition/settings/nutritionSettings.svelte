<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { NutritionProfile } from '$lib/api-types';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Field, FieldDescription, FieldGroup, FieldLabel } from '$lib/components/ui/field';
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
	<form class="space-y-5" onsubmit={saveNutrition}>
				<p class="text-sm text-(--text)/64">
					Your estimated maintenance is {estimatedTdee} kcal per day.
				</p>
				<FieldGroup>
					<div class="grid gap-4 sm:grid-cols-3">
						<Field>
							<FieldLabel for="weightKg">Weight (kg)</FieldLabel>
							<Input
								id="weightKg"
								name="weightKg"
								type="number"
								step="0.1"
								min="20"
								max="300"
								value={profile.weightKg}
								required
							/>
						</Field>
						<Field>
							<FieldLabel for="heightCm">Height (cm)</FieldLabel>
							<Input
								id="heightCm"
								name="heightCm"
								type="number"
								step="0.1"
								min="100"
								max="250"
								value={profile.heightCm}
								required
							/>
						</Field>
						<Field>
							<FieldLabel for="age">Age</FieldLabel>
							<Input
								id="age"
								name="age"
								type="number"
								min="10"
								max="120"
								value={profile.age}
								required
							/>
						</Field>
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel>Gender</FieldLabel>
							<Select type="single" name="gender" bind:value={gender}>
								<SelectTrigger class="w-full">{gender === 'male' ? 'Male' : 'Female'}</SelectTrigger
								>
								<SelectContent>
									<SelectItem value="male">Male</SelectItem>
									<SelectItem value="female">Female</SelectItem>
								</SelectContent>
							</Select>
						</Field>
						<Field>
							<FieldLabel>Activity level</FieldLabel>
							<Select type="single" name="activityLevel" bind:value={activityLevel}>
								<SelectTrigger class="w-full">{activityLabel}</SelectTrigger>
								<SelectContent>
									<SelectItem value="sedentary">Sedentary</SelectItem>
									<SelectItem value="light">Light activity</SelectItem>
									<SelectItem value="moderate">Moderate activity</SelectItem>
									<SelectItem value="active">Active</SelectItem>
									<SelectItem value="very_active">Very active</SelectItem>
								</SelectContent>
							</Select>
						</Field>
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel>Goal calculation</FieldLabel>
							<Select type="single" name="goalMode" bind:value={goalMode}>
								<SelectTrigger class="w-full">
									{goalMode === 'custom' ? 'Manual goal' : 'Use estimate'}
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="estimated">Use TDEE estimate</SelectItem>
									<SelectItem value="custom">Set a manual calorie goal</SelectItem>
								</SelectContent>
							</Select>
						</Field>
						<Field>
							<FieldLabel for="customGoal">Manual daily goal (kcal)</FieldLabel>
							<Input
								id="customGoal"
								name="customGoal"
								type="number"
								min="500"
								max="10000"
								value={profile.dailyCalorieGoal}
								disabled={goalMode !== 'custom'}
								required={goalMode === 'custom'}
							/>
							<FieldDescription>Overrides the estimated daily goal.</FieldDescription>
						</Field>
					</div>
					<div class="space-y-4 pt-2">
						<div class="flex items-start gap-3">
							<Checkbox id="eatingWindowEnabled" bind:checked={eatingWindowEnabled} />
							<label class="min-w-0 flex-1 cursor-pointer" for="eatingWindowEnabled">
								<span class="block text-sm font-medium">Daily eating window</span>
								<span class="mt-0.5 block text-sm leading-5 text-(--text)/56">
									Show a daily action for when eating time starts and ends.
								</span>
							</label>
						</div>
						<div class="grid gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel for="eatingWindowStart">Starts</FieldLabel>
								<Input
									id="eatingWindowStart"
									type="time"
									bind:value={eatingWindowStart}
									disabled={!eatingWindowEnabled}
									required={eatingWindowEnabled}
								/>
							</Field>
							<Field>
								<FieldLabel for="eatingWindowEnd">Ends</FieldLabel>
								<Input
									id="eatingWindowEnd"
									type="time"
									bind:value={eatingWindowEnd}
									disabled={!eatingWindowEnabled}
									required={eatingWindowEnabled}
								/>
							</Field>
						</div>
						<FieldDescription>This reminder never blocks meal logging.</FieldDescription>
					</div>
				</FieldGroup>
				<Button type="submit" disabled={saving}>
					{saving ? 'Saving…' : 'Save settings'}
				</Button>
	</form>
{:else}
	<div class="space-y-4">
				<p class="text-sm leading-6 text-(--text)/64">
					Set a daily calorie goal before tracking meals.
				</p>
				<Button href="/nutrition/onboarding">Set up nutrition</Button>
	</div>
{/if}
