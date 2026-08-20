import { getContext, setContext } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';

const dateSelectorStateKey = Symbol('date-selector-state');

class DateSelectorState {
	markedDates = new SvelteSet<string>();

	constructor(markedDates: string[]) {
		this.replace(markedDates);
	}

	replace(markedDates: string[]) {
		this.markedDates.clear();
		for (const date of markedDates) this.markedDates.add(date);
	}

	mark(date: string, marked: boolean) {
		if (marked) this.markedDates.add(date);
		else this.markedDates.delete(date);
	}
}

export function provideDateSelectorState(markedDates: string[]) {
	const state = new DateSelectorState(markedDates);
	setContext(dateSelectorStateKey, state);
	return state;
}

export function useDateSelectorState() {
	return getContext<DateSelectorState>(dateSelectorStateKey);
}
