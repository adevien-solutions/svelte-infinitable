<script lang="ts">
	import Search from 'lucide-svelte/icons/search';
	import type { TableSearchSettings } from './types.js';
	import { debounce } from './utils.svelte.js';

	type Props = {
		value: string;
		onSearch?: (search: string) => void;
		settings?: TableSearchSettings;
	};

	let { value = $bindable(''), onSearch, settings }: Props = $props();

	let placeholder = settings?.placeholder ?? 'Search';
	let debounceDelay = settings?.debounceDelay ?? 500;

	const onSearchChange = debounce(() => {
		onSearch?.(value.trim());
	}, debounceDelay);
</script>

<form class="w-full sm:min-w-60 lg:max-w-sm">
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
			oninput={onSearchChange}
			type="search"
			name="search"
			{placeholder}
			class="w-full border-none bg-transparent py-1 pl-0 pr-2 text-sm outline-none placeholder:text-gray-500 focus:ring-0"
			aria-label="Search"
		/>
	</label>
</form>
