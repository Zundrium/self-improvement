import { writable } from 'svelte/store';

export type ToastId = string | number;
export type ToastType = 'success' | 'error' | 'default' | 'achievement' | 'streak' | 'glimmer';
export type ToastAction = { label: string; onClick: () => void };
export type ToastOptions = {
	id?: ToastId;
	description?: string;
	action?: ToastAction;
	duration?: number;
};
export type Toast = ToastOptions & {
	id: ToastId;
	message: string;
	type: ToastType;
	closing: boolean;
};

const defaultDuration = 10_000;
const exitDuration = 180;
const timers = new Map<ToastId, ReturnType<typeof setTimeout>>();
export const toastStore = writable<Toast[]>([]);

function createToast(type: ToastType, message: string, options: ToastOptions = {}) {
	const id = options.id ?? crypto.randomUUID();
	const toast = { ...options, id, message, type, closing: false };
	toastStore.update((toasts) => [...toasts.filter((item) => item.id !== id), toast]);
	scheduleDismissal(id, options.duration ?? defaultDuration);
	return id;
}

function scheduleDismissal(id: ToastId, duration: number) {
	clearDismissal(id);
	if (!Number.isFinite(duration) || duration <= 0) return;
	timers.set(
		id,
		setTimeout(() => dismiss(id), duration)
	);
}

function clearDismissal(id: ToastId) {
	const timer = timers.get(id);
	if (timer) clearTimeout(timer);
	timers.delete(id);
}

function dismiss(id?: ToastId) {
	if (id === undefined) return dismissAll();
	clearDismissal(id);
	toastStore.update((toasts) =>
		toasts.map((item) => (item.id === id ? { ...item, closing: true } : item))
	);
	timers.set(
		id,
		setTimeout(() => remove(id), exitDuration)
	);
}

function dismissAll() {
	for (const toastId of timers.keys()) clearDismissal(toastId);
	toastStore.set([]);
}

function remove(id: ToastId) {
	clearDismissal(id);
	toastStore.update((toasts) => toasts.filter((toast) => toast.id !== id));
}

export const toast = Object.assign(
	(message: string, options?: ToastOptions) => createToast('default', message, options),
	{
		success: (message: string, options?: ToastOptions) => createToast('success', message, options),
		error: (message: string, options?: ToastOptions) => createToast('error', message, options),
		achievement: (message: string, options?: ToastOptions) =>
			createToast('achievement', message, options),
		streak: (message: string, options?: ToastOptions) => createToast('streak', message, options),
		glimmer: (message: string, options?: ToastOptions) => createToast('glimmer', message, options),
		dismiss
	}
);
