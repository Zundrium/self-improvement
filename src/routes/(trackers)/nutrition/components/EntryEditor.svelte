<script lang="ts">
	import {
		ChevronLeft,
		Droplet,
		Drumstick,
		Image,
		MessageCircle,
		Plus,
		Send,
		Trash2,
		Wheat
	} from '@lucide/svelte';

	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '$lib/components/ui/accordion';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import { Spinner } from '$lib/components/ui/spinner';
	import { Textarea } from '$lib/components/ui/textarea';

	export type EditableIngredient = {
		id: string;
		name: string;
		quantity: number;
		unit: string;
		calories: number;
		proteinG: number;
		carbsG: number;
		fatG: number;
		notes: string;
	};

	export type EditableMeal = {
		id: string;
		name: string;
		notes: string;
		imageDataUrl: string;
		ingredients: EditableIngredient[];
	};

	type Refinement = {
		reply: string;
		mealName: string;
		ingredients: Array<{
			name: string;
			quantity: number;
			unit: string;
			calories: number;
			proteinG: number;
			carbsG: number;
			fatG: number;
			notes: string;
		}>;
	};

	type RevisionMessage = { role: 'user' | 'assistant'; text: string };

	type Props = {
		entryId: string;
		date?: string;
		time?: string;
		name?: string;
		notes?: string;
		meals?: EditableMeal[];
		error?: string;
	};

	let {
		entryId,
		date = $bindable(''),
		time = $bindable(''),
		name = $bindable(''),
		notes = $bindable(''),
		meals = $bindable<EditableMeal[]>([]),
		error = ''
	}: Props = $props();

	let revisionDrafts = $state<Record<string, string>>({});
	let revisionMessages = $state<Record<string, RevisionMessage[]>>({});
	let revisionErrors = $state<Record<string, string>>({});
	let refining = $state<Record<string, boolean>>({});

	const mealsJson = $derived(JSON.stringify(meals));
	const totals = $derived(totalMeals(meals));

	async function refineMeal(mealId: string) {
		const correction = (revisionDrafts[mealId] ?? '').trim();
		const currentMeal = meals.find((meal) => meal.id === mealId);
		if (!currentMeal || correction.length < 2 || refining[mealId]) return;

		refining = { ...refining, [mealId]: true };
		revisionErrors = { ...revisionErrors, [mealId]: '' };
		try {
			const response = await fetch(`/nutrition/api/entries/${entryId}/refine-meal`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mealId,
					correction,
					meal: { name: currentMeal.name, ingredients: currentMeal.ingredients }
				})
			});
			if (!response.ok) throw new Error(await responseMessage(response));
			const { revision } = (await response.json()) as { revision: Refinement };
			const previousName = currentMeal.name;
			meals = meals.map((meal) =>
				meal.id === mealId
					? {
							...meal,
							name: revision.mealName,
							ingredients: revision.ingredients.map((item) => ({
								id: crypto.randomUUID(),
								...item
							}))
						}
					: meal
			);
			if (meals.length === 1 && name === previousName) name = revision.mealName;
			revisionMessages = {
				...revisionMessages,
				[mealId]: [
					...(revisionMessages[mealId] ?? []),
					{ role: 'user', text: correction },
					{ role: 'assistant', text: revision.reply }
				]
			};
			revisionDrafts = { ...revisionDrafts, [mealId]: '' };
		} catch (cause) {
			revisionErrors = {
				...revisionErrors,
				[mealId]: cause instanceof Error ? cause.message : 'Could not update the estimate.'
			};
		} finally {
			refining = { ...refining, [mealId]: false };
		}
	}

	async function responseMessage(response: Response) {
		const text = await response.text();
		try {
			return (JSON.parse(text) as { message?: string }).message || text || 'Request failed.';
		} catch {
			return text || 'Request failed.';
		}
	}

	function addMeal() {
		meals = [
			...meals,
			{
				id: crypto.randomUUID(),
				name: 'Meal',
				notes: '',
				imageDataUrl: '',
				ingredients: [newIngredient()]
			}
		];
	}

	function removeMeal(mealId: string) {
		meals = meals.filter((meal) => meal.id !== mealId);
	}

	function addIngredient(mealId: string) {
		meals = meals.map((meal) =>
			meal.id === mealId ? { ...meal, ingredients: [...meal.ingredients, newIngredient()] } : meal
		);
	}

	function removeIngredient(mealId: string, ingredientId: string) {
		meals = meals.map((meal) =>
			meal.id === mealId
				? { ...meal, ingredients: meal.ingredients.filter((item) => item.id !== ingredientId) }
				: meal
		);
	}

	function newIngredient(): EditableIngredient {
		return {
			id: crypto.randomUUID(),
			name: '',
			quantity: 1,
			unit: 'serving',
			calories: 0,
			proteinG: 0,
			carbsG: 0,
			fatG: 0,
			notes: ''
		};
	}

	function totalIngredients(items: EditableIngredient[]) {
		return items.reduce(
			(total, item) => ({
				calories: total.calories + (Number(item.calories) || 0),
				proteinG: total.proteinG + (Number(item.proteinG) || 0),
				carbsG: total.carbsG + (Number(item.carbsG) || 0),
				fatG: total.fatG + (Number(item.fatG) || 0)
			}),
			{ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
		);
	}

	function totalMeals(items: EditableMeal[]) {
		return items.reduce(
			(total, meal) => {
				const value = totalIngredients(meal.ingredients);
				return {
					calories: total.calories + value.calories,
					proteinG: total.proteinG + value.proteinG,
					carbsG: total.carbsG + value.carbsG,
					fatG: total.fatG + value.fatG
				};
			},
			{ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
		);
	}
</script>

<input type="hidden" name="meals" value={mealsJson} />
<input type="hidden" name="notes" value={notes} />

<div class="space-y-5">
	<div class="flex items-center gap-3">
		<Button href="/nutrition/log/{date}" variant="ghost" size="icon" aria-label="Back to daily log"
			><ChevronLeft class="size-5" /></Button
		>
		<div>
			<h1 class="text-2xl font-medium tracking-[-0.04em]">Review meal</h1>
			<p class="text-sm text-(--text)/48">
				Correct any ingredients, portions, or nutrition values that look off.
			</p>
		</div>
	</div>

	{#if error}<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>{/if}

	<div class="space-y-6 py-2">
		<div class="text-center">
			<strong class="block text-5xl font-medium tracking-[-0.07em] tabular-nums sm:text-6xl"
				>{Math.round(totals.calories)}</strong
			>
			<span class="mt-1 block text-sm text-(--text)/48">kcal</span>
		</div>
		<div class="mx-auto grid w-full max-w-lg grid-cols-3 items-center">
			<div class="flex flex-col items-center gap-2 py-4 text-center">
				<Drumstick class="size-5 text-chart-2" /><strong class="text-2xl font-medium tabular-nums"
					>{totals.proteinG.toFixed(1)}g</strong
				><span class="text-xs text-(--text)/48">protein</span>
			</div>
			<div class="flex flex-col items-center gap-2 py-4 text-center">
				<Wheat class="size-5 text-chart-1" /><strong class="text-2xl font-medium tabular-nums"
					>{totals.carbsG.toFixed(1)}g</strong
				><span class="text-xs text-(--text)/48">carbs</span>
			</div>
			<div class="flex flex-col items-center gap-2 py-4 text-center">
				<Droplet class="size-5 text-chart-3" /><strong class="text-2xl font-medium tabular-nums"
					>{totals.fatG.toFixed(1)}g</strong
				><span class="text-xs text-(--text)/48">fat</span>
			</div>
		</div>
		<div class="mx-auto grid w-full max-w-xl grid-cols-2 gap-3">
			<Field>
				<FieldLabel for="date">Date</FieldLabel>
				<Input id="date" name="date" type="date" bind:value={date} required />
			</Field>
			<Field>
				<FieldLabel for="time">Time</FieldLabel>
				<Input id="time" name="time" type="time" bind:value={time} required />
			</Field>
		</div>
		<Field class="mx-auto w-full max-w-xl">
			<FieldLabel for="entry-name">Log name</FieldLabel>
			<Input id="entry-name" name="name" bind:value={name} maxlength={120} required />
		</Field>
	</div>

	<section class="space-y-3">
		<div class="flex items-center justify-between px-1">
			<h2 class="text-lg font-medium">Meals</h2>
			<Button type="button" variant="ghost" size="sm" onclick={addMeal}
				><Plus class="mr-1.5 size-4" /> Add meal</Button
			>
		</div>
		{#each meals as meal, mealIndex (meal.id)}
			{@const mealTotals = totalIngredients(meal.ingredients)}
			<div class="space-y-5 py-3 sm:py-4">
				<div class="flex gap-4">
					{#if meal.imageDataUrl}
						<img
							src={meal.imageDataUrl}
							alt=""
							class="size-20 shrink-0 rounded-3xl object-cover sm:size-24"
						/>
					{:else}
						<span
							class="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-(--text)/5 sm:size-24"
							><Image class="size-6 text-(--text)/32" /></span
						>
					{/if}
					<div class="min-w-0 flex-1 space-y-3">
						<div class="flex gap-2">
							<Input
								bind:value={meal.name}
								aria-label={`Meal ${mealIndex + 1} name`}
								placeholder={`Meal ${mealIndex + 1}`}
							/><Button
								type="button"
								variant="destructive"
								size="icon"
								onclick={() => removeMeal(meal.id)}
								aria-label="Remove meal"><Trash2 class="size-4" /></Button
							>
						</div>
						<div class="flex flex-wrap gap-1.5">
							<Badge>{Math.round(mealTotals.calories)} kcal</Badge><Badge
								>{mealTotals.proteinG.toFixed(1)}g P</Badge
							><Badge>{mealTotals.carbsG.toFixed(1)}g C</Badge><Badge
								>{mealTotals.fatG.toFixed(1)}g F</Badge
							>
						</div>
					</div>
				</div>
				<Input
					bind:value={meal.notes}
					aria-label="Meal notes"
					placeholder="Meal notes (optional)"
					maxlength={500}
				/>

				{#if meal.imageDataUrl}
					<div class="space-y-4 py-2">
						<div class="flex gap-3">
							<span
								class="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--text) text-(--bg)"
								><MessageCircle class="size-4" /></span
							>
							<div>
								<h3 class="font-medium">Correct this estimate with AI</h3>
								<p class="mt-0.5 text-sm leading-5 text-(--text)/52">
									Tell us what was wrong or missing. Each message updates the current ingredients,
									so you can keep refining the meal.
								</p>
							</div>
						</div>

						{#if (revisionMessages[meal.id] ?? []).length > 0}
							<div class="space-y-2" aria-live="polite">
								{#each revisionMessages[meal.id] ?? [] as message, messageIndex (messageIndex)}
									<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
										<p
											class="max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 {message.role ===
											'user'
												? 'bg-(--text) text-(--bg)'
												: 'bg-(--bg-elevated) text-(--text)/72'}"
										>
											{message.text}
										</p>
									</div>
								{/each}
							</div>
						{/if}

						<Field>
							<FieldLabel for="meal-correction-{meal.id}">What should change?</FieldLabel>
							<Textarea
								id="meal-correction-{meal.id}"
								bind:value={revisionDrafts[meal.id]}
								maxlength={500}
								rows={3}
								placeholder="e.g. It was 200 g Greek yoghurt with 10% fat, not plain yoghurt"
								disabled={refining[meal.id]}
							/>
						</Field>
						{#if revisionErrors[meal.id]}
							<Alert variant="destructive"
								><AlertDescription>{revisionErrors[meal.id]}</AlertDescription></Alert
							>
						{/if}
						<div class="flex justify-end">
							<Button
								type="button"
								onclick={() => refineMeal(meal.id)}
								disabled={(revisionDrafts[meal.id] ?? '').trim().length < 2 || refining[meal.id]}
							>
								{#if refining[meal.id]}<Spinner class="mr-2 size-4" /> Updating…{:else}Apply
									correction <Send class="ml-2 size-4" />{/if}
							</Button>
						</div>
					</div>
				{/if}

				<Separator />
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-medium">Ingredients</h3>
					<Button type="button" variant="ghost" size="sm" onclick={() => addIngredient(meal.id)}
						><Plus class="mr-1 size-3.5" /> Ingredient</Button
					>
				</div>

				{#if meal.ingredients.length > 0}
					<Accordion type="multiple">
						{#each meal.ingredients as item, itemIndex (item.id)}
							<AccordionItem value={item.id}>
								<AccordionTrigger>
									<span class="min-w-0 flex-1"
										><span class="block truncate">{item.name || `Ingredient ${itemIndex + 1}`}</span
										><span class="block text-xs font-normal text-(--text)/40"
											>{item.quantity} {item.unit} · {item.calories} kcal</span
										></span
									>
								</AccordionTrigger>
								<AccordionContent class="space-y-4">
									<div class="grid gap-3 sm:grid-cols-[1fr_120px_140px_auto]">
										<Field
											><FieldLabel>Name</FieldLabel><Input
												bind:value={item.name}
												placeholder="Chicken breast"
											/></Field
										>
										<Field
											><FieldLabel>Quantity</FieldLabel><Input
												type="number"
												min="0"
												step="0.1"
												bind:value={item.quantity}
											/></Field
										>
										<Field
											><FieldLabel>Unit</FieldLabel><Input
												bind:value={item.unit}
												placeholder="serving"
											/></Field
										>
										<Button
											type="button"
											variant="destructive"
											size="icon"
											class="self-end"
											onclick={() => removeIngredient(meal.id, item.id)}
											aria-label="Remove ingredient"><Trash2 class="size-4" /></Button
										>
									</div>
									<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
										<Field
											><FieldLabel>Calories</FieldLabel><Input
												type="number"
												min="0"
												step="0.1"
												bind:value={item.calories}
											/></Field
										>
										<Field
											><FieldLabel>Protein (g)</FieldLabel><Input
												type="number"
												min="0"
												step="0.1"
												bind:value={item.proteinG}
											/></Field
										>
										<Field
											><FieldLabel>Carbs (g)</FieldLabel><Input
												type="number"
												min="0"
												step="0.1"
												bind:value={item.carbsG}
											/></Field
										>
										<Field
											><FieldLabel>Fat (g)</FieldLabel><Input
												type="number"
												min="0"
												step="0.1"
												bind:value={item.fatG}
											/></Field
										>
									</div>
									<Field
										><FieldLabel>Notes</FieldLabel><Input
											bind:value={item.notes}
											placeholder="Optional notes"
										/></Field
									>
								</AccordionContent>
							</AccordionItem>
						{/each}
					</Accordion>
				{:else}
					<p class="py-6 text-center text-sm text-(--text)/40">No ingredients yet.</p>
				{/if}
			</div>
			{#if mealIndex < meals.length - 1}<Separator />{/if}
		{/each}
	</section>
</div>
