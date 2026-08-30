<script lang="ts">
	import { Laptop, Moon, Sun } from '@lucide/svelte';
	import { setMode, userPrefersMode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button';

	function selected(mode: 'light' | 'system' | 'dark') {
		return userPrefersMode.current === mode;
	}
</script>

<div class="inline-flex rounded-3xl bg-(--text)/5 p-1" aria-label="Color theme">
	<Button
		variant={selected('light') ? 'default' : 'ghost'}
		size="small" format="icon"
		aria-label="Use light theme"
		aria-pressed={selected('light')}
		onclick={() => setMode('light')}
	>
		<Sun class="size-4" />
	</Button>
	<Button
		variant={selected('system') ? 'default' : 'ghost'}
		size="small" format="icon"
		aria-label="Follow system theme"
		aria-pressed={selected('system')}
		onclick={() => setMode('system')}
	>
		<Laptop class="size-4" />
	</Button>
	<Button
		variant={selected('dark') ? 'default' : 'ghost'}
		size="small" format="icon"
		aria-label="Use dark theme"
		aria-pressed={selected('dark')}
		onclick={() => setMode('dark')}
	>
		<Moon class="size-4" />
	</Button>
</div>
