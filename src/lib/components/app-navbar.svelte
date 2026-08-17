<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { LogOut, Shield, UserRound } from '@lucide/svelte';
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
	import ThemeToggle from './theme-toggle.svelte';

	type User = {
		name: string;
		email: string;
		image?: string | null;
		role?: string | null;
	};

	let { user }: { user: User } = $props();

	function openProfile() {
		void goto(resolve('/profile'));
	}

	function openAdmin() {
		void goto(resolve('/admin'));
	}

	async function signOut() {
		await authClient.signOut();
		await goto(resolve('/sign-in'));
	}
</script>

<nav class="sticky top-0 z-40 border-b border-(--text)/8 bg-(--bg)/90 backdrop-blur-lg">
	<div class="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
		<a href={resolve('/')} class="text-sm font-semibold tracking-[-0.02em]">Self Improvement</a>
		<div class="flex items-center gap-1">
			<ThemeToggle />
			<DropdownMenu>
				<DropdownMenuTrigger
					class="cursor-pointer rounded-full ring-(--text)/20 outline-none focus-visible:ring-2"
					aria-label="Open user menu"
				>
					<Avatar src={user.image ?? undefined} alt={user.name} size="default" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" class="w-56">
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
					<DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
						<LogOut />
						Sign out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	</div>
</nav>
