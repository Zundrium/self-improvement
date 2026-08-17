<script lang="ts">
	import { CalendarDate, getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import { untrack } from 'svelte';
	import { Calendar } from '$lib/components/ui/calendar';

	interface Props {
		completedDateKeys?: string[];
		ondayclick: (detail: { day: number; dateKey: string }) => void;
	}

	let { completedDateKeys = [], ondayclick }: Props = $props();
	const initialPlaceholder = today(getLocalTimeZone());
	let placeholder = $state<DateValue>(initialPlaceholder);
	let calendarValue = $state<DateValue[]>(untrack(() => completionDates(completedDateKeys)));

	$effect(() => {
		const nextValue = completionDates(completedDateKeys);
		const currentValue = untrack(() => calendarValue);
		if (!sameDates(currentValue, nextValue)) calendarValue = nextValue;
	});

	function completionDates(dateKeys: string[]): DateValue[] {
		return dateKeys.flatMap((key) => {
			const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
			if (!match) return [];
			const year = Number(match[1]);
			const month = Number(match[2]);
			const day = Number(match[3]);
			const daysInMonth = new Date(year, month, 0).getDate();
			if (month < 1 || month > 12 || day < 1 || day > Math.min(30, daysInMonth)) return [];
			return [new CalendarDate(year, month, day)];
		});
	}

	function handleValueChange(nextValue: DateValue[] | undefined) {
		const proposedValue = nextValue ?? [];
		const completedValue = completionDates(completedDateKeys);
		const completedKeys = new Set(completedValue.map(dateKey));
		const nextKeys = new Set(proposedValue.map(dateKey));
		const changed =
			proposedValue.find((date) => !completedKeys.has(dateKey(date))) ??
			completedValue.find((date) => !nextKeys.has(dateKey(date)));

		if (changed && changed.day <= 30) {
			ondayclick({ day: changed.day, dateKey: dateKey(changed) });
		}

		queueMicrotask(() => {
			const restoredValue = completionDates(completedDateKeys);
			if (!sameDates(calendarValue, restoredValue)) calendarValue = restoredValue;
		});
	}

	function sameDates(left: DateValue[] | undefined, right: DateValue[]): boolean {
		if (!left) return false;
		return (
			left.length === right.length &&
			left.every((date, index) => dateKey(date) === dateKey(right[index]))
		);
	}

	function dateKey(date: DateValue): string {
		return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
	}
</script>

<Calendar
	type="multiple"
	bind:value={calendarValue}
	bind:placeholder
	onValueChange={handleValueChange}
	disableDaysOutsideMonth
	isDateUnavailable={(date) => date.day > 30}
	fluid
	class="w-full shadow-sm"
/>
