<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Activity } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { apiRequest } from '$lib/api';
	import { authClient, signOut as endSession } from '$lib/auth-client';
	import NativeSyncCard from '$lib/components/native-sync-card.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Avatar } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Field, FieldDescription, FieldGroup, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Spinner } from '$lib/components/ui/spinner';
	import type { TrackerId } from '$lib/trackers/registry';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const initialProfile = untrack(() => data.nutritionProfile);
	let name = $state(untrack(() => data.profileUser.name));
	let enabledTrackers = $state<TrackerId[]>(
		untrack(() =>
			data.trackerPreferences.filter((tracker) => tracker.enabled).map((tracker) => tracker.id)
		)
	);
	let gender = $state(initialProfile?.gender ?? 'male');
	let activityLevel = $state(initialProfile?.activityLevel ?? 'sedentary');
	let goalMode = $state(initialProfile?.goalMode ?? 'estimated');
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmation = $state('');
	let profileMessage = $state('');
	let profileFailed = $state(false);
	let passwordMessage = $state('');
	let passwordFailed = $state(false);
	let busy = $state('');

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

	async function updateProfile(event: SubmitEvent) {
		event.preventDefault();
		busy = 'profile';
		const result = await authClient.updateUser({ name: name.trim() });
		busy = '';
		profileFailed = Boolean(result.error);
		profileMessage = result.error?.message ?? 'Profile updated.';
		if (!result.error) await invalidateAll();
	}

	async function saveTrackers() {
		await saveProfileSection(
			{ trackers: enabledTrackers },
			'Tracker visibility updated.',
			'trackers'
		);
	}

	async function saveNutrition(event: SubmitEvent) {
		event.preventDefault();
		const form = Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement));
		await saveProfileSection(form, 'Nutrition profile updated.', 'nutrition');
	}

	async function saveProfileSection(
		body: Record<string, unknown>,
		success: string,
		section: string
	) {
		busy = section;
		try {
			await apiRequest('/api/app/profile', { method: 'PATCH', body: JSON.stringify(body) });
			profileFailed = false;
			profileMessage = success;
			await invalidateAll();
		} catch (cause) {
			profileFailed = true;
			profileMessage = cause instanceof Error ? cause.message : 'Could not update your profile.';
		} finally {
			busy = '';
		}
	}

	function toggleTracker(id: TrackerId, checked: boolean) {
		enabledTrackers = checked
			? [...new Set([...enabledTrackers, id])]
			: enabledTrackers.filter((trackerId) => trackerId !== id);
	}

	async function changePassword(event: SubmitEvent) {
		event.preventDefault();
		if (newPassword !== confirmation) return showPasswordError('Passwords do not match.');
		busy = 'password';
		const result = await authClient.changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: true
		});
		busy = '';
		passwordFailed = Boolean(result.error);
		passwordMessage = result.error?.message ?? 'Password changed.';
	}

	function showPasswordError(message: string) {
		passwordFailed = true;
		passwordMessage = message;
	}

	async function signOut() {
		await endSession();
		await goto(resolve('/sign-in'));
	}
</script>

<svelte:head><title>Profile · Self Improvement</title></svelte:head>

