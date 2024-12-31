<script lang="ts">
	import { GitHub } from '$lib/components/icons/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ExampleTable } from './example/index.js';
</script>

<div class="prose mx-auto text-center prose-p:text-balance">
	<h1 class="mb-2">Svelte Infinitable</h1>
	<div class="flex items-center justify-center">
		<Button
			variant="ghost"
			href="https://github.com/adevien-solutions/svelte-infinitable"
			class="h-auto [&_svg]:size-7"
		>
			<span class="sr-only">GitHub</span>
			<GitHub />
		</Button>
	</div>
	<p>
		Svelte Infinitable is a virtual table component that uses native <kbd>table</kbd> elements and
		supports <em>infinite scrolling</em>, <em>searching</em>, <em>filtering</em>,
		<em>sorting</em>, and more.
	</p>
	<p>
		It integrates seamlessly into projects that use <a
			href="https://shadcn-svelte.com/"
			target="_blank">shadcn</a
		>
		components, but it's flexible and customizable enough to fit the needs of any other project.
	</p>
</div>
<div class="mt-10">
	<ExampleTable />
</div>
