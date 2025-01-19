<script lang="ts">
	import X from 'lucide-svelte/icons/x';
	import type { Snippet } from 'svelte';
	import { Button, type ButtonSize, type ButtonVariant } from '../components/ui/button/index.js';
	import { getInfiniteTableContext } from './context.js';

	type Props = {
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		class?: string;

		children?: Snippet;
	};

	let {
		variant = 'ghost',
		size = 'default',
		disabled = false,
		class: c = '',
		children
	}: Props = $props();

	const { clearFilters, allFiltersDefault } = getInfiniteTableContext();
</script>

<Button {variant} {size} class={c} onclick={clearFilters} disabled={disabled || $allFiltersDefault}>
	{#if children}
		{@render children()}
	{:else}
		<X size={16} />
		<span>Clear filters</span>
	{/if}
</Button>
