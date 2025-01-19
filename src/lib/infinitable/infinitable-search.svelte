<script lang="ts">
	import Search from 'lucide-svelte/icons/search';
	import { onDestroy } from 'svelte';
	import { cn } from '../components/utils.js';
	import type { SearchHandler, TableSearchSettings } from '../types/index.js';
	import { getInfiniteTableContext } from './context.js';
	import { debounce } from './utils.svelte.js';

	type Props = {
		/**
		 * The settings of the table search. Determines how the search is handled.
		 */
		settings: TableSearchSettings;
		/**
		 * The value of the search input.
		 *
		 * @default ''
		 */
		value?: string;
		/**
		 * The placeholder text of the search input.
		 *
		 * @default 'Search'
		 */
		placeholder?: string;
		/**
		 * The amount of milliseconds to wait after the user's last keystroke.
		 *
		 * @default 500
		 */
		debounceDelay?: number;
		/** Called when the user types in the search input, and search is in `server` mode. */
		onSearch?: SearchHandler | undefined;
		class?: string;
	};

	let {
		value = $bindable(''),
		settings,
		debounceDelay = 500,
		placeholder = 'Search',
		class: c,
		onSearch
	}: Props = $props();
	let { onSearchChange, onSearchDestroy } = getInfiniteTableContext();

	onDestroy(onSearchDestroy);

	const onInput = debounce(() => {
		onSearchChange(value, settings, onSearch);
	}, debounceDelay);
</script>

<form class={cn('w-full sm:min-w-60 lg:max-w-sm', c)}>
	<label
		class="group flex w-full items-stretch rounded border border-gray-300 bg-white duration-200
		focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-blue-400 hover:border-gray-500"
	>
		<span class="sr-only">Search</span>
		<div class="flex h-8 min-w-[32px] items-center justify-center p-1 text-gray-500">
			<Search size={18} />
		</div>
		<input
			bind:value
			oninput={onInput}
			type="search"
			name="search"
			{placeholder}
			class="w-full border-none bg-transparent py-1 pl-0 pr-2 text-sm outline-none placeholder:text-gray-500 focus:ring-0"
			aria-label="Search"
		/>
	</label>
</form>
