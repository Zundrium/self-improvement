<script lang="ts">
import { animatedValue, type AnimatedValueOptions } from '$lib/motion/animated-value';

let { value, format }: AnimatedValueOptions = $props();
const label = $derived(format && typeof value === 'number' ? format(value) : value);
</script>

<span data-animated-value><span aria-hidden="true" use:animatedValue={{ value, format }}></span><span class="sr-only">{label}</span></span>
