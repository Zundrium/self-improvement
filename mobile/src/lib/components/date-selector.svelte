<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { parseDate, type DateValue } from '@internationalized/date';
	import { untrack } from 'svelte';

	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Calendar } from '$lib/components/ui/calendar';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';

	interface Props {
		date: string;
		today: string;
		markedDates?: string[];
		hrefForDate: (date: string) => string;
	}

	let { date, today, markedDates = [], hrefForDate }: Props = $props();
	let calendarOpen = $state(false);
	let calendarDate = $state<DateValue | undefined>(untrack(() => parseDate(date)));
	const previousDate = $derived(parseDate(date).subtract({ days: 1 }).toString());
	const nextDate = $derived(parseDate(date).add({ days: 1 }).toString());

	$effect(() => {
		if (calendarDate?.toString() !== date) calendarDate = parseDate(date);
	});

	function chooseDate(value: DateValue | undefined) {
		if (!value) return;
		calendarOpen = false;
		void goto(resolve(hrefForDate(value.toString()) as '/'));
	}

	function displayDate(value: string) {
		return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<section class="flex items-center justify-center gap-1" aria-label="Select date">
	<Button
		href={hrefForDate(previousDate) as Pathname}
		variant="ghost"
		size="icon"
		aria-label="Previous day"><ChevronLeft class="size-4" /></Button
	>
	<Popover bind:open={calendarOpen}>
		<PopoverTrigger>
			{#snippet child({ props })}
				<Button variant="ghost" class="min-w-56 gap-2" {...props}>
					<CalendarDays class="size-4" />
					{displayDate(date)}
					{#if date === today}<Badge>Today</Badge>{/if}
				</Button>
			{/snippet}
		</PopoverTrigger>
		<PopoverContent class="w-auto p-0">
			<Calendar
				type="single"
				bind:value={calendarDate}
				maxValue={parseDate(today)}
				{markedDates}
				onValueChange={chooseDate}
			/>
		</PopoverContent>
	</Popover>
	<Button
		href={nextDate <= today ? (hrefForDate(nextDate) as Pathname) : undefined}
		disabled={nextDate > today}
		variant="ghost"
		size="icon"
		aria-label="Next day"><ChevronRight class="size-4" /></Button
	>
</section>
