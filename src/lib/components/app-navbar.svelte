<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import {
		Apple,
		Dumbbell,
		Droplet,
		Footprints,
		Flower2,
		Gauge,
		House,
		LoaderCircle,
		LogOut,
		Shield,
		UserRound
	} from '@lucide/svelte';
	import { authClient } from '$lib/auth-client';
	import { Avatar } from '$lib/components/ui/avatar';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuLabel,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import type { Tracker } from '$lib/trackers/registry';
	import ThemeToggle from './theme-toggle.svelte';

	type User = {
		name: string;
		email: string;
		image?: string | null;
		role?: string | null;
	};

	const trackerIcons = {
		steps: Footprints,
		fitness: Dumbbell,
		nutrition: Apple,
		meditation: Flower2,
		period: Droplet
	};

	let { user, trackers }: { user: User; trackers: Tracker[] } = $props();
	const hidden = $derived(page.url.pathname === '/nutrition/track');
	const fitnessEnabled = $derived(trackers.some((tracker) => tracker.id === 'fitness'));
	const navigationItems = $derived([
		{ href: '/' as const, activePrefix: '/', label: 'Home', icon: House },
		...trackers.map((tracker) => ({
			href: tracker.href,
			activePrefix: `/${tracker.id}`,
			label: tracker.label,
			icon: trackerIcons[tracker.id]
		}))
	]);

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

	function openFitnessSettings() {
		void goto(resolve('/fitness/exercises'));
	}

	async function signOut() {
		await authClient.signOut();
		await goto(resolve('/sign-in'));
	}
</script>

{#if !hidden}
	<nav
		class="fixed inset-x-0 bottom-0 z-50 border-t border-(--text)/8 bg-(--bg)/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg"
		aria-label="Main navigation"
	>
		<div
			class="mx-auto grid h-16 w-full max-w-lg items-stretch px-1"
			style={`grid-template-columns: repeat(${navigationItems.length + 1}, minmax(0, 1fr))`}
		>
			{#each navigationItems as item (item.href)}
				<a
					href={resolve(item.href)}
					class="flex items-center justify-center text-(--text)/40 transition-colors hover:text-(--text)"
					aria-label={item.label}
					aria-current={isActive(item.activePrefix) ? 'page' : undefined}
					aria-busy={isPending(item.activePrefix)}
				>
					<span
						class="flex size-10 items-center justify-center rounded-2xl {isActive(item.activePrefix)
							? 'bg-(--text)/8 text-(--text)'
							: ''}"
					>
						{#if isPending(item.activePrefix)}
							<LoaderCircle class="size-5 animate-spin" />
						{:else}
							<item.icon class="size-5" />
						{/if}
					</span>
				</a>
			{/each}

			<DropdownMenu>
				<DropdownMenuTrigger
					class="flex cursor-pointer items-center justify-center rounded-2xl ring-(--text)/20 outline-none focus-visible:ring-2"
					aria-label="Open user menu"
				>
					<Avatar
						src={user.image ?? undefined}
						alt={user.name}
						size="sm"
						class={page.url.pathname === '/profile' ? 'ring-2 ring-(--text)' : ''}
					/>
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
					{#if fitnessEnabled}
						<DropdownMenuItem onSelect={openFitnessSettings}>
							<Gauge />
							Rep speeds
						</DropdownMenuItem>
					{/if}
					{#if user.role === 'admin'}
						<DropdownMenuItem onSelect={openAdmin}>
							<Shield />
							Users
						</DropdownMenuItem>
					{/if}
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
	</nav>
	<div class="h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0" aria-hidden="true"></div>
{/if}
