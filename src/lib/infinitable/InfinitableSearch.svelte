<script lang="ts">
	import Search from 'lucide-svelte/icons/search';
	import { createEventDispatcher } from 'svelte';
	import { debounce } from './utils.svelte.js';

	export let value = '';
	export let placeholder = 'Search';
	const dispatch = createEventDispatcher<{
		/** Dispatches the search term. This event is debounced for 500ms. */
		search: string;
	}>();
	const onSearchChange = debounce(() => {
		dispatch('search', value.trim());
	}, 500);
</script>

<form class="w-full sm:min-w-60 lg:max-w-lg">
	<label
		class="group flex w-full items-stretch rounded border border-gray-300 bg-white duration-200
		focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-blue-300 hover:border-gray-500"
	>
		<span class="sr-only">Search</span>
		<div
			class="flex h-8 min-w-[32px] items-center justify-center border-gray-300 p-1
			text-gray-500 duration-200"
		>
			<Search size={18} />
		</div>
		<input
			bind:value
			on:input={onSearchChange}
			type="search"
			name="search"
			{placeholder}
			class="w-full border-none bg-transparent py-1 pl-0 pr-2 text-sm outline-none placeholder:text-gray-500 focus:ring-0"
			aria-label="Search"
		/>
	</label>
</form>
