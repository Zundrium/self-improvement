import { getContext, setContext, untrack, type Snippet } from 'svelte';

type BottomActionBar = {
	id: symbol;
	readonly children: Snippet;
	readonly contentClass: string;
	readonly mobileOnly: boolean;
};

const bottomActionBarStateKey = Symbol('bottom-action-bar-state');

export class BottomActionBarState {
	private entries = $state<BottomActionBar[]>([]);
	// A nested workflow temporarily owns the outlet. Removing it restores its parent.
	get actionBar() {
		return this.entries.at(-1);
	}

	show(actionBar: BottomActionBar) {
		this.entries = [
			...untrack(() => this.entries).filter((entry) => entry.id !== actionBar.id),
			actionBar
		];
	}

	hide(id: symbol) {
		this.entries = untrack(() => this.entries).filter((entry) => entry.id !== id);
	}
}

export function provideBottomActionBarState() {
	const state = new BottomActionBarState();
	setContext(bottomActionBarStateKey, state);
	return state;
}

export function useBottomActionBarState() {
	const state = getContext<BottomActionBarState | undefined>(bottomActionBarStateKey);
	if (!state)
		throw new Error(
			'PageActionBar requires the app shell. Use BottomActionBar for inline presentation.'
		);
	return state;
}
