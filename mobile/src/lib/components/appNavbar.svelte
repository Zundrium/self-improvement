<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import Icon from '@iconify/svelte';
	import {
		ChevronDown,
		House,
		LoaderCircle,
		LogOut,
		Settings,
		Shield,
		UserRound
	} from '@lucide/svelte';
	import { apiRequest } from '$lib/api';
	import { signOut as endSession } from '$lib/auth-client';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuLabel,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import type { DaySummaryData } from '$lib/api-types';
	import { closeDrawer as animateDrawerClose, drawerEnter } from '$lib/motion/gsap';
	import type { AppTracker } from '$lib/trackers/registry';
	import AppDrawer from './appDrawer.svelte';
	import AudioVolumeControl from './audioVolumeControl.svelte';

	type User = {
		name: string;
		email: string;
		role?: string | null;
	};

	let {
		user,
		trackers,
		daySummary
	}: { user: User; trackers: AppTracker[]; daySummary?: DaySummaryData } = $props();
	let appLauncherOpen = $state(false);
	let daySummaryLoading = $state(false);
	let daySummaryFailed = $state(false);
	let drawerDaySummary = $state<DaySummaryData>();
	let navigationElement: HTMLElement | undefined;
	let drawerElement = $state<HTMLElement>();
	let drawerClosing = false;

	$effect(() => {
		if (daySummary) drawerDaySummary = daySummary;
	});

	function matchesPath(pathname: string, activePrefix: string) {
		return activePrefix === '/' ? pathname === '/' : pathname.startsWith(activePrefix);
	}

	function isActive(activePrefix: string) {
		return matchesPath(page.url.pathname, activePrefix);
	}

	function isPending(activePrefix: string) {
		return Boolean(navigating.to && matchesPath(navigating.to.url.pathname, activePrefix));
	}

	function toggleDrawer() {
		if (appLauncherOpen) return void closeDrawer();
		appLauncherOpen = true;
		void loadDaySummary();
	}

	async function closeDrawer() {
		if (!appLauncherOpen || drawerClosing) return;
		drawerClosing = true;
		await animateDrawerClose(drawerElement);
		dismissDrawer();
	}

	function dismissDrawer() {
		appLauncherOpen = false;
		drawerClosing = false;
	}

	function closeDrawerOutside(event: PointerEvent) {
		const target = event.target;
		if (target instanceof Node && !navigationElement?.contains(target)) void closeDrawer();
	}

	function closeDrawerOnEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') void closeDrawer();
	}

	async function loadDaySummary() {
		const date = page.url.searchParams.get('date');
		if (hasDaySummaryFor(date)) return;
		drawerDaySummary = undefined;
		daySummaryLoading = true;
		daySummaryFailed = false;
		try {
			drawerDaySummary = await apiRequest<DaySummaryData>(daySummaryPath(date));
		} catch {
			daySummaryFailed = true;
		} finally {
			daySummaryLoading = false;
		}
	}

	function hasDaySummaryFor(date: string | null) {
		if (!drawerDaySummary) return false;
		return date ? drawerDaySummary.date === date : drawerDaySummary.date === drawerDaySummary.today;
	}

	function daySummaryPath(date: string | null) {
		return date ? `/api/app/day-summary?date=${encodeURIComponent(date)}` : '/api/app/day-summary';
	}

	function openProfile() {
		void goto(resolve('/profile'));
	}

	function openAdmin() {
		void goto(resolve('/admin'));
	}

	async function signOut() {
		await endSession();
		await goto(resolve('/sign-in'));
	}
</script>

<svelte:window onpointerdown={closeDrawerOutside} onkeydown={closeDrawerOnEscape} />

<nav
	bind:this={navigationElement}
	class="relative z-50 shrink-0 bg-white pb-[env(safe-area-inset-bottom)] dark:bg-black"
	aria-label="Main navigation"
