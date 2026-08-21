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
	import { fullDateLabel } from '$lib/dateFormatting';
	import {
		Popover,
		PopoverContent,
		PopoverOverlay,
		PopoverTrigger
	} from '$lib/components/ui/popover';
	import type { TrackerColors } from '$lib/trackers/registry';

	interface Props {
		date: string;
		today: string;
		markedDates?: string[];
		colors?: TrackerColors[];
		hrefForDate: (date: string) => string;
	}

	let { date, today, markedDates = [], colors = [], hrefForDate }: Props = $props();
	let calendarOpen = $state(false);
	let calendarDate = $state<DateValue | undefined>(untrack(() => parseDate(date)));
	const previousDate = $derived(parseDate(date).subtract({ days: 1 }).toString());
	const nextDate = $derived(parseDate(date).add({ days: 1 }).toString());
	const primaryColor = $derived(colors[0]?.primary ?? '#262626');
	const secondaryColor = $derived(colors[0]?.secondary ?? '#0d0d0d');
	const pickerColors = $derived({ primary: primaryColor, secondary: secondaryColor });

	$effect(() => {
		if (calendarDate?.toString() !== date) calendarDate = parseDate(date);
	});

	function chooseDate(value: DateValue | undefined) {
		if (!value) return;
		calendarOpen = false;
		void goto(resolve(hrefForDate(value.toString()) as '/'));
	}

	function dismissCalendar(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		calendarOpen = false;
	}
</script>

<section
	class="mx-auto grid w-full max-w-(--app-compact-max-width) grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2"
	aria-label="Select date"
>
	<Button
		href={hrefForDate(previousDate) as Pathname}
		variant="default"
		size="icon"
		aria-label="Previous day"><ChevronLeft class="size-4" /></Button
	>
	<Popover bind:open={calendarOpen}>
		<PopoverTrigger>
			{#snippet child({ props })}
				<Button
					variant="ghost"
					class="date-picker-field w-full min-w-0 gap-2 px-3 text-white shadow-sm shadow-black/15 hover:bg-transparent hover:text-white sm:px-4"
					motionColors={pickerColors}
					{...props}
				>
					<CalendarDays class="size-4" />
					<span class="min-w-0 truncate">{fullDateLabel(date)}</span>
					{#if date === today}
						<Badge
							class="bg-white px-1.5 py-0.5 text-[10px] leading-3 text-black shadow-sm shadow-black/15"
							>Today</Badge
						>
					{/if}
				</Button>
			{/snippet}
		</PopoverTrigger>
		<PopoverOverlay onclick={dismissCalendar} />
		<PopoverContent
			class="w-auto p-0"
			wrapperClass="z-[61]"
			onInteractOutside={(event) => event.preventDefault()}
		>
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
		variant="default"
		size="icon"
		aria-label="Next day"><ChevronRight class="size-4" /></Button
	>
</section>

<style>
	:global(.date-picker-field) {
		background: linear-gradient(135deg, var(--motion-primary), var(--motion-secondary));
		color: #ffffff;
	}
</style>
