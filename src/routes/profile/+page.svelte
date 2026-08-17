<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Activity } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { authClient } from '$lib/auth-client';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Avatar } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Field, FieldGroup, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Spinner } from '$lib/components/ui/spinner';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const initialNutritionProfile = untrack(() => data.nutritionProfile);
	let name = $state('');
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmation = $state('');
	let profileMessage = $state('');
	let passwordMessage = $state('');
	let profileFailed = $state(false);
	let passwordFailed = $state(false);
	let savingProfile = $state(false);
	let savingPassword = $state(false);
	let gender = $state(initialNutritionProfile?.gender ?? 'male');
	let activityLevel = $state(initialNutritionProfile?.activityLevel ?? 'sedentary');
	let goalMode = $state(initialNutritionProfile?.goalMode ?? 'estimated');

	const activityLabel = $derived(
		(
			{
				sedentary: 'Sedentary',
				light: 'Light activity',
				moderate: 'Moderate activity',
				active: 'Active',
				very_active: 'Very active'
			} as Record<string, string>
		)[activityLevel] ?? 'Activity level'
	);

	$effect.pre(() => {
		if (!name) name = data.profileUser.name;
	});

	async function updateProfile(event: SubmitEvent) {
		event.preventDefault();
		savingProfile = true;
		const result = await authClient.updateUser({ name: name.trim() });
		savingProfile = false;
		profileFailed = Boolean(result.error);
		profileMessage = result.error?.message ?? 'Profile updated.';
		if (!result.error) await invalidateAll();
	}

	async function changePassword(event: SubmitEvent) {
		event.preventDefault();
		if (newPassword !== confirmation) return passwordError('Passwords do not match.');
		savingPassword = true;
		const result = await authClient.changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: true
		});
		savingPassword = false;
		passwordFailed = Boolean(result.error);
		passwordMessage = result.error?.message ?? 'Password changed.';
	}

	function passwordError(message: string) {
		passwordFailed = true;
		passwordMessage = message;
	}

	async function signOut() {
		await authClient.signOut();
		await goto(resolve('/sign-in'));
	}
</script>

<svelte:head><title>Profile · Self Improvement</title></svelte:head>

<main
	class="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-4xl gap-4 p-4 md:grid-cols-[280px_1fr] md:p-8"
