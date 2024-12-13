<script lang="ts">
	import ListFilter from 'lucide-svelte/icons/list-filter';
	import { fade } from 'svelte/transition';

	type Props = {
		showBadge?: boolean;
		class?: string;
	};

	let { showBadge = false, class: c = '' }: Props = $props();
</script>

<span class="relative {c}">
	<ListFilter size={18} class="" />
	{#if showBadge}
		<span
			transition:fade={{ duration: 200 }}
			class="absolute -right-2 -top-1 box-content h-2.5 w-2.5 rounded-full border-[3px] border-white bg-blue-500"
		></span>
	{/if}
</span>
