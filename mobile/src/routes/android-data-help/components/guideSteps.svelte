<script lang="ts">
	type GuideStep = { title: string; description: string };
	let { steps }: { steps: GuideStep[] } = $props();
</script>

<ol class="divide-y divide-(--text)/8">
	{#each steps as step, index (step.title)}
		<li class="flex gap-4 py-5 first:pt-0 last:pb-0">
			<span
				class="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--text)/8 text-sm font-medium"
			>
				{index + 1}
			</span>
			<div>
				<h3 class="font-medium">{step.title}</h3>
				<p class="mt-1 text-sm leading-6 text-(--text)/64">{step.description}</p>
			</div>
		</li>
	{/each}
</ol>