>
	{#if appLauncherOpen}
		<div
			bind:this={drawerElement}
			id="app-drawer"
			class="absolute inset-x-0 bottom-full z-40 max-h-[calc(100svh-4rem)] overflow-y-auto bg-(--bg-elevated)"
			use:drawerEnter={dismissDrawer}
		>
			<div
				class="flex h-5 touch-none items-center justify-center"
				data-drawer-handle
				aria-hidden="true"
			>
				<span class="h-1 w-10 rounded-full bg-(--text)/16"></span>
			</div>
			{#if drawerDaySummary && !daySummaryLoading}
				<AppDrawer {trackers} daySummary={drawerDaySummary} onSelect={closeDrawer} />
			{:else if daySummaryFailed}
				<button
					type="button"
					class="app-gutter flex min-h-48 w-full items-center justify-center text-sm text-(--text)/56"
					onclick={() => void loadDaySummary()}
				>
					Tracker summary unavailable. Tap to retry.
				</button>
			{:else}
				<div class="flex min-h-48 items-center justify-center" aria-label="Loading tracker apps">
					<LoaderCircle class="size-6 text-(--text)/40" data-motion-spin />
				</div>
			{/if}
		</div>
	{/if}
	<div class="app-gutter relative z-50 bg-white dark:bg-black">
		<div class="mx-auto grid h-16 w-full max-w-(--app-compact-max-width) grid-cols-3 items-stretch">
			<a
				href={resolve('/')}
				class="flex touch-manipulation items-center justify-center text-(--text)/40 hover:text-(--text)"
				aria-label="Home"
				aria-current={isActive('/') ? 'page' : undefined}
				aria-busy={isPending('/')}
				data-motion-press
				onclick={closeDrawer}
			>
				<span
					class="flex size-11 items-center justify-center rounded-2xl bg-[#f2f2f2] text-(--text) dark:bg-[#1c1c1c]"
				>
					{#if isPending('/')}
						<LoaderCircle class="size-6" data-motion-spin />
					{:else}
						<House class="size-6" />
					{/if}
				</span>
			</a>

			<button
				type="button"
				class="flex cursor-pointer touch-manipulation items-center justify-center rounded-2xl text-(--text)/40 outline-none hover:text-(--text) focus-visible:ring-2 focus-visible:ring-(--text)/20"
				aria-label={appLauncherOpen ? 'Close app drawer' : 'Open app drawer'}
				aria-controls="app-drawer"
				aria-expanded={appLauncherOpen}
				onclick={toggleDrawer}
			>
				<span
					class="flex size-11 items-center justify-center rounded-2xl bg-[#f2f2f2] text-(--text) dark:bg-[#1c1c1c]"
				>
					{#if appLauncherOpen}
						<ChevronDown class="size-6" />
					{:else}
						<Icon icon="material-symbols-light:apps" class="size-6" aria-hidden="true" />
					{/if}
				</span>
			</button>

			<DropdownMenu>
				<DropdownMenuTrigger
					class="flex cursor-pointer items-center justify-center rounded-2xl ring-(--text)/20 outline-none focus-visible:ring-2"
					aria-label="Open user menu"
					onclick={closeDrawer}
				>
					<span
						class="flex size-11 items-center justify-center rounded-2xl bg-[#f2f2f2] text-(--text) dark:bg-[#1c1c1c]"
					>
						<UserRound class="size-6" />
					</span>
				</DropdownMenuTrigger>
				<DropdownMenuContent side="top" align="end" sideOffset={10} class="w-56">
					<DropdownMenuLabel class="space-y-0.5 py-2">
						<p class="truncate text-sm font-medium text-(--text)">{user.name}</p>
						<p class="truncate font-normal">{user.email}</p>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={openProfile}>
						<Settings />
						Settings
					</DropdownMenuItem>
					{#if user.role === 'admin'}
						<DropdownMenuItem onSelect={openAdmin}>
							<Shield />
							Users
						</DropdownMenuItem>
					{/if}
					<DropdownMenuSeparator />
					<AudioVolumeControl />
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
						<LogOut />
						Sign out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	</div>
</nav>