>
	<Card>
		<CardContent class="items-center text-center">
			<Avatar size="xl" src={data.profileUser.image ?? undefined} alt={data.profileUser.name} />
			<div>
				<h1 class="text-xl font-semibold">{data.profileUser.name}</h1>
				<p class="text-sm text-(--text)/64">{data.profileUser.email}</p>
			</div>
			<Badge>{data.profileUser.role ?? 'user'}</Badge>
			<div class="flex flex-wrap justify-center gap-2">
				<Button href="/" variant="ghost">Home</Button>
				{#if data.profileUser.role === 'admin'}
					<Button href="/admin" variant="ghost">Users</Button>
				{/if}
				<Button type="button" variant="ghost" onclick={signOut}>Sign out</Button>
			</div>
		</CardContent>
	</Card>

	<div class="space-y-4">
		<Card>
			<CardHeader><CardTitle>Profile</CardTitle></CardHeader>
			<CardContent>
				<form class="space-y-5" onsubmit={updateProfile}>
					{#if profileMessage}
						<Alert variant={profileFailed ? 'destructive' : 'default'}>
							<AlertDescription>{profileMessage}</AlertDescription>
						</Alert>
					{/if}
					<Field>
						<FieldLabel for="name">Name</FieldLabel>
						<Input id="name" bind:value={name} minlength={2} required />
					</Field>
					<Button type="submit" disabled={savingProfile}>
						{#if savingProfile}<Spinner class="size-4" />{/if} Save profile
					</Button>
				</form>
			</CardContent>
		</Card>

		<Card>
			<CardHeader><CardTitle>Trackers</CardTitle></CardHeader>
			<CardContent>
				<form
					class="space-y-5"
					method="POST"
					action="?/trackers"
					use:enhance={() =>
						async ({ update }) =>
							update({ invalidateAll: true })}
				>
					<p class="text-sm leading-6 text-(--text)/64">
						Choose which trackers appear on your home screen and navigation.
					</p>
					{#if form?.form === 'trackers' && form.message}
						<Alert><AlertDescription>{form.message}</AlertDescription></Alert>
					{/if}
					<div class="divide-y divide-(--text)/8">
						{#each data.trackerPreferences as tracker (tracker.id)}
							<div class="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
								<Checkbox
									id="tracker-{tracker.id}"
									name="trackers"
									value={tracker.id}
									checked={tracker.enabled}
								/>
								<label class="min-w-0 flex-1 cursor-pointer" for="tracker-{tracker.id}">
									<span class="block text-sm font-medium">{tracker.label}</span>
									<span class="mt-0.5 block text-sm leading-5 text-(--text)/56">
										{tracker.description}
									</span>
								</label>
							</div>
						{/each}
					</div>
					<Button type="submit">Save trackers</Button>
				</form>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2"><Activity class="size-5" /> Nutrition</CardTitle>
			</CardHeader>
			<CardContent>
				{#if data.nutritionProfile}
					<form
						class="space-y-5"
						method="POST"
						action="?/nutrition"
						use:enhance={() =>
							async ({ update }) =>
								update({ invalidateAll: true })}
					>
						<p class="text-sm text-(--text)/64">
							Your estimated maintenance is {data.estimatedTdee} kcal per day.
						</p>
						{#if form?.form === 'nutrition' && form.error}
							<Alert variant="destructive"><AlertDescription>{form.error}</AlertDescription></Alert>
						{/if}
						{#if form?.form === 'nutrition' && form.message}
							<Alert><AlertDescription>{form.message}</AlertDescription></Alert>
						{/if}
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
										value={data.nutritionProfile.weightKg}
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
										value={data.nutritionProfile.heightCm}
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
										value={data.nutritionProfile.age}
										required
									/>
								</Field>
							</div>
							<div class="grid gap-4 sm:grid-cols-2">
								<Field>
									<FieldLabel>Gender</FieldLabel>
									<Select type="single" name="gender" bind:value={gender}>
										<SelectTrigger class="w-full">
											{gender === 'male' ? 'Male' : 'Female'}
										</SelectTrigger>
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
											{goalMode === 'custom' ? 'Custom goal' : 'Use estimate'}
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="estimated">Use TDEE estimate</SelectItem>
											<SelectItem value="custom">Custom calorie goal</SelectItem>
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel for="customGoal">Daily goal (kcal)</FieldLabel>
									<Input
										id="customGoal"
										name="customGoal"
										type="number"
										min="500"
										max="10000"
										value={data.nutritionProfile.dailyCalorieGoal}
										disabled={goalMode !== 'custom'}
										required={goalMode === 'custom'}
									/>
								</Field>
							</div>
						</FieldGroup>
						<Button type="submit">Save nutrition profile</Button>
					</form>
				{:else}
					<div class="space-y-4">
						<p class="text-sm leading-6 text-(--text)/64">
							Set a daily calorie goal before tracking meals.
						</p>
						<Button href="/nutrition/onboarding">Set up nutrition</Button>
					</div>
				{/if}
			</CardContent>
		</Card>

		<Card>
			<CardHeader><CardTitle>Change password</CardTitle></CardHeader>
			<CardContent>
				<form class="space-y-5" onsubmit={changePassword}>
					{#if passwordMessage}
						<Alert variant={passwordFailed ? 'destructive' : 'default'}>
							<AlertDescription>{passwordMessage}</AlertDescription>
						</Alert>
					{/if}
					<FieldGroup>
						<Field>
							<FieldLabel for="current-password">Current password</FieldLabel>
							<Input
								id="current-password"
								type="password"
								bind:value={currentPassword}
								autocomplete="current-password"
								minlength={8}
								required
							/>
						</Field>
						<Field>
							<FieldLabel for="new-password">New password</FieldLabel>
							<Input
								id="new-password"
								type="password"
								bind:value={newPassword}
								autocomplete="new-password"
								minlength={8}
								required
							/>
						</Field>
						<Field>
							<FieldLabel for="confirmation">Confirm password</FieldLabel>
							<Input
								id="confirmation"
								type="password"
								bind:value={confirmation}
								autocomplete="new-password"
								minlength={8}
								required
							/>
						</Field>
					</FieldGroup>
					<Button type="submit" disabled={savingPassword}>
						{#if savingPassword}<Spinner class="size-4" />{/if} Change password
					</Button>
				</form>
			</CardContent>
		</Card>
	</div>
</main>