<main
	class="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-4xl gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))] md:grid-cols-[280px_1fr] md:p-8"
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
				{#if data.profileUser.role === 'admin'}<Button href="/admin" variant="ghost">Users</Button
					>{/if}
				<Button type="button" variant="ghost" onclick={signOut}>Sign out</Button>
			</div>
		</CardContent>
	</Card>

	<div class="space-y-4">
		{#if profileMessage}
			<Alert variant={profileFailed ? 'destructive' : 'default'}
				><AlertDescription>{profileMessage}</AlertDescription></Alert
			>
		{/if}

		<Card>
			<CardHeader><CardTitle>Profile</CardTitle></CardHeader>
			<CardContent>
				<form class="space-y-5" onsubmit={updateProfile}>
					<Field
						><FieldLabel for="name">Name</FieldLabel><Input
							id="name"
							bind:value={name}
							minlength={2}
							required
						/></Field
					>
					<Button type="submit" disabled={busy === 'profile'}
						>{#if busy === 'profile'}<Spinner class="size-4" />{/if} Save profile</Button
					>
				</form>
			</CardContent>
		</Card>

		<Card>
			<CardHeader><CardTitle>Trackers</CardTitle></CardHeader>
			<CardContent class="space-y-5">
				<p class="text-sm leading-6 text-(--text)/64">
					Choose which trackers appear on your home screen and navigation.
				</p>
				<div class="divide-y divide-(--text)/8">
					{#each data.trackerPreferences as tracker (tracker.id)}
						<div class="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
							<Checkbox
								id="tracker-{tracker.id}"
								checked={enabledTrackers.includes(tracker.id)}
								onCheckedChange={(checked) => toggleTracker(tracker.id, checked)}
							/>
							<label class="min-w-0 flex-1 cursor-pointer" for="tracker-{tracker.id}">
								<span class="block text-sm font-medium">{tracker.label}</span>
								<span class="mt-0.5 block text-sm leading-5 text-(--text)/56"
									>{tracker.description}</span
								>
							</label>
						</div>
					{/each}
				</div>
				<Button type="button" disabled={busy === 'trackers'} onclick={saveTrackers}
					>Save trackers</Button
				>
			</CardContent>
		</Card>

		<NativeSyncCard />

		<Card>
			<CardHeader
				><CardTitle class="flex items-center gap-2"><Activity class="size-5" /> Nutrition</CardTitle
				></CardHeader
			>
			<CardContent>
				{#if data.nutritionProfile}
					<form class="space-y-5" onsubmit={saveNutrition}>
						<p class="text-sm text-(--text)/64">
							Your estimated maintenance is {data.estimatedTdee} kcal per day.
						</p>
						<FieldGroup>
							<div class="grid gap-4 sm:grid-cols-3">
								<Field
									><FieldLabel for="weightKg">Weight (kg)</FieldLabel><Input
										id="weightKg"
										name="weightKg"
										type="number"
										step="0.1"
										min="20"
										max="300"
										value={data.nutritionProfile.weightKg}
										required
									/></Field
								>
								<Field
									><FieldLabel for="heightCm">Height (cm)</FieldLabel><Input
										id="heightCm"
										name="heightCm"
										type="number"
										step="0.1"
										min="100"
										max="250"
										value={data.nutritionProfile.heightCm}
										required
									/></Field
								>
								<Field
									><FieldLabel for="age">Age</FieldLabel><Input
										id="age"
										name="age"
										type="number"
										min="10"
										max="120"
										value={data.nutritionProfile.age}
										required
									/></Field
								>
							</div>
							<div class="grid gap-4 sm:grid-cols-2">
								<Field
									><FieldLabel>Gender</FieldLabel><Select
										type="single"
										name="gender"
										bind:value={gender}
										><SelectTrigger class="w-full"
											>{gender === 'male' ? 'Male' : 'Female'}</SelectTrigger
										><SelectContent
											><SelectItem value="male">Male</SelectItem><SelectItem value="female"
												>Female</SelectItem
											></SelectContent
										></Select
									></Field
								>
								<Field
									><FieldLabel>Activity level</FieldLabel><Select
										type="single"
										name="activityLevel"
										bind:value={activityLevel}
										><SelectTrigger class="w-full">{activityLabel}</SelectTrigger><SelectContent
											><SelectItem value="sedentary">Sedentary</SelectItem><SelectItem value="light"
												>Light activity</SelectItem
											><SelectItem value="moderate">Moderate activity</SelectItem><SelectItem
												value="active">Active</SelectItem
											><SelectItem value="very_active">Very active</SelectItem></SelectContent
										></Select
									></Field
								>
							</div>
							<div class="grid gap-4 sm:grid-cols-2">
								<Field
									><FieldLabel>Goal calculation</FieldLabel><Select
										type="single"
										name="goalMode"
										bind:value={goalMode}
										><SelectTrigger class="w-full"
											>{goalMode === 'custom' ? 'Manual goal' : 'Use estimate'}</SelectTrigger
										><SelectContent
											><SelectItem value="estimated">Use TDEE estimate</SelectItem><SelectItem
												value="custom">Set a manual calorie goal</SelectItem
											></SelectContent
										></Select
									></Field
								>
								<Field
									><FieldLabel for="customGoal">Manual daily goal (kcal)</FieldLabel><Input
										id="customGoal"
										name="customGoal"
										type="number"
										min="500"
										max="10000"
										value={data.nutritionProfile.dailyCalorieGoal}
										disabled={goalMode !== 'custom'}
										required={goalMode === 'custom'}
									/><FieldDescription>Overrides the estimated daily goal.</FieldDescription></Field
								>
							</div>
						</FieldGroup>
						<Button type="submit" disabled={busy === 'nutrition'}>Save nutrition profile</Button>
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
					{#if passwordMessage}<Alert variant={passwordFailed ? 'destructive' : 'default'}
							><AlertDescription>{passwordMessage}</AlertDescription></Alert
						>{/if}
					<FieldGroup>
						<Field
							><FieldLabel for="current-password">Current password</FieldLabel><Input
								id="current-password"
								type="password"
								bind:value={currentPassword}
								autocomplete="current-password"
								minlength={8}
								required
							/></Field
						>
						<Field
							><FieldLabel for="new-password">New password</FieldLabel><Input
								id="new-password"
								type="password"
								bind:value={newPassword}
								autocomplete="new-password"
								minlength={8}
								required
							/></Field
						>
						<Field
							><FieldLabel for="confirmation">Confirm password</FieldLabel><Input
								id="confirmation"
								type="password"
								bind:value={confirmation}
								autocomplete="new-password"
								minlength={8}
								required
							/></Field
						>
					</FieldGroup>
					<Button type="submit" disabled={busy === 'password'}
						>{#if busy === 'password'}<Spinner class="size-4" />{/if} Change password</Button
					>
				</form>
			</CardContent>
		</Card>
	</div>
</main>
