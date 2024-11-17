<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import Check from 'lucide-svelte/icons/check';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import RotateCW from 'lucide-svelte/icons/rotate-cw';
	import Search from 'lucide-svelte/icons/search';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import X from 'lucide-svelte/icons/x';
	import { createEventDispatcher, onMount, setContext, tick } from 'svelte';
	import { writable } from 'svelte/store';
	import { twMerge } from 'tailwind-merge';
	import { Button } from '../components/ui/button/index.js';
	import { INFINITE_TABLE_CONTEXT_KEY, type InfiniteTableContext } from './context.js';
	import InfiniteTableRow from './infinitable-row.svelte';
	import InfiniteTableSearch from './infinitable-search.svelte';
	import type {
		FilterChangeEventParam,
		InfiniteEventParam,
		RefreshEventParam,
		SearchEventParam,
		SelectChangeEventParam,
		SortingChangeEventParam,
		TableFilterHeader,
		TableItem,
		TableSearchSettings
	} from './types.js';
	import { createTickingRelativeTime, searchSettingsToFilter } from './utils.svelte.js';

	/**
	 * The items to display in the table.
	 *
	 * If all of the items are loaded ahead of time,
	 * set `ignoreInfinite` to `true` and call `finishInitialLoad()`
	 * when the initial load is completed.
	 *
	 * @default []
	 */
	export let items: TableItem[] = [];
	/** The height of each row in pixels. */
	export let rowHeight: number;
	/**
	 * Controls whether the table rows are selectable or not.
	 *
	 * @default false
	 */
	export let selectable = false;
	/**
	 * Controls whether the table has a "refresh" button or not.
	 *
	 * @default false
	 */
	export let refreshable = false;
	/**
	 * Controls whether the table has a search bar or not.
	 *
	 * @default undefined
	 */
	export let search: TableSearchSettings | undefined = undefined;
	/**
	 * The number of rows to render above and below the visible area of the table.
	 * Also controls how early the table will dispatch a "reached end" event.
	 *
	 * @default 10
	 */
	export let overscan = 10;
	let c = '';
	export { c as class };
	/**
	 * A function that takes an item and an index as parameters,
	 * and returns a boolean indicating whether the row
	 * at that index should be disabled or not.
	 * @param item The item data.
	 * @param index The index of the row.
	 *
	 * @default undefined
	 */
	export let rowDisabler: ((item: TableItem, index: number) => boolean) | undefined = undefined;
	/**
	 * The text that will be displayed when the checkbox of a disabled row is hovered.
	 *
	 * @default undefined
	 */
	export let disabledRowMessage: string | undefined = undefined;
	/**
	 * Controls whether the `infinite` event is dispatched or not.
	 * Useful to set to `true` if you know that you are going to load all the data at once.
	 *
	 * If set to `true`, call `finishInitialLoad()` when the initial load is completed.
	 *
	 * @default false
	 */
	export let ignoreInfinite = false;

	const dispatch = createEventDispatcher<{
		refresh: RefreshEventParam;
		search: SearchEventParam;
		/** Dispatches the selected items. */
		select: SelectChangeEventParam;
		/** Dispatched when the table has reached the end of the data. */
		infinite: InfiniteEventParam;
	}>();

	const filterIsDefault = new Map<TableFilterHeader, boolean>();
	const selected = new Set<TableItem>();
	const allSelected = writable(false);
	const resetFlag = writable(false);
	const visibleRowIndex = writable({
		start: 0,
		end: 0
	});
	const headerHeight = 39;
	const bodyPadding = {
		top: 0,
		bottom: 0
	};
	const tableElement = writable<HTMLTableElement | undefined>();

	let internalItems: { data: TableItem; index: number }[] = [];
	let viewport: HTMLElement;
	let actionRow: HTMLElement;
	let tableBody: HTMLTableSectionElement;
	let filterable = false;
	let allFiltersDefault = true;
	let isAllSelectorChecked = false;
	let rowCount = 0;
	let selectedCount = 0;
	let searchValue = '';
	let sorting = writable<SortingChangeEventParam | undefined>(undefined);
	let isMounted = false;
	let errorMessage = '';
	let state: 'idle' | 'loading' | 'completed' | 'error' = 'idle';
	let lastRefresh: ReturnType<typeof createTickingRelativeTime> | undefined;
	let isInitialLoad = ignoreInfinite;

	setContext<InfiniteTableContext>(INFINITE_TABLE_CONTEXT_KEY, {
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

	$: if (items) {
		resetLastRefresh();
		applyFilteringAndOrdering();
	}
	$: if (isMounted) {
		rowHeight;
		onScroll();
	}

	onMount(() => {
		isMounted = true;
	});

	function resetInternalItems() {
		internalItems = items.map((data, index) => ({ data, index }));
	}

	function onSearchChange(value: string) {
		searchValue = value;
		if (search?.type === 'server') {
			state = 'loading';
			search.onSearch({ value, ...refreshEventHandlers });
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

	function onFilterChange(detail: FilterChangeEventParam) {
		filterIsDefault.set(detail.header, detail.isDefault);
		allFiltersDefault = [...filterIsDefault.values()].every(Boolean);
		if (!detail.isAllReset) {
			applyFilteringAndOrdering();
		}
	}

	function onSortChange(detail: SortingChangeEventParam) {
		$sorting = detail;
		sortItems();
	}

	function filterItems() {
		resetInternalItems();

		const filters = filterIsDefault
			.entries()
			.toArray()
			.map(([header]) => ({ ...header.filter }));

		// Converting the search to a filter, so it can be applied in one loop with the other filters.
		const searchFilter = searchSettingsToFilter(search, searchValue);
		if (searchFilter) {
			filters.unshift(searchFilter);
		}

		internalItems = internalItems.filter(({ data, index }) => {
			return filters.every((f) => {
				// Handling custom filters
				if (f.type === 'custom') {
					return f.onFilter(data, index);
				}

				// Handling pre-made filters
				if (!f.value || (Array.isArray(f.value) && f.value.length === 0)) {
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
		if (!($sorting && $sorting.property)) {
			return;
		}

		internalItems.sort((a, b) => {
			const propChain = $sorting!.property.split('.');
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
		state = 'loading';
		resetLastRefresh();
		dispatch('refresh', refreshEventHandlers);
		selected.clear();
		updateSelect();
		tableBody.scrollTo({ top: 0, left: 0, behavior: 'instant' });
	}

	async function clearFilters() {
		$resetFlag = !$resetFlag;
		await tick();
		applyFilteringAndOrdering();
	}

	function updateSelect(skipDispatch = false) {
		selectedCount = selected.size;
		isAllSelectorChecked = rowCount > 0 && selectedCount >= rowCount;
		!skipDispatch && dispatch('select', [...selected]);
	}

	function onSelectorChange(isSelected: boolean, item: TableItem) {
		selected[isSelected ? 'add' : 'delete'](item);
		updateSelect();
	}

	async function onAllSelectorChange({ detail }: CustomEvent<boolean>) {
		if ($allSelected === detail) {
			// Setting $allSelected to the same value as it was before will not trigger a change,
			// so we need to change it to a different value first.
			$allSelected = !detail;
			await tick();
		}

		$allSelected = isAllSelectorChecked = detail;
		const action = selected[detail ? 'add' : 'delete'].bind(selected);

		internalItems.forEach(({ index, data }) => {
			if (rowDisabler?.(data, index)) {
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
		if (!viewport) {
			return;
		}

		const { scrollTop, clientHeight } = viewport;

		const end = Math.min(
			rowCount,
			Math.ceil((scrollTop + clientHeight - headerHeight) / rowHeight) + overscan
		);
		if (end !== $visibleRowIndex.end) {
			$visibleRowIndex.end = end;
		}

		const start = Math.max(0, Math.floor((scrollTop - headerHeight) / rowHeight) - overscan);
		if (start !== $visibleRowIndex.start) {
			if (start > end) {
				$visibleRowIndex.start = end;
			} else {
				$visibleRowIndex.start = start;
			}
		}

		if (end === rowCount && state === 'idle' && !ignoreInfinite) {
			// The table has reached the end of the data.
			state = 'loading';
			dispatch('infinite', infiniteEventHandlers);
		}
	}

	function setBodyPadding() {
		const top = $visibleRowIndex.start * rowHeight;
		if (top !== bodyPadding.top) {
			bodyPadding.top = top;
		}

		const bottom = (rowCount - $visibleRowIndex.end) * rowHeight;
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
		return items.reduce<ReturnType<typeof getSelectedItems>>((acc, item, index) => {
			if (selected.has(item)) {
				acc.push({ item, index });
			}
			return acc;
		}, []);
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
			state = 'error';
		} else if (state === 'error') {
			// `completed` and `loading` states shouldn't be overwritten when the error is cleared.
			state = 'idle';
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

	const infiniteEventHandlers: InfiniteEventParam = {
		loaded: (newItems: TableItem[]) => {
			state = 'idle';
			errorMessage = '';
			items = [...items, ...newItems];
		},
		completed: (newItems: TableItem[]) => {
			state = 'completed';
			errorMessage = '';
			items = [...items, ...newItems];
		},
		error: (message?: string) => {
			state = 'error';
			errorMessage = message ?? 'An error occurred while loading items';
		}
	};

	const refreshEventHandlers: RefreshEventParam = {
		loaded: (i: TableItem[]) => {
			state = 'idle';
			errorMessage = '';
			items = [...i];
		},
		completed: (i: TableItem[]) => {
			state = 'completed';
			errorMessage = '';
			items = [...i];
		},
		error: (message?: string) => {
			state = 'error';
			errorMessage = message ?? 'An error occurred while loading items';
		}
	};
</script>

<div class="flex flex-wrap items-center justify-center gap-4">
	<Button
		size="sm"
		on:click={() => {
			state = 'loading';
			items = [];
		}}
	>
		Loading and empty
	</Button>
	<Button
		size="sm"
		on:click={() => {
			state = 'completed';
			items = [];
		}}
	>
		Completed and empty
	</Button>
	<Button
		size="sm"
		on:click={() => {
			state = 'error';

			items = [];
		}}
	>
		Errored and empty
	</Button>
	<Button
		size="sm"
		on:click={() => {
			state = 'idle';
			items = [];
		}}
	>
		Idle and empty
	</Button>
</div>
<div class={twMerge('flex flex-col text-sm', c)}>
	<div
		bind:this={actionRow}
		class="flex flex-wrap items-center justify-start gap-4
		rounded-t-md border !border-b-0 bg-gray-50 px-2 py-2"
	>
		{#if search}
			<div class="grow">
				<InfiniteTableSearch bind:value={searchValue} settings={search} onSearch={onSearchChange} />
			</div>
		{/if}
		<div class="flex flex-wrap items-center justify-start gap-1">
			<slot name="actionsStart" wrapper={actionRow} />
			{#if refreshable}
				<Tooltip.Root>
					<Tooltip.Trigger asChild let:builder>
						<Button
							builders={[builder]}
							variant="ghost"
							on:click={refresh}
							disabled={state === 'loading'}
						>
							<RotateCW size={16} class={state === 'loading' ? 'animate-spin' : ''} />
							<span class="pl-2"> Refresh </span>
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p class="pt-0.5 text-xs text-gray-500">
							Refreshed {lastRefresh?.value}
						</p>
					</Tooltip.Content>
				</Tooltip.Root>
			{/if}
			{#if filterable}
				<Button variant="ghost" on:click={clearFilters} disabled={allFiltersDefault}>
					<X size={16} />
					<span class="pl-2">Clear filters</span>
				</Button>
			{/if}
			<slot name="actionsEnd" wrapper={actionRow} />
		</div>
	</div>
	<div
		bind:this={viewport}
		on:scroll={onScroll}
		class="relative h-full overflow-auto rounded-b-md border"
	>
		<table bind:this={$tableElement} class="w-full table-fixed border-spacing-2 text-slate-700">
			<thead class="sticky left-0 top-0 z-10 w-full bg-white">
				<InfiniteTableRow
					index={0}
					header
					selected={isAllSelectorChecked}
					on:change={onAllSelectorChange}
				>
					<slot name="headers" />
				</InfiniteTableRow>
			</thead>
			<tbody
				bind:this={tableBody}
				class="will-change-transform [-webkit-overflow-scrolling:touch]
				before:block before:h-[var(--paddingTop)] after:block after:h-[var(--paddingBottom)]"
				style="--paddingTop: {bodyPadding.top}px; --paddingBottom: {bodyPadding.bottom}px;"
			>
				{#each internalItems as { data, index }, position}
					{#if position >= $visibleRowIndex.start && position < $visibleRowIndex.end}
						<InfiniteTableRow
							on:change={({ detail }) => onSelectorChange(detail, data)}
							selected={selected.has(data)}
							disabled={rowDisabler?.(data, index) ?? false}
							disabledMessage={disabledRowMessage}
						>
							<slot item={data} {index} {selectedCount} allSelected={isAllSelectorChecked} />
						</InfiniteTableRow>
					{/if}
					{#if position === internalItems.length - 1}
						<tr>
							<td colspan={viewport?.querySelectorAll('th')?.length || 1}>
								{#if state === 'loading'}
									<slot name="loader">
										<div
											class="flex h-12 items-center justify-center overflow-hidden pb-2 text-center text-gray-600"
										>
											<LoaderCircle size={16} class="animate-spin" />
											<span class="pl-2">Loading</span>
										</div>
									</slot>
								{/if}
								{#if state === 'completed'}
									<slot name="completed">
										<div
											class="flex h-12 items-center justify-center overflow-hidden pb-2 text-center text-gray-600"
										>
											No more items to load
										</div>
									</slot>
								{/if}
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
		{#if rowCount === 0 && items.length > 0}
			<!-- Table has items, but they are filtered out -->
			<slot name="empty">
				<div
					class="sticky left-0 top-0 z-10 flex w-full flex-col items-center
					justify-center gap-2 text-center text-gray-600"
					style="height: calc(100% - {headerHeight}px);"
				>
					<Search size={32} />
					<p class="text-center font-medium">No items found</p>
				</div>
			</slot>
		{:else if items.length === 0}
			<div
				class="sticky left-0 top-0 z-10 flex w-full flex-col items-center
				justify-center gap-2 text-center text-gray-600"
				style="height: calc(100% - {headerHeight}px);"
			>
				{#if state === 'loading' || isInitialLoad}
					<!-- Table is loading it's initial items -->
					<slot name="loadingEmpty">
						<LoaderCircle size={32} class="animate-spin" />
						<p class="text-center font-medium">Loading</p>
					</slot>
				{:else if state === 'completed'}
					<!-- Table is completed and empty -->
					<slot name="completedEmpty">
						<Check size={32} />
						<p class="text-center font-medium">No items to display</p>
					</slot>
				{:else if state === 'error'}
					<!-- Table has an error and empty -->
					<slot name="errorEmpty">
						<TriangleAlert size={32} />
						<p class="text-center font-medium">{errorMessage || 'An unknown error occurred'}</p>
					</slot>
				{:else}
					<!-- Table is idle and empty -->
					<slot name="idleEmpty">
						<Search size={32} />
						<p class="text-center font-medium">No items to display</p>
					</slot>
				{/if}
			</div>
		{/if}
	</div>
	<slot name="rowsDetail" {rowCount} {selectedCount}>
		<p class="my-1 text-sm text-gray-500">
			{rowCount} row{rowCount === 1 ? '' : 's'} shown, {selectedCount} selected
		</p>
	</slot>
	{#if errorMessage}
		<slot name="error">
			<div class="text-red-700">
				{errorMessage}
			</div>
		</slot>
	{/if}
</div>
