import { getContext, setContext, type Snippet } from 'svelte';

type BottomActionBar = {
	id: symbol;
	readonly children: Snippet;
	readonly contentClass: string;
	readonly mobileOnly: boolean;
};

const bottomActionBarStateKey = Symbol('bottom-action-bar-state');

class BottomActionBarState {
	actionBar = $state<BottomActionBar>();

	show(actionBar: BottomActionBar) {
		this.actionBar = actionBar;
	}

	hide(id: symbol) {
		if (this.actionBar?.id === id) this.actionBar = undefined;
	}
}

export function provideBottomActionBarState() {
	const state = new BottomActionBarState();
	setContext(bottomActionBarStateKey, state);
	return state;
}

export function useBottomActionBarState() {
	return getContext<BottomActionBarState>(bottomActionBarStateKey);
}
