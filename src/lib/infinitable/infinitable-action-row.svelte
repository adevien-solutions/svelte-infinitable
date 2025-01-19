<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '../components/utils.js';

	type Props = {
		class?: string;

		children?: Snippet;
	};
	let { class: c = '', children }: Props = $props();
</script>

<div class={cn('flex flex-wrap items-center justify-start gap-4 border-b bg-gray-50 p-2', c)}>
	{@render children?.()}
</div>
