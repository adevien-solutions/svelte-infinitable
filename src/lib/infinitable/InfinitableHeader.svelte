<script lang="ts">
	import { createEventDispatcher, getContext, onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { twMerge } from 'tailwind-merge';
	import * as Popover from '../components/ui/popover/index.js';
	import * as Tooltip from '../components/ui/tooltip/index.js';
	import { type InfiniteTableContext, INFINITE_TABLE_CONTEXT_KEY } from './context.js';
	import * as Filter from './filters/index.js';
	import InfinitableFIlterIcon from './InfinitableFIlterIcon.svelte';
	import type { FilterChangeEventDetail, SortDirection, TableHeader } from './types.js';
	import { debounce, isFilterHeader } from './utils.svelte.js';

	export let header: TableHeader;
	let c = '';
	export { c as class };
	const {
		sorting,
		onFilterMount,
		onFilterDestroy,
		onFilterChange,
		onSortChange,
		resetFlag,
		element: { table }
	} = getContext<InfiniteTableContext>(INFINITE_TABLE_CONTEXT_KEY);
	const dispatch = createEventDispatcher<{ filter: Omit<FilterChangeEventDetail, 'isAllReset'> }>();
	const filter = isFilterHeader(header)
		? {
				value: header.filter.value as any,
				defaultValue: header.filter.value,
				isDefault: true
			}
		: undefined;
	let lastResetFlag = $resetFlag;
	let sortDirection: SortDirection | undefined = undefined;
	let width: string | number;
	let elementWidth: number;

	$: {
		elementWidth;
		onResize();
	}

	$: if (lastResetFlag !== $resetFlag) {
		lastResetFlag = $resetFlag;
		if (isFilterHeader(header) && filter) {
			header.filter.value = filter.defaultValue;
			filter.isDefault = true;
		}
		onFilter(true);
	}

	$: if ($sorting?.header !== header && sortDirection) {
		sortDirection = undefined;
	}

	onMount(() => {
		if (isFilterHeader(header)) {
			onFilterMount(header);
		}
	});

	onDestroy(() => {
		if (isFilterHeader(header)) {
			onFilterDestroy(header);
		}
	});

	function reset(): void {
		if (isFilterHeader(header) && filter) {
			filter.value = header.filter.value = filter.defaultValue;
		}
		updateIsDefaultFilter();
		onFilter();
	}

	function save(): void {
		if (isFilterHeader(header) && filter) {
			header.filter.value = filter.value;
		}
		updateIsDefaultFilter();
		onFilter();
	}

	function updateIsDefaultFilter(): void {
		if (!(isFilterHeader(header) && filter)) {
			return;
		}

		if (header.filter.type === 'custom') {
			filter.isDefault = header.filter.isDefaultValue(header.filter.value);
		} else {
			try {
				const currentValue = JSON.stringify(header.filter.value);
				const defaultValue = JSON.stringify(filter.defaultValue);
				filter.isDefault = currentValue === defaultValue;
			} catch (error) {
				filter.isDefault = header.filter.value === filter.defaultValue;
			}
		}
	}

	function onFilter(isAllReset = false): void {
		if (!(isFilterHeader(header) && filter)) {
			return;
		}

		const detail = { header, isDefault: filter.isDefault };
		dispatch('filter', detail);
		onFilterChange({ ...detail, isAllReset });
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!isFilterHeader(header)) {
			return;
		}

		if (e.key === 'Enter') {
			save();
		}
	}

	function sort() {
		if (!header.sort) {
			return;
		}

		if (sortDirection) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortDirection = header.sort?.defaultDirection ?? 'asc';
		}

		onSortChange({ header, property: header.sort.property, direction: sortDirection });
	}

	const onResize = debounce(() => {
		setWidth();
	}, 50);

	function setWidth(): void {
		const { style } = header;
		// Default to `auto` width if no style is provided
		if (!style) {
			return updateWidth('auto');
		}

		// Check for undefined `width` and `minWidth`
		if (style.width === undefined) {
			if (style.minWidth === undefined) {
				return updateWidth('auto');
			}

			return setMinGuardedWidth('auto', style.minWidth);
		}

		const widthProperty = typeof style.width === 'number' ? `${style.width}px` : style.width;
		if (style.minWidth === undefined) {
			return updateWidth(widthProperty);
		}

		return setMinGuardedWidth(widthProperty, style.minWidth);
	}

	/**
	 * Sets the width of the current table header cell to `widthProperty`,
	 * unless the width would be less than the provided `minWidth`,
	 * in which case the width is set to `minWidth`.
	 */
	function setMinGuardedWidth(widthProperty: string, minWidth: number): void {
		const currentWidth = speculateWidth(widthProperty) ?? elementWidth ?? 0;
		if (currentWidth < minWidth) {
			return updateWidth(`${minWidth}px`);
		} else {
			return updateWidth(widthProperty);
		}
	}

	/**
	 * Updates the `width` variabe, but only if it doesn't have the same value already.
	 * This is to prevent unnecessary re-renders.
	 */
	function updateWidth(value: typeof width): void {
		if (width === value) {
			return;
		}
		width = value;
	}

	/**
	 * Returns the width of the current table header cell in pixels,
	 * as if it's width was set to the value provided.
	 *
	 * @param widthProperty The width CSS property to set on the temporary table header cell.
	 */
	function speculateWidth(widthProperty: string = 'auto'): number | undefined {
		if (!$table?.parentElement) return;

		const wrapper = $table.parentElement;
		const tempTable = $table.cloneNode(true) as HTMLTableElement;
		const tempHeader = tempTable.querySelector<HTMLTableCellElement>(
			`[data-infinitable-header-label="${header.label}"]`
		);
		if (!tempHeader) return;

		tempTable.style.opacity = '0';
		tempTable.style.position = 'absolute';
		tempTable.style.zIndex = '-999';
		tempTable.style.left = '0';
		tempTable.style.width = '100%';
		tempHeader.style.width = widthProperty;

		wrapper.appendChild(tempTable);
		const headerWidth = tempHeader.clientWidth;
		wrapper.removeChild(tempTable);
		return headerWidth;
	}
