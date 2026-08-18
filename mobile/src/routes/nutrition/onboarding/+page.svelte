<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Activity, Ruler, Sparkles, Weight } from '@lucide/svelte';
	import { apiRequest } from '$lib/api';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Field, FieldGroup, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';

	let formError = $state('');
	let gender = $state('');
	let activityLevel = $state('sedentary');
	const genderLabel = $derived(
		gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Choose gender'
	);
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const form = new FormData(event.currentTarget as HTMLFormElement);
		try {
			await apiRequest('/api/app/profile', {
				method: 'POST',
				body: JSON.stringify(Object.fromEntries(form))
			});
			await goto(resolve('/nutrition/log/[date]', { date: 'today' }));
		} catch (cause) {
			formError = cause instanceof Error ? cause.message : 'Could not save your profile.';
		}
	}

	const activityLabel = $derived(
		(
			{
				sedentary: 'Sedentary',
				light: 'Light activity',
				moderate: 'Moderate activity',
				active: 'Active',
				very_active: 'Very active'
			} as Record<string, string>
		)[activityLevel] ?? 'Choose activity'
	);
</script>

<svelte:head><title>Set your calorie goal · Self Improvement</title></svelte:head>

<main class="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
	<div class="mb-8 max-w-xl">
		<span class="mb-5 flex size-12 items-center justify-center rounded-3xl bg-(--text) text-(--bg)"
			><Sparkles class="size-6" /></span
		>
		<h1 class="text-3xl font-medium tracking-[-0.05em]">Set your daily baseline</h1>
		<p class="mt-2 text-(--text)/56">
			A few details help estimate your maintenance calories with the Mifflin–St Jeor formula.
		</p>
	</div>

	<Card class="p-6 sm:p-8">
		<form class="space-y-6" onsubmit={submit}>
			{#if formError}<Alert variant="destructive"
					><AlertDescription>{formError}</AlertDescription></Alert
				>{/if}
			<FieldGroup>
				<div class="grid gap-5 sm:grid-cols-2">
					<Field>
						<FieldLabel for="weightKg"><Weight class="size-4" /> Weight (kg)</FieldLabel>
						<Input
							id="weightKg"
							name="weightKg"
							type="number"
							step="0.1"
							min="20"
							max="300"
							placeholder="70"
							required
						/>
					</Field>
					<Field>
						<FieldLabel for="heightCm"><Ruler class="size-4" /> Height (cm)</FieldLabel>
						<Input
							id="heightCm"
							name="heightCm"
							type="number"
							step="0.1"
							min="100"
							max="250"
							placeholder="175"
							required
						/>
					</Field>
				</div>
				<div class="grid gap-5 sm:grid-cols-2">
					<Field
						><FieldLabel for="age">Age</FieldLabel><Input
							id="age"
							name="age"
							type="number"
							min="10"
							max="120"
							placeholder="30"
							required
						/></Field
					>
					<Field>
						<FieldLabel>Gender</FieldLabel>
						<Select type="single" name="gender" bind:value={gender}>
							<SelectTrigger class="w-full">{genderLabel}</SelectTrigger>
							<SelectContent
								><SelectItem value="male">Male</SelectItem><SelectItem value="female"
									>Female</SelectItem
								></SelectContent
							>
						</Select>
					</Field>
				</div>
				<Field>
					<FieldLabel><Activity class="size-4" /> Activity level</FieldLabel>
					<Select type="single" name="activityLevel" bind:value={activityLevel}>
						<SelectTrigger class="w-full">{activityLabel}</SelectTrigger>
						<SelectContent>
							<SelectItem value="sedentary">Sedentary · little exercise</SelectItem>
							<SelectItem value="light">Light · 1–3 days per week</SelectItem>
							<SelectItem value="moderate">Moderate · 3–5 days per week</SelectItem>
							<SelectItem value="active">Active · 6–7 days per week</SelectItem>
							<SelectItem value="very_active">Very active · physical work or training</SelectItem>
						</SelectContent>
					</Select>
				</Field>
			</FieldGroup>
			<input type="hidden" name="goalMode" value="estimated" />
			<Button type="submit" size="lg" class="w-full">Calculate my goal</Button>
		</form>
	</Card>
</main>
