<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
</script>

<svelte:head>
	<title>Self Improvement</title>
	<meta name="description" content="A unified daily view for nutrition, fitness, and meditation." />
</svelte:head>

<main class="flex min-h-[calc(100svh-4rem)] items-center justify-center p-4 sm:p-6">
	<section class="w-full max-w-md space-y-8">
		<header class="space-y-3 px-1">
			<p class="text-sm font-medium tracking-wide text-(--text)/56 uppercase">Self Improvement</p>
			<h1 class="text-4xl leading-tight font-semibold tracking-[-0.04em]">
				Your day, in one place.
			</h1>
			<p class="max-w-sm text-base leading-7 text-(--text)/64">
				A mobile-first home for nutrition, fitness, and meditation.
			</p>
		</header>

		<div class="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Fitness</CardTitle>
					<CardDescription>Follow a guided 30-day total-body program.</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="text-sm leading-6 text-(--text)/64">
						Run timed workouts with spoken cues and track completed days.
					</p>
				</CardContent>
				<CardFooter>
					<Button href="/fitness">Open fitness</Button>
				</CardFooter>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Nutrition</CardTitle>
					<CardDescription>Photograph a meal and review its AI calorie estimate.</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="text-sm leading-6 text-(--text)/64">
						Track calories and macros against your daily goal.
					</p>
				</CardContent>
				<CardFooter>
					<Button href="/calories">Open calorie estimator</Button>
				</CardFooter>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Meditation</CardTitle>
					<CardDescription>Set a timer and mix looping ambient sounds.</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="text-sm leading-6 text-(--text)/64">
						Completed sessions are saved to your account.
					</p>
				</CardContent>
				<CardFooter>
					<Button href="/meditate">Open meditation</Button>
				</CardFooter>
			</Card>
		</div>
	</section>
</main>
