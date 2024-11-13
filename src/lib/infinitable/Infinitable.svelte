<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { createEventDispatcher, onMount, setContext, tick } from 'svelte';
	import { writable } from 'svelte/store';
	import { twMerge } from 'tailwind-merge';
	import { Button } from '../components/ui/button/index.js';
	import { INFINITE_TABLE_CONTEXT_KEY, type InfiniteTableContext } from './context.js';
	import InfiniteTableAction from './InfinitableAction.svelte';
	import InfiniteTableRow from './InfinitableRow.svelte';
	import InfiniteTableSearch from './InfinitableSearch.svelte';
	import type {
		FilterChangeEventDetail,
		InfiniteEventDetail,
		RefreshEventDetail,
		SelectChangeEventDetail,
		SortingChangeEventDetail,
		TableFilterHeader,
		TableItem,
		TableSearchSettings
	} from './types.js';
	import { createTickingRelativeTime, searchSettingsToFilter } from './utils.svelte.js';

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
	 */
	export let overscan = 10;
	let c = '';
	export { c as class };
	/**
	 * A function that takes an index and returns a boolean indicating whether the row
	 * at that index should be disabled or not.
	 * @param index The index of the row.
	 */
	export let rowDisabler: ((item: TableItem, index: number) => boolean) | undefined = undefined;
	/** The text that will be displayed when the checkbox of a disabled row is hovered. */
	export let disabledRowMessage: string | undefined = undefined;
	/**
	 * Controls whether the `infinite` event is dispatched or not.
	 * Useful to set to `true` if you know that you are going to load all the data at once.
	 */
	export let ignoreInfinite = false;

	const dispatch = createEventDispatcher<{
		refresh: RefreshEventDetail;
		/** Dispatches the selected items. */
		select: SelectChangeEventDetail;
		/** Dispatched when the table has reached the end of the data. */
		infinite: InfiniteEventDetail;
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
	let tableBody: HTMLTableSectionElement;
	let allFiltersDefault = true;
	let isAllSelectorChecked = false;
	let rowCount = 0;
	let selectedCount = 0;
	let searchValue = '';
	let sorting = writable<SortingChangeEventDetail | undefined>(undefined);
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

	function onSearchChange(e: CustomEvent<string>) {
		searchValue = e.detail;
		applyFilteringAndOrdering();
	}

	function onFilterMount(filterHeader: TableFilterHeader) {
		filterIsDefault.set(filterHeader, true);
	}

	function onFilterDestroy(filterHeader: TableFilterHeader) {
		filterIsDefault.delete(filterHeader);
		allFiltersDefault = [...filterIsDefault.values()].every(Boolean);
		applyFilteringAndOrdering();
	}

	function onFilterChange(detail: FilterChangeEventDetail) {
		filterIsDefault.set(detail.header, detail.isDefault);
		allFiltersDefault = [...filterIsDefault.values()].every(Boolean);
		if (!detail.isAllReset) {
			applyFilteringAndOrdering();
		}
	}

	function onSortChange(detail: SortingChangeEventDetail) {
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

	const infiniteEventHandlers: InfiniteEventDetail = {
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

	const refreshEventHandlers: RefreshEventDetail = {
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
			errorMessage = message ?? 'An error occurred while refreshing items';
		}
	};
</script>

<div class={twMerge('flex flex-col text-sm', c)}>
	<div
		class="flex flex-wrap items-center justify-start gap-4
		rounded-t-md border !border-b-0 bg-gray-50 px-2 py-2"
	>
		{#if search}
			<div class="grow">
				<InfiniteTableSearch
					bind:value={searchValue}
					placeholder={search.placeholder}
					on:search={onSearchChange}
				/>
			</div>
		{/if}
		<slot name="actionsStart" />
		<div class="flex flex-wrap items-center justify-start gap-x-4 gap-y-1">
			{#if refreshable}
				<Tooltip.Root>
					<Tooltip.Trigger asChild let:builder>
						<Button
							builders={[builder]}
							variant="ghost"
							on:click={refresh}
							disabled={state === 'loading'}
						>
							Refresh
						</Button>
						<!-- <InfiniteTableAction
							icon="fa-light fa-rotate {state === 'loading' ? 'animate-spin' : ''}"
							on:click={refresh}
							disabled={state === 'loading'}
						>
							Refresh
						</InfiniteTableAction> -->
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p class="pt-0.5 text-xs text-gray-500">
							Refreshed {lastRefresh?.value}
						</p>
					</Tooltip.Content>
				</Tooltip.Root>
			{/if}
			{#if filterIsDefault.size > 0 || search}
				<InfiniteTableAction
					icon="fa-light fa-xmark"
					disabled={allFiltersDefault}
					on:click={clearFilters}
				>
					Clear filters
				</InfiniteTableAction>
			{/if}
			<slot name="actionsEnd" />
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
							<td colspan={viewport?.querySelectorAll('th').length || 1}>
								{#if state === 'loading'}
									<slot name="loader">
										<div
											class="flex h-12 items-center justify-center overflow-hidden
										pb-2 text-gray-600"
										>
											Loading...
										</div>
									</slot>
								{/if}
								{#if state === 'completed'}
									<slot name="completed">
										<div
											class="flex h-12 items-center justify-center overflow-hidden
											pb-2 text-center text-gray-600"
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
					<i class="fa-light fa-magnifying-glass text-3xl" />
					<p>No items found</p>
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
					<slot name="initialLoader">
						<p>Loading...</p>
					</slot>
				{:else if state === 'completed'}
					<!-- Table is completed and empty -->
					<slot name="completedEmpty">
						<i class="fa-solid fa-check text-3xl" />
						<p>No items to display</p>
					</slot>
				{:else if state === 'error'}
					<!-- Table has an error and empty -->
					<slot name="errorEmpty">
						<i class="fa-solid fa-triangle-exclamation text-3xl" />
						{#if errorMessage}
							<p>{errorMessage}</p>
						{/if}
					</slot>
				{:else}
					<!-- Table is idle and empty -->
					<slot name="idleEmpty">
						<i class="fa-light fa-magnifying-glass text-3xl" />
						<p>No items to display</p>
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
