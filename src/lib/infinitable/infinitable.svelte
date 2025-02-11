<script lang="ts">
	import Check from 'lucide-svelte/icons/check';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import Search from 'lucide-svelte/icons/search';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import { onMount, tick, untrack, type Snippet } from 'svelte';
	import { writable } from 'svelte/store';
	import { twMerge } from 'tailwind-merge';
	import { Button } from '../components/ui/button/index.js';
	import type {
		FilterDetailItem,
		FilterHandler,
		InfiniteDetail,
		InfiniteHandler,
		InternalSortDetail,
		RefreshDetail,
		RefreshHandler,
		SearchDetail,
		SearchHandler,
		SelectDetail,
		SelectHandler,
		SortDetail,
		SortHandler,
		TableFilterHeader,
		TableHeader,
		TableItem,
		TableSearchSettings
	} from '../types/index.js';
	import { setInfiniteTableContext, type InfiniteTableState } from './context.js';
	import InfiniteTableRow from './infinitable-row.svelte';
	import { searchSettingsToFilter } from './utils.svelte.js';

	type Props = {
		/**
		 * The items to display in the table.
		 *
		 * If all of the items are loaded ahead of time,
		 * set `ignoreInfinite` to `true` and call `finishInitialLoad()`
		 * when the initial load is completed.
		 *
		 * @default []
		 */
		items?: TableItem[];
		/** The height of each row in pixels. */
		rowHeight: number;
		/**
		 * Controls whether the table rows are selectable or not.
		 *
		 * @default false
		 */
		selectable?: boolean;
		/**
		 * The number of rows to render above and below the visible area of the table.
		 * Also controls how early the table will call the `onInfinite` function.
		 *
		 * @default 10
		 */
		overscan?: number;
		/**
		 * Controls whether the `onInfinite` function is called or not.
		 * Useful to set to `true` if you know that you are going to load all the data at once.
		 *
		 * If set to `true`, call `finishInitialLoad()` on the table component
		 * when the initial load is completed.
		 *
		 * @default false
		 */
		ignoreInfinite?: boolean;
		/**
		 * A function that takes an item and an index as parameters,
		 * and returns a boolean indicating whether the row
		 * at that index should be disabled or not.
		 * @param item The item data.
		 * @param index The index of the row.
		 *
		 * @default undefined
		 */
		rowDisabler?: ((item: TableItem, index: number) => boolean) | undefined;
		/**
		 * The text that will be displayed when the checkbox of a disabled row is hovered.
		 *
		 * @default 'This row cannot be selected'
		 */
		disabledRowMessage?: string | undefined;
		/**
		 * Classes to apply to the table wrapper element.
		 *
		 * @default ''
		 */
		class?: string;
		/**
		 * Style to apply to the table wrapper element.
		 *
		 * @default ''
		 */
		style?: string;
		/**
		 * If set to `true`, buttons will be rendered that make it easy to switch
		 * between different states of the table.
		 *
		 * @default false
		 */
		debug?: boolean;

		/*******
		 * Events
		 ********/

		/** Called when the table has reached the end of the loaded data. */
		onInfinite?: InfiniteHandler | undefined;
		/** Called when the filtering of the table changes, and it's in `server` mode. */
		onFilter?: FilterHandler | undefined;
		/** Called when the sorting of the table changes, and it's in `server` mode. */
		onSort?: SortHandler | undefined;
		/** Called when the selected items change. */
		onSelect?: SelectHandler | undefined;

		/******
		 * Slots
		 *******/

		/** A slot for the table rows. */
		children?: Snippet<
			[{ item: TableItem; index: number; selectedCount: number; isAllSelected: boolean }]
		>;
		/**
		 * A slot above the table, but within it's border.
		 * It's the recommended place to mount the `Search`, `Refresh`, `FilterClear`, and any other extra components.
		 */
		actions?: Snippet<[{ selectedCount: number }]>;
		/** A slot for the table headers. */
		headers?: Snippet;
		/** A slot to replace the loading indicator below existing rows. */
		loader?: Snippet;
		/** A slot to replace the message below existing rows, when the table has no more items. */
		completed?: Snippet;
		/** A slot to replace the screen when the table has items, but they are filtered out. */
		empty?: Snippet;
		/** A slot to replace the screen when the table is loading and empty. */
		loadingEmpty?: Snippet;
		/** A slot to replace the screen when the table has no more items and empty. */
		completedEmpty?: Snippet;
		/** A slot to replace the screen when the table has an error and empty. */
		errorEmpty?: Snippet;
		/** A slot to replace the screen when the table is idle and empty. */
		idleEmpty?: Snippet;
		/** A slot to replace the info message below the table. */
		rowsDetail?: Snippet<[{ rowCount: number; selectedCount: number }]>;
		/** A slot to replace the error message below the table. */
		error?: Snippet<[{ message: string }]>;
	};

	let {
		items = $bindable([]),
		rowHeight,
		selectable = false,
		overscan = 10,
		rowDisabler = undefined,
		disabledRowMessage = undefined,
		ignoreInfinite = false,
		class: c = '',
		style = '',
		debug = false,
		// Events
		onInfinite = undefined,
		onFilter = undefined,
		onSort = undefined,
		onSelect = undefined,
		// Slots
		children,
		actions,
		headers,
		loader,
		completed,
		empty,
		loadingEmpty,
		completedEmpty,
		errorEmpty,
		idleEmpty,
		rowsDetail,
		error
	}: Props = $props();

	const filterIsDefault = new Map<TableFilterHeader, boolean>();
	const refreshReset = new Set<() => void>();
	const selected = new Map<TableItem, number>();
	const resetFlag = writable(false);
	const visibleRowIndex = $state({
		start: 0,
		end: 0
	});
	const bodyPadding = $state({
		top: 0,
		bottom: 0
	});
	const tableElement = writable<HTMLTableElement | undefined>();

	let internalItems = $state<{ data: TableItem; index: number }[]>([]);
	let viewportElement = $state<HTMLElement>();
	let headerHeight = $state(0);
	let tableBodyElement = $state<HTMLTableSectionElement>();
	let allFiltersDefault = writable(true);
	let selectedCount = $state(0);
	let isAllSelected = $state(false);
	let rowCount = $derived(internalItems.length);
	let search = $state<{ value: string; settings: TableSearchSettings } | undefined>();
	let sorting = writable<InternalSortDetail | undefined>(undefined);
	let errorMessage = $state('');
	let internalState = writable<InfiniteTableState>('idle');
	let isInitialLoad = $state(ignoreInfinite);
	let isMounted = $state(false);

	////////////////////////////////////////
	// Functions passed to event handlers //
	////////////////////////////////////////

	const infiniteDetail: InfiniteDetail = {
		loaded: (newItems: TableItem[]) => {
			$internalState = 'idle';
			errorMessage = '';
			items = [...items, ...newItems];
		},
		completed: (newItems: TableItem[]) => {
			$internalState = 'completed';
			errorMessage = '';
			items = [...items, ...newItems];
		},
		error: (message?: string) => {
			$internalState = 'error';
			errorMessage = message ?? 'An error occurred while loading items';
		}
	};

	const refreshDetail: RefreshDetail = {
		loaded: (i: TableItem[]) => {
			$internalState = 'idle';
			errorMessage = '';
			items = [...i];
		},
		completed: (i: TableItem[]) => {
			$internalState = 'completed';
			errorMessage = '';
			items = [...i];
		},
		error: (message?: string) => {
			$internalState = 'error';
			errorMessage = message ?? 'An error occurred while loading items';
		}
	};

	setInfiniteTableContext({
		state: {
			subscribe: internalState.subscribe
		},
		element: {
			table: { subscribe: tableElement.subscribe }
		},
		selectedCount: () => selectedCount,
		rowCount: () => rowCount,
		isAllSelected: () => isAllSelected,
		selectable,
		sorting: {
			subscribe: sorting.subscribe
		},
		onFilterMount,
		onFilterDestroy,
		onFilterChange,
		onSortChange,
		refresh,
		onRefreshMount,
		onRefreshDestroy,
		allFiltersDefault: {
			subscribe: allFiltersDefault.subscribe
		},
		clearFilters,
		onSearchChange,
		onSearchDestroy,
		resetFlag: { subscribe: resetFlag.subscribe }
	});

	$effect(() => {
		items;
		if (isMounted) {
			untrack(() => {
				resetRefreshButtonTimers();
				applyFilteringAndOrdering();
			});
		}
	});
	$effect(() => {
		rowHeight;
		if (isMounted) {
			untrack(() => {
				onScroll();
			});
		}
	});

	onMount(() => {
		isMounted = true;
	});

	function resetInternalItems() {
		internalItems = items.map((data, index) => ({ data, index }));
	}

	async function onSearchChange(
		value: string,
		settings: TableSearchSettings,
		handler?: SearchHandler
	) {
		search = {
			value,
			settings
		};
		if (settings.mode === 'server') {
			$internalState = 'loading';
			await handler?.(refreshDetail, { value });
			return;
		}
		applyFilteringAndOrdering();
	}

	function onSearchDestroy() {
		search = undefined;
	}

	function onFilterMount(filterHeader: TableFilterHeader) {
		filterIsDefault.set(filterHeader, true);
	}

	function onFilterDestroy(filterHeader: TableFilterHeader) {
		filterIsDefault.delete(filterHeader);
		$allFiltersDefault = [...filterIsDefault.values()].every(Boolean);
		applyFilteringAndOrdering();
	}

	function onFilterChange(detail: FilterDetailItem, isUserReset: boolean) {
		filterIsDefault.set(detail.header, detail.isDefault);
		$allFiltersDefault = [...filterIsDefault.values()].every(Boolean);

		// Calling a server through the provided event handler
		if (detail.header.filter.mode === 'server') {
			if (!onFilter) {
				return;
			}

			const all = [...filterIsDefault.entries()].map(([header, isDefault]) => ({
				header,
				isDefault
			}));
			return onFilter(refreshDetail, { current: detail, all });
		}

		// Handling on the client side
		if (!isUserReset) {
			applyFilteringAndOrdering();
		}
	}

	function onSortChange(detail: InternalSortDetail) {
		$sorting = detail;

		// Calling a server through the provided event handler
		if (detail.header.sort.mode === 'server') {
			if (!onSort) {
				return;
			}

			const { id, ...sortDetail } = detail;
			return onSort(refreshDetail, sortDetail);
		}

		// Handling on the client side
		if (detail.header.sort.mode === 'auto') {
			sortItems();
		}
	}

	function onRefreshMount(resetFunction: () => void) {
		refreshReset.add(resetFunction);
	}

	function onRefreshDestroy(resetFunction: () => void) {
		refreshReset.delete(resetFunction);
	}

	function filterItems() {
		resetInternalItems();

		const filters = [...filterIsDefault.entries()].reduce(
			(acc, [header]) => {
				if (header.filter && header.filter.mode !== 'server') {
					acc.push(header.filter);
				}
				return acc;
			},
			[] as TableFilterHeader['filter'][]
		);

		// Converting the search to a filter, so it can be applied in one loop with the other filters.
		if (search) {
			const searchFilter = searchSettingsToFilter(search.settings, search.value);
			if (searchFilter) {
				filters.unshift(searchFilter);
			}
		}

		internalItems = internalItems.filter(({ data, index }) => {
			return filters.every((f) => {
				// Handling custom filters
				if (f.mode === 'custom') {
					return f.onFilter(data, index);
				}

				// Handling pre-made filters
				if (f.mode !== 'auto' || !f.value || (Array.isArray(f.value) && f.value.length === 0)) {
					return true;
				}

				const values: string[] = [];
				if (Array.isArray(f.property)) {
					f.property.forEach((prop) => {
						values.push(data[prop].toString());
					});
				} else {
					values.push(data[f.property].toString());
				}

				if (f.type === 'text') {
					if (f.settings?.caseSensitive) {
						return values.some((value) => value.includes(f.value!));
					}

					const filteValue = f.value.toLowerCase();
					return values.some((value) => value.toLowerCase().includes(filteValue));
				}
				if (f.type === 'multiSelect') {
					return values.some((value) => f.value!.some(({ name }) => name === value));
				}

				// If the filter type is not handled, don't filter out the item.
				return true;
			});
		});
	}

	function sortItems() {
		if (!($sorting && $sorting.header.sort.mode === 'auto' && $sorting.header.sort.property)) {
			return;
		}

		const { property } = $sorting.header.sort;
		const propChain = property.split('.');

		internalItems.sort((a, b) => {
			const aValue = propChain.reduce((acc, key) => acc[key], a.data);
			const bValue = propChain.reduce((acc, key) => acc[key], b.data);

			if (aValue === bValue) {
				return 0;
			}

			if ($sorting!.direction === 'asc') {
				return aValue > bValue ? 1 : -1;
			}

			return aValue < bValue ? 1 : -1;
		});
		internalItems = internalItems;
	}

	function resetRefreshButtonTimers() {
		refreshReset.forEach((reset) => reset());
	}

	async function refresh(handler?: RefreshHandler) {
		$internalState = 'loading';
		await handler?.(refreshDetail);
		resetRefreshButtonTimers();
		selected.clear();
		updateSelect();
		tableBodyElement?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
	}

	async function clearFilters() {
		$resetFlag = !$resetFlag;
		await tick();
		applyFilteringAndOrdering();
	}

	let flag = $state(false);

	function updateSelect(stopPropagation = false, skipSettingIsAllSelected = false) {
		selectedCount = selected.size;
		if (!skipSettingIsAllSelected) {
			isAllSelected = rowCount > 0 && selectedCount >= rowCount;
		}

		if (!stopPropagation && onSelect) {
			const items: SelectDetail = [];
			selected.forEach((index, item) => items.push({ item: $state.snapshot(item), index }));
			onSelect([...items]);
		}

		flag = !flag;
	}

	function onSelectorChange(isSelected: boolean, item: TableItem, index: number) {
		if (isSelected) {
			selected.set(item, index);
		} else {
			selected.delete(item);
		}
		updateSelect();
	}

	async function onAllSelectorChange() {
		internalItems.forEach(({ index, data }) => {
			if (rowDisabler?.($state.snapshot(data), index)) {
				selected.delete(data);
			} else {
				if (isAllSelected) {
					selected.set(data, index);
				} else {
					selected.delete(data);
				}
			}
		});

		updateSelect(undefined, true);
	}

	async function onScroll() {
		setVisibleIndicies();
		setBodyPadding();
	}

	function setVisibleIndicies() {
		if (!viewportElement) {
			return;
		}

		const { scrollTop, clientHeight } = viewportElement;

		const end = Math.min(
			rowCount,
			Math.ceil((scrollTop + clientHeight - headerHeight) / rowHeight) + overscan
		);
		if (end !== visibleRowIndex.end) {
			visibleRowIndex.end = end;
		}

		const start = Math.max(0, Math.floor((scrollTop - headerHeight) / rowHeight) - overscan);
		if (start !== visibleRowIndex.start) {
			if (start > end) {
				visibleRowIndex.start = end;
			} else {
				visibleRowIndex.start = start;
			}
		}

		if (end === rowCount && $internalState === 'idle' && !ignoreInfinite) {
			// The table has reached the end of the data.
			$internalState = 'loading';
			onInfinite?.(infiniteDetail);
		}
	}

	function setBodyPadding() {
		const top = visibleRowIndex.start * rowHeight;
		if (top !== bodyPadding.top) {
			bodyPadding.top = top;
		}

		const bottom = (rowCount - visibleRowIndex.end) * rowHeight;
		if (bottom !== bodyPadding.bottom) {
			bodyPadding.bottom = bottom;
		}
	}

	///////////////////////////////
	// Exported helper functions //
	///////////////////////////////

	export async function applyFilteringAndOrdering() {
		// Filtering
		filterItems();

		// Sorting
		sortItems();
		onScroll();
		// await tick();
		updateSelect(true);
	}

	/**
	 * Get the selected items.
	 * @returns An array of the selected items and their indicies.
	 */
	export function getSelectedItems(): { item: TableItem; index: number }[] {
		return [...selected.entries()].map(([item, index]) => ({ item: $state.snapshot(item), index }));
	}

	/**
	 * Get the current details of the search, filters, and sort.
	 * Useful for server-side handling, so state doesn't need to be synced constantly.
	 * @returns An object containing the search, filters, and sort details.
	 */
	export function getSearchFilterSort<T extends TableHeader[] = TableHeader[]>(): {
		search: SearchDetail | undefined;
		filters: FilterDetailItem<T[number]>[] | undefined;
		sort: SortDetail<T[number]> | undefined;
	} {
		let searchDetail: SearchDetail | undefined;
		let filtersDetail: FilterDetailItem<T[number]>[] | undefined;
		let sortDetail: SortDetail<T[number]> | undefined;

		if (search?.value) {
			searchDetail = { value: search.value };
		}

		if ($sorting) {
			const { id, ...sortingDetails } = $sorting;
			sortDetail = sortingDetails;
		}

		const filterEntries = [...filterIsDefault.entries()];
		if (filterEntries.length > 0) {
			filtersDetail = [...filterEntries].map(
				([header, isDefault]) =>
					({
						header,
						isDefault
					}) as FilterDetailItem<T[number]>
			);
		}

		return {
			search: searchDetail,
			filters: filtersDetail,
			sort: sortDetail
		};
	}

	/**
	 * Clear the selection of the rows.
	 */
	export function clearSelection(): void {
		selected.clear();
		isAllSelected = false;
		updateSelect();
	}

	/**
	 * Set the error message of the table.
	 */
	export function setError(error: string | Error | undefined): void {
		errorMessage = error?.toString() ?? '';

		if (errorMessage) {
			$internalState = 'error';
		} else if ($internalState === 'error') {
			// `completed` and `loading` states shouldn't be overwritten when the error is cleared.
			$internalState = 'idle';
		}
	}

	/**
	 * Mark the initial load as completed.
	 * This is needed when the `ignoreInfinite` prop is set to `true`.
	 */
	export function finishInitialLoad(): void {
		isInitialLoad = false;
	}
