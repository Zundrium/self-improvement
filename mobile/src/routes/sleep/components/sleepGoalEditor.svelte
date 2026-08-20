<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { apiRequest } from '$lib/api';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { formatSleepMinutes } from '../sleep';

	let { goal }: { goal: number } = $props();
	let loadedGoal = $state(untrack(() => goal));
	let goalInput = $state(untrack(() => goal));
	let message = $state('');
	let failed = $state(false);

	$effect(() => {
		if (loadedGoal === goal) return;
		loadedGoal = goal;
		goalInput = goal;
	});

	async function saveGoal(event: SubmitEvent) {
		event.preventDefault();
		try {
			await apiRequest('/api/app/sleep', {
				method: 'PATCH',
				body: JSON.stringify({
					dailyGoalMinutes: goalInput,
					timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
				})
			});
			failed = false;
			message = 'Daily sleep goal updated.';
			await invalidateAll();
		} catch (cause) {
			failed = true;
			message = cause instanceof Error ? cause.message : 'Could not update the goal.';
		}
	}
</script>

<form class="space-y-4" onsubmit={saveGoal}>
	{#if message}
		<Alert variant={failed ? 'destructive' : 'default'}>
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	{/if}
	<Field>
		<FieldLabel for="dailyGoalMinutes">Minutes</FieldLabel>
		<Input
			id="dailyGoalMinutes"
			name="dailyGoalMinutes"
			type="number"
			min="60"
			max="1440"
			step="15"
			bind:value={goalInput}
			required
		/>
		<FieldDescription>{formatSleepMinutes(goal)} per day</FieldDescription>
	</Field>
	<Button type="submit">Save sleep goal</Button>
</form>
