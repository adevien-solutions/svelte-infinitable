<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import Check from 'lucide-svelte/icons/check';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import RotateCW from 'lucide-svelte/icons/rotate-cw';
	import Search from 'lucide-svelte/icons/search';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import X from 'lucide-svelte/icons/x';
	import { onMount, tick, untrack, type Snippet } from 'svelte';
	import { writable } from 'svelte/store';
	import { twMerge } from 'tailwind-merge';
	import { Button } from '../components/ui/button/index.js';
	import { InfinitableRunMode, setInfiniteTableContext } from './context.js';
	import InfiniteTableRow from './infinitable-row.svelte';
	import InfiniteTableSearch from './infinitable-search.svelte';
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
	} from './types.js';
	import { createTickingRelativeTime, searchSettingsToFilter } from './utils.svelte.js';

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
		 * Controls whether the searching, filtering, and sorting of the table
		 * is done on the client or not. If set to `true`, the `onSearch`,
		 * `onFilter`, and `onSort` callbacks are ignored, and the component
		 * will handle all of them.
		 *
		 * @default false
		 */
		clientMode?: boolean;
		/**
		 * Controls whether the table rows are selectable or not.
		 *
		 * @default false
		 */
		selectable?: boolean;
		/**
		 * Controls whether the table has a "refresh" button or not.
		 *
		 * @default false
		 */
		refreshable?: boolean;
		/**
		 * Controls whether the table has a search bar or not.
		 *
		 * @default undefined
		 */
		search?: TableSearchSettings | undefined;
		/**
		 * The number of rows to render above and below the visible area of the table.
		 * Also controls how early the table will call the `onInfinite` function.
		 *
		 * @default 10
		 */
		overscan?: number;
		/**
		 * Classes to apply to the table wrapper element.
		 *
		 * @default ''
		 */
		class?: string;
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
		 * Controls whether the `onInfinite` function is called or not.
		 * Useful to set to `true` if you know that you are going to load all the data at once.
		 *
		 * If set to `true`, call `finishInitialLoad()` on the table component
		 * when the initial load is completed.
		 *
		 * @default false
		 */
		ignoreInfinite?: boolean;

		/*******
		 * Events
		 ********/

		/** Called when the user clicks the refresh button. */
		onRefresh?: RefreshHandler | undefined;
		/** Called when the table has reached the end of the loaded data. */
		onInfinite?: InfiniteHandler | undefined;
		/** Called when the user types in the search input, and it's in `server` mode. */
		onSearch?: SearchHandler | undefined;
		/** Called when the filtering of the table changes, and it's in `server` mode. */
		onFilter?: FilterHandler | undefined;
		/** Called when the sorting of the table changes, and it's in `server` mode. */
		onSort?: SortHandler | undefined;
		/** Called when the selected items change. */
		onSelect?: SelectHandler | undefined;

		/******
		 * Slots
		 *******/

		children?: Snippet<
			[{ item: TableItem; index: number; selectedCount: number; isAllSelected: boolean }]
		>;
		actionsStart?: Snippet<[{ wrapper: HTMLElement }]>;
		actionsEnd?: Snippet<[{ wrapper: HTMLElement }]>;
		headers?: Snippet;
		loader?: Snippet;
		completed?: Snippet;
		empty?: Snippet;
		loadingEmpty?: Snippet;
		completedEmpty?: Snippet;
		errorEmpty?: Snippet;
		idleEmpty?: Snippet;
		rowsDetail?: Snippet<[{ rowCount: number; selectedCount: number }]>;
		error?: Snippet<[{ message: string }]>;
	};

	let {
		items = $bindable([]),
		rowHeight,
		selectable = false,
		refreshable = false,
		search = undefined,
		overscan = 10,
		class: c = '',
		rowDisabler = undefined,
		disabledRowMessage = undefined,
		ignoreInfinite = false,
		// Events
		onRefresh = undefined,
		onInfinite = undefined,
		onSearch = undefined,
		onFilter = undefined,
		onSort = undefined,
		onSelect = undefined,
		// Slots
		children,
		actionsStart,
		actionsEnd,
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
	const selected = new Set<TableItem>();
	const allSelected = writable(false);
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
	let actionRowElement = $state<HTMLElement>();
	let headerHeight = $state(0);
	let tableBodyElement = $state<HTMLTableSectionElement>();
	let filterable = $state(false);
	let allFiltersDefault = $state(true);
	let isAllSelectorChecked = $state(false);
	let rowCount = $state(0);
	let selectedCount = $state(0);
	let searchValue = $state('');
	let sorting = writable<InternalSortDetail | undefined>(undefined);
	let errorMessage = $state('');
	let internalState = $state<'idle' | 'loading' | 'completed' | 'error'>('idle');
	let lastRefresh = $state<ReturnType<typeof createTickingRelativeTime>>();
	let isInitialLoad = $state(ignoreInfinite);
	let isMounted = $state(false);

	setInfiniteTableContext({
		element: {
			table: { subscribe: tableElement.subscribe }
		},
		selectable,
		allSelected: { subscribe: allSelected.subscribe },
		sorting: {
			subscribe: sorting.subscribe
		},
		onFilterMount,
		onFilterDestroy,
		onFilterChange,
		onSortChange,
		resetFlag: { subscribe: resetFlag.subscribe }
	});

	$effect(() => {
		items;
		if (isMounted) {
			untrack(() => {
				resetLastRefresh();
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

		return () => {
			lastRefresh?.cancel();
		};
	});

	function resetInternalItems() {
		internalItems = items.map((data, index) => ({ data, index }));
	}

	async function onSearchChange(value: string) {
		searchValue = value;
		if (search?.mode === 'server') {
			internalState = 'loading';
			await onSearch?.({ value }, refreshEventHandlers);
			return;
		}
		applyFilteringAndOrdering();
	}

	function onFilterMount(filterHeader: TableFilterHeader) {
		filterIsDefault.set(filterHeader, true);
		filterable = filterIsDefault.size > 0;
	}

	function onFilterDestroy(filterHeader: TableFilterHeader) {
		filterIsDefault.delete(filterHeader);
		filterable = filterIsDefault.size > 0;
		allFiltersDefault = [...filterIsDefault.values()].every(Boolean);
		applyFilteringAndOrdering();
	}

	function onFilterChange(detail: FilterDetailItem, isUserReset: boolean) {
		filterIsDefault.set(detail.header, detail.isDefault);
		allFiltersDefault = [...filterIsDefault.values()].every(Boolean);

		// Calling a server through the provided event handler
		if (detail.header.filter.mode === 'server') {
			if (!onFilter) {
				return;
			}

			const all = [...filterIsDefault.entries()].map(([header, isDefault]) => ({
				header,
				isDefault
			}));
			return onFilter({ current: detail, all }, refreshEventHandlers);
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
			return onSort(sortDetail, refreshEventHandlers);
		}

		// Handling on the client side
		if (detail.header.sort.mode === 'auto') {
			sortItems();
		}
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
		const searchFilter = searchSettingsToFilter(search, searchValue);
		if (searchFilter) {
			filters.unshift(searchFilter);
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

	function resetLastRefresh() {
		lastRefresh?.cancel();
		lastRefresh = createTickingRelativeTime(new Date());
	}

	function refresh() {
		internalState = 'loading';
		resetLastRefresh();
		onRefresh?.(refreshEventHandlers);
		selected.clear();
		updateSelect();
		tableBodyElement?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
	}

	async function clearFilters() {
		$resetFlag = !$resetFlag;
		await tick();
		applyFilteringAndOrdering();
	}

	function updateSelect(skipDispatch = false) {
		selectedCount = selected.size;
		isAllSelectorChecked = rowCount > 0 && selectedCount >= rowCount;
		if (!skipDispatch && onSelect) {
			const items: SelectDetail = [];
			selected.forEach((item) => items.push($state.snapshot(item)));
			onSelect([...items]);
		}
	}

	function onSelectorChange(isSelected: boolean, item: TableItem) {
		selected[isSelected ? 'add' : 'delete'](item);
		updateSelect();
	}

	async function onAllSelectorChange(isAllSelected: boolean) {
		if ($allSelected === isAllSelected) {
			// Setting $allSelected to the same value as it was before will not trigger a change,
			// so we need to change it to a different value first.
			$allSelected = !isAllSelected;
			await tick();
		}

		$allSelected = isAllSelectorChecked = isAllSelected;
		const action = selected[isAllSelected ? 'add' : 'delete'].bind(selected);

		internalItems.forEach(({ index, data }) => {
			if (rowDisabler?.($state.snapshot(data), index)) {
				selected.delete(data);
			} else {
				action(data);
			}
		});

		updateSelect();
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

		if (end === rowCount && internalState === 'idle' && !ignoreInfinite) {
			// The table has reached the end of the data.
			internalState = 'loading';
			onInfinite?.(infiniteEventHandlers);
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

	export function applyFilteringAndOrdering() {
		// Filtering
		filterItems();
		rowCount = internalItems.length;

		// Sorting
		sortItems();
		onScroll();
		updateSelect(true);
	}

	/**
	 * Get the selected items.
	 * @returns An array of the selected items and their indicies.
	 */
	export function getSelectedItems(): { item: TableItem; index: number }[] {
		return items.reduce<ReturnType<typeof getSelectedItems>>((acc, data, index) => {
			if (selected.has(data)) {
				const item = $state.snapshot(data);
				acc.push({ item, index });
			}
			return acc;
		}, []);
	}

	/**
	 * Get the current details of the search, filters, and sort.
	 * Useful for server-side handling, so state doesn't need to be synced constantly.
	 * @returns An object containing the search, filters, and sort details.
	 */
	export function getSearchFilterSort<T extends TableHeader[] = TableHeader[]>(): {
		search: SearchDetail;
		filters: FilterDetailItem[];
		sort: SortDetail<T[number]> | undefined;
	} {
		let sort: SortDetail<T[number]> | undefined;
		if ($sorting) {
			const { id, ...sortingDetails } = $sorting;
			sort = sortingDetails;
		}
		return {
			search: { value: searchValue ?? '' },
			filters: [...filterIsDefault.entries()].map(
				([header, isDefault]) =>
					({
						header,
						isDefault
					}) as FilterDetailItem
			),
			sort
		};
	}

	/**
	 * Clear the selection of the rows.
	 */
	export function clearSelection(): void {
		selected.clear();
		$allSelected = isAllSelectorChecked = false;
		updateSelect();
	}

	/**
	 * Set the error message of the table.
	 */
	export function setError(error: string | Error | undefined): void {
		errorMessage = error?.toString() ?? '';

		if (errorMessage) {
			internalState = 'error';
		} else if (internalState === 'error') {
			// `completed` and `loading` states shouldn't be overwritten when the error is cleared.
			internalState = 'idle';
		}
	}

	/**
	 * Mark the initial load as completed.
	 * This is needed when the `ignoreInfinite` prop is set to `true`.
	 */
	export function finishInitialLoad(): void {
		isInitialLoad = false;
	}

	/////////////////////////////////////////////
	// Functions passed to the "infinte" event //
	/////////////////////////////////////////////

	const infiniteEventHandlers: InfiniteDetail = {
		loaded: (newItems: TableItem[]) => {
			internalState = 'idle';
			errorMessage = '';
			items = [...items, ...newItems];
		},
		completed: (newItems: TableItem[]) => {
			internalState = 'completed';
			errorMessage = '';
			items = [...items, ...newItems];
		},
		error: (message?: string) => {
			internalState = 'error';
			errorMessage = message ?? 'An error occurred while loading items';
		}
	};

	const refreshEventHandlers: RefreshDetail = {
		loaded: (i: TableItem[]) => {
			internalState = 'idle';
			errorMessage = '';
			items = [...i];
		},
		completed: (i: TableItem[]) => {
			internalState = 'completed';
			errorMessage = '';
			items = [...i];
		},
		error: (message?: string) => {
			internalState = 'error';
			errorMessage = message ?? 'An error occurred while loading items';
		}
	};
</script>

{#if import.meta?.env?.PUBLIC_INFINITABLE_MODE === InfinitableRunMode.DEBUG}
	<div class="mb-4 flex flex-wrap items-center justify-center gap-4">
		<Button
			size="sm"
			onclick={() => {
				internalState = 'loading';
				items = [];
			}}
		>
			Loading and empty
		</Button>
		<Button
			size="sm"
			onclick={() => {
				internalState = 'completed';
				items = [];
			}}
		>
			Completed and empty
		</Button>
		<Button
			size="sm"
			onclick={() => {
				internalState = 'error';
				items = [];
			}}
		>
			Errored and empty
		</Button>
		<Button
			size="sm"
			onclick={() => {
				internalState = 'idle';
				items = [];
			}}
		>
			Idle and empty
		</Button>
	</div>
{/if}
<div class={twMerge('flex flex-col text-sm', c)}>
	<div
		bind:this={actionRowElement}
		class="flex flex-wrap items-center justify-start gap-4
		rounded-t-md border !border-b-0 bg-gray-50 px-2 py-2"
	>
		{#if search}
			<div class="grow">
				<InfiniteTableSearch bind:value={searchValue} settings={search} onSearch={onSearchChange} />
			</div>
		{/if}
		<div class="flex flex-wrap items-center justify-start gap-1">
			{@render actionsStart?.({ wrapper: actionRowElement })}
			{#if refreshable}
				<Tooltip.Provider delayDuration={200}>
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="ghost"
									onclick={refresh}
									disabled={internalState === 'loading'}
								>
									<RotateCW size={16} class={internalState === 'loading' ? 'animate-spin' : ''} />
									<span> Refresh </span>
								</Button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content class="font-normal">
							<p>
								Refreshed {lastRefresh?.value}
							</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			{/if}
			{#if filterable}
				<Button variant="ghost" onclick={clearFilters} disabled={allFiltersDefault}>
					<X size={16} />
					<span>Clear filters</span>
				</Button>
			{/if}
			{@render actionsEnd?.({ wrapper: actionRowElement })}
		</div>
	</div>
	<div
		bind:this={viewportElement}
		onscroll={onScroll}
		class="relative h-full overflow-auto rounded-b-md border"
	>
		<table bind:this={$tableElement} class="w-full table-fixed border-spacing-2 text-slate-700">
			<thead bind:clientHeight={headerHeight} class="sticky left-0 top-0 z-10 w-full bg-white">
				<InfiniteTableRow
					index={0}
					header
					selected={isAllSelectorChecked}
					onChange={onAllSelectorChange}
				>
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
						<InfiniteTableRow
							onChange={(isSelected) => onSelectorChange(isSelected, data)}
							selected={selected.has(data)}
							disabled={rowDisabler?.(data, index) ?? false}
							disabledMessage={disabledRowMessage}
						>
							{@render children?.({
								item: data,
								index,
								selectedCount,
								isAllSelected: isAllSelectorChecked
							})}
						</InfiniteTableRow>
					{/if}
					{#if position === internalItems.length - 1}
						<tr>
							<td colspan={viewportElement?.querySelectorAll('th')?.length || 1}>
								{#if internalState === 'loading'}
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
								{#if internalState === 'completed'}
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
				{#if internalState === 'loading' || isInitialLoad || !isMounted}
					<!-- Table is loading it's initial items -->
					{#if loadingEmpty}
						{@render loadingEmpty?.()}
					{:else}
						<LoaderCircle size={32} class="animate-spin" />
						<p class="text-center font-medium">Loading</p>
					{/if}
				{:else if internalState === 'completed'}
					<!-- Table is completed and empty -->
					{#if completedEmpty}
						{@render completedEmpty?.()}
					{:else}
						<Check size={32} />
						<p class="text-center font-medium">No items to display</p>
					{/if}
				{:else if internalState === 'error'}
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
	{#if rowsDetail}
		{@render rowsDetail?.({ rowCount, selectedCount })}
	{:else}
		<p class="my-1 text-sm text-gray-500">
			{rowCount} row{rowCount === 1 ? '' : 's'} shown, {selectedCount} selected
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
</div>
