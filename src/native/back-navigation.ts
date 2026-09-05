import { App } from '@capacitor/app';
import { requireNativeAndroid } from './platform';

export function backAction(canGoBack: boolean, dismissOverlay: () => boolean) {
	if (dismissOverlay()) return 'dismissed' as const;
	return canGoBack ? ('history' as const) : ('exit' as const);
}

export async function listenForBack() {
	requireNativeAndroid();
	const handle = await App.addListener('backButton', ({ canGoBack }) => {
		const action = backAction(canGoBack, dismissTopOverlay);
		if (action === 'history') history.back();
		if (action === 'exit') void App.exitApp().catch(() => undefined);
	});
	return () => {
		void handle.remove().catch(() => undefined);
	};
}

export function dismissTopOverlay() {
	// Bits UI owns focus restoration and nested-overlay ordering. Forward the
	// platform Back intent as Escape instead of removing its DOM ourselves.
	const overlay = document.querySelector(
		'[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"], ' +
			'[data-state="open"][role="listbox"], [data-state="open"][role="menu"], ' +
			'[data-state="open"][data-slot="popover-content"], #navigation-drawer'
	);
	if (!overlay) return false;
	(document.activeElement ?? document.body).dispatchEvent(
		new KeyboardEvent('keydown', {
			key: 'Escape',
			code: 'Escape',
			bubbles: true,
			cancelable: true
		})
	);
	return true;
}
