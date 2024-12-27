import { getContext, setContext } from 'svelte';
import type { Readable } from 'svelte/store';
import type { FilterDetailItem, InternalSortDetail, TableFilterHeader } from './types.js';

const infiniteTableContextKey = Symbol('infinite_table_context_key');

export type InfiniteTableRowData<T = unknown> = { selected: boolean; meta?: Record<string, T> };
export type InfiniteTableRowDataStoreValue = Record<string, InfiniteTableRowData>;

export type InfiniteTableContext = {
	element: {
		table: Readable<HTMLTableElement | undefined>;
	};
	/** Controls whether the table rows are selectable or not. */
	selectable: boolean;
	allSelected: Readable<boolean>;
	sorting: Readable<InternalSortDetail | undefined>;
	onFilterMount: (filterHeader: TableFilterHeader) => void;
	onFilterChange: (detail: FilterDetailItem, isUserReset: boolean) => void;
	onFilterDestroy: (filterHeader: TableFilterHeader) => void;
	onSortChange: (detail: InternalSortDetail) => void;
	resetFlag: Readable<boolean>;
};

export function setInfiniteTableContext(ctx: InfiniteTableContext): InfiniteTableContext {
	return setContext(infiniteTableContextKey, ctx);
}

export function getInfiniteTableContext(): InfiniteTableContext {
	return getContext(infiniteTableContextKey);
}
