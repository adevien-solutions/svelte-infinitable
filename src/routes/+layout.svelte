<script lang="ts">
	import { GitHub } from '$lib/components/icons/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import '../app.css';

	let { children } = $props();
</script>

<main class="mx-auto max-w-5xl p-8">
	<div class="prose prose-p:text-balance mx-auto text-center">
		<h1>Svelte Infinitable</h1>
		<div class="flex items-center justify-center">
			<Button variant="ghost" href="https://github.com/adevien-solutions/svelte-infinitable">
				<span class="sr-only">GitHub</span>
				<GitHub size={24} />
			</Button>
		</div>
		<p>
			Svelte Infinitable is a virtual table component that uses native <kbd>table</kbd> elements,
			and supports <em>infinite scrolling</em>, <em>searching</em>, <em>filtering</em>,
			<em>sorting</em>, and more.
		</p>
		<p>
			It integrates seamlessly into any project that uses <a
				href="https://shadcn-svelte.com/"
				target="_blank">shadcn</a
			>
			components, but it's flexible and customizable enough to fit the needs of any project.
		</p>
	</div>
	<div class="mt-10">
		{@render children()}
	</div>
</main>