</script>

{#if debug}
	<div class="mb-4 flex flex-wrap items-center justify-center gap-4">
		<Button
			size="sm"
			onclick={() => {
				$internalState = 'loading';
				items = [];
			}}
		>
			Loading and empty
		</Button>
		<Button
			size="sm"
			onclick={() => {
				$internalState = 'completed';
				items = [];
			}}
		>
			Completed and empty
		</Button>
		<Button
			size="sm"
			onclick={() => {
				$internalState = 'error';
				items = [];
			}}
		>
			Errored and empty
		</Button>
		<Button
			size="sm"
			onclick={() => {
				$internalState = 'idle';
				items = [];
			}}
		>
			Idle and empty
		</Button>
	</div>
{/if}
<div class={twMerge('flex flex-col overflow-hidden rounded-md border text-sm', c)} {style}>
	{@render actions?.({ selectedCount })}
	<div bind:this={viewportElement} onscroll={onScroll} class="relative h-full overflow-auto">
		<table bind:this={$tableElement} class="w-full table-fixed border-spacing-2 text-slate-700">
			<thead bind:clientHeight={headerHeight} class="sticky left-0 top-0 z-10 w-full bg-white">
				<InfiniteTableRow header bind:selected={isAllSelected} onChange={onAllSelectorChange}>
					{@render headers?.()}
				</InfiniteTableRow>
			</thead>
			<tbody
				bind:this={tableBodyElement}
				class="will-change-transform [-webkit-overflow-scrolling:touch]
				before:block before:h-[var(--paddingTop)] after:block after:h-[var(--paddingBottom)]"
				style="--paddingTop: {bodyPadding.top}px; --paddingBottom: {bodyPadding.bottom}px;"
			>
				{#each internalItems as { data, index }, position}
					{#if position >= visibleRowIndex.start && position < visibleRowIndex.end}
						{#key flag}
							<InfiniteTableRow
								onChange={(isSelected) => onSelectorChange(isSelected, data, index)}
								selected={selected.has(data)}
								disabled={rowDisabler?.(data, index) ?? false}
								disabledMessage={disabledRowMessage}
							>
								{@render children?.({
									item: data,
									index,
									selectedCount,
									isAllSelected
								})}
							</InfiniteTableRow>
						{/key}
					{/if}
					{#if position === internalItems.length - 1}
						<tr>
							<td colspan={viewportElement?.querySelectorAll('th')?.length || 1}>
								{#if $internalState === 'loading'}
									{#if loader}
										{@render loader?.()}
									{:else}
										<div
											class="flex h-12 items-center justify-center overflow-hidden pb-2 text-center text-gray-600"
										>
											<LoaderCircle size={16} class="animate-spin" />
											<span class="pl-2">Loading</span>
										</div>
									{/if}
								{/if}
								{#if $internalState === 'completed'}
									{#if completed}
										{@render completed?.()}
									{:else}
										<div
											class="flex h-12 items-center justify-center overflow-hidden pb-2 text-center text-gray-600"
										>
											No more items to load
										</div>
									{/if}
								{/if}
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
		{#if rowCount === 0 && items.length > 0}
			<!-- Table has items, but they are filtered out -->
			{#if empty}
				{@render empty?.()}
			{:else}
				<div
					class="sticky left-0 top-0 z-10 flex w-full flex-col items-center
					justify-center gap-2 text-center text-gray-600"
					style="height: calc(100% - {headerHeight}px);"
				>
					<Search size={32} />
					<p class="text-center font-medium">No items found</p>
				</div>
			{/if}
		{:else if items.length === 0}
			<div
				class="sticky left-0 top-0 z-10 flex w-full flex-col items-center
				justify-center gap-2 text-center text-gray-600"
				style="height: calc(100% - {headerHeight}px);"
			>
				{#if $internalState === 'loading' || isInitialLoad || !isMounted}
					<!-- Table is loading it's initial items -->
					{#if loadingEmpty}
						{@render loadingEmpty?.()}
					{:else}
						<LoaderCircle size={32} class="animate-spin" />
						<p class="text-center font-medium">Loading</p>
					{/if}
				{:else if $internalState === 'completed'}
					<!-- Table is completed and empty -->
					{#if completedEmpty}
						{@render completedEmpty?.()}
					{:else}
						<Check size={32} />
						<p class="text-center font-medium">No items to display</p>
					{/if}
				{:else if $internalState === 'error'}
					<!-- Table has an error and empty -->
					{#if errorEmpty}
						{@render errorEmpty?.()}
					{:else}
						<TriangleAlert size={32} />
						<p class="text-center font-medium">{errorMessage || 'An unknown error occurred'}</p>
					{/if}
				{:else}
					<!-- Table is idle and empty -->
					{#if idleEmpty}
						{@render idleEmpty?.()}
					{:else}
						<Search size={32} />
						<p class="text-center font-medium">No items to display</p>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</div>
{#if rowsDetail}
	{@render rowsDetail?.({ rowCount, selectedCount })}
{:else}
	<p class="my-1 text-sm text-gray-500">
		{rowCount} row{rowCount === 1 ? '' : 's'} shown{#if selectable}, {selectedCount} selected{/if}
	</p>
{/if}
{#if errorMessage}
	{#if error}
		{@render error?.({ message: errorMessage })}
	{:else}
		<div class="text-red-700">
			{errorMessage}
		</div>
	{/if}
{/if}
