<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import Icon from '@iconify/svelte';
	import { House, LoaderCircle, LogOut, Shield, UserRound } from '@lucide/svelte';
	import { signOut as endSession } from '$lib/auth-client';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuLabel,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { trackerIcons } from '$lib/trackers/icons';
	import { getTrackerColors, type Tracker } from '$lib/trackers/registry';
	import AudioVolumeControl from './audioVolumeControl.svelte';
	import ThemeToggle from './themeToggle.svelte';
	import TrackerTile from './trackerTile.svelte';

	type User = {
		name: string;
		email: string;
		role?: string | null;
	};

	let { user, trackers }: { user: User; trackers: Tracker[] } = $props();
	let appLauncherOpen = $state(false);

	function matchesPath(pathname: string, activePrefix: string) {
		return activePrefix === '/' ? pathname === '/' : pathname.startsWith(activePrefix);
	}

	function isActive(activePrefix: string) {
		return matchesPath(page.url.pathname, activePrefix);
	}

	function isPending(activePrefix: string) {
		return Boolean(navigating.to && matchesPath(navigating.to.url.pathname, activePrefix));
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

<nav class="z-50 shrink-0 bg-white dark:bg-black" aria-label="Main navigation">
	<div class="app-gutter">
		<div class="mx-auto grid h-16 w-full max-w-(--app-compact-max-width) grid-cols-3 items-stretch">
			<a
				href={resolve('/')}
				class="flex items-center justify-center text-(--text)/40 transition-colors hover:text-(--text)"
				aria-label="Home"
				aria-current={isActive('/') ? 'page' : undefined}
				aria-busy={isPending('/')}
			>
				<span
					class="flex size-11 items-center justify-center rounded-2xl bg-[#f2f2f2] text-(--text) dark:bg-[#1c1c1c]"
				>
					{#if isPending('/')}
						<LoaderCircle class="size-6 animate-spin" />
					{:else}
						<House class="size-6" />
					{/if}
				</span>
			</a>

			<Popover bind:open={appLauncherOpen}>
				<PopoverTrigger
					class="flex cursor-pointer items-center justify-center rounded-2xl text-(--text)/40 transition-colors outline-none hover:text-(--text) focus-visible:ring-2 focus-visible:ring-(--text)/20"
					aria-label="Open trackers"
					aria-expanded={appLauncherOpen}
				>
					<span
						class="flex size-11 items-center justify-center rounded-2xl bg-[#f2f2f2] text-(--text) dark:bg-[#1c1c1c]"
					>
						<Icon icon="material-symbols-light:apps" class="size-6" aria-hidden="true" />
					</span>
				</PopoverTrigger>
				<PopoverContent
					side="top"
					align="center"
					sideOffset={12}
					class="w-(--app-overlay-width) max-w-(--app-compact-max-width) p-(--app-overlay-padding)"
				>
					<p class="px-2 pb-3 text-sm font-medium">Trackers</p>
					<div class="grid grid-cols-3 gap-1">
						{#each trackers as tracker (tracker.id)}
							<TrackerTile
								href={tracker.href}
								label={tracker.label}
								icon={trackerIcons[tracker.id]}
								colors={getTrackerColors(tracker.id)}
								variant="compact"
								active={isActive(`/${tracker.id}`)}
								pending={isPending(`/${tracker.id}`)}
								onSelect={() => (appLauncherOpen = false)}
							/>
						{/each}
					</div>
				</PopoverContent>
			</Popover>

			<DropdownMenu>
				<DropdownMenuTrigger
					class="flex cursor-pointer items-center justify-center rounded-2xl ring-(--text)/20 outline-none focus-visible:ring-2"
					aria-label="Open user menu"
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
						<UserRound />
						Profile
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
					<div class="flex items-center justify-between gap-3 px-3 py-1 text-sm">
						<span>Theme</span>
						<ThemeToggle />
					</div>
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
