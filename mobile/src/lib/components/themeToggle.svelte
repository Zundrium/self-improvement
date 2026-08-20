<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	let dark = $state(false);

	onMount(() => {
		dark = document.documentElement.classList.contains('dark');
	});

	function toggleTheme() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
		try {
			localStorage.setItem('self-improvement-theme', dark ? 'dark' : 'light');
		} catch {
			return;
		}
	}
</script>

<Button
	variant="ghost"
	size="icon"
	aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
	onclick={toggleTheme}
>
	{#if dark}<Sun size={19} />{:else}<Moon size={19} />{/if}
</Button>