</script>

<th
	bind:clientWidth={elementWidth}
	on:keydown={handleKeyDown}
	class={twMerge('text-left font-semibold', c)}
	style="width: {width};"
	{...$$restProps}
	data-infinitable-header-label={header.label}
>
	<div class="flex items-center justify-start gap-1.5">
		{#if header.sort}
			<Tooltip.Root>
				<Tooltip.Trigger>
					<button on:click|preventDefault={sort} type="button" class="font-semibold">
						{header.label}
					</button>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Sort by {header.label}</p>
				</Tooltip.Content>
			</Tooltip.Root>
			<!-- <Tooltip activation="hover" static>
				<button slot="toggle" on:click|preventDefault={sort} type="button" class="font-semibold">
					{header.label}
				</button>
				Sort by {header.label}
			</Tooltip> -->
		{:else}
			<span class="font-semibold">
				{header.label}
			</span>
		{/if}
		{#if isFilterHeader(header) && filter}
			<Popover.Root>
				<Popover.Trigger>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<InfinitableFIlterIcon showBadge={!filter.isDefault} />
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Open filter</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Popover.Trigger>

				<Popover.Content>
					<div class="relative max-h-[min(500px,100vh)] overflow-y-auto">
						<slot>
							{#if header.filter.type === 'text'}
								<Filter.Text bind:value={filter.value} />
							{:else if header.filter.type === 'multiSelect'}
								<Filter.MultiSelect bind:value={filter.value} options={header.filter.options} />
							{/if}
						</slot>
					</div>

					<div class="flex items-center justify-between border-t p-1">
						<Popover.Close disabled={filter.isDefault} on:click={reset} class="font-medium">
							Reset
						</Popover.Close>
						<Popover.Close on:click={save} class="font-medium">Save</Popover.Close>
					</div>
				</Popover.Content>
			</Popover.Root>

			<!-- <Tooltip
				placement="bottom-start"
				offsetX={-12}
				offsetY={4}
				trapFocus
				class="w-[min(100vw,300px)] overflow-hidden p-0"
				toggleClass="flex items-center rounded px-1.5 duration-200 hover:bg-black/10 focus:bg-black/10"
				wrapperClass="text-left"
				on:close={() => (filter.value = header.filter.value)}
			>
				<Tooltip slot="toggle" activation="hover" static>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<InfinitableFIlterIcon showBadge={!filter.isDefault} />
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Open filter</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip>

				<div class="relative max-h-[min(500px,100vh)] overflow-y-auto">
					<slot>
						{#if header.filter.type === 'text'}
							<Filter.Text bind:value={filter.value} />
						{:else if header.filter.type === 'multiSelect'}
							<Filter.MultiSelect bind:value={filter.value} options={header.filter.options} />
						{/if}
					</slot>
				</div>

				<div class="flex items-center justify-between border-t p-1">
					<PopoverButton as="span">
						<InfinitableAction disabled={filter.isDefault} on:click={reset} class="font-medium">
							Reset
						</InfinitableAction>
					</PopoverButton>
					<PopoverButton as="span">
						<InfinitableAction on:click={save} class="font-medium">Save</InfinitableAction>
					</PopoverButton>
				</div>
			</Tooltip> -->
		{/if}
		{#if $sorting?.header === header}
			{#if $sorting.direction === 'asc'}
				<i in:fade|local={{ duration: 200 }} class="fa-solid fa-sort-up translate-y-1 pl-1" />
			{:else if $sorting.direction === 'desc'}
				<i in:fade|local={{ duration: 200 }} class="fa-solid fa-sort-down -translate-y-1 pl-1" />
			{/if}
		{/if}
	</div>
</th>
