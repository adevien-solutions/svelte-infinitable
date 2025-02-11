import { getContext, setContext } from 'svelte';
import type { Readable } from 'svelte/store';
import type {
	FilterDetailItem,
	InternalSortDetail,
	RefreshHandler,
	SearchHandler,
	TableFilterHeader,
	TableSearchSettings
} from '../types/index.js';

const infiniteTableContextKey = Symbol('infinite_table_context_key');

export type InfiniteTableRowData<T = unknown> = { selected: boolean; meta?: Record<string, T> };
export type InfiniteTableRowDataStoreValue = Record<string, InfiniteTableRowData>;

export type InfiniteTableState = 'idle' | 'loading' | 'completed' | 'error';

export type InfiniteTableContext = {
	state: Readable<InfiniteTableState>;
	element: {
		table: Readable<HTMLTableElement | undefined>;
	};
	/** Controls whether the table rows are selectable or not. */
	selectable: boolean;
	selectedCount: () => number;
	rowCount: () => number;
	isAllSelected: () => boolean;
	sorting: Readable<InternalSortDetail | undefined>;
	onFilterMount: (filterHeader: TableFilterHeader) => void;
	onFilterChange: (detail: FilterDetailItem, isUserReset: boolean) => void;
	onFilterDestroy: (filterHeader: TableFilterHeader) => void;
	onSortChange: (detail: InternalSortDetail) => void;
	refresh: (handler?: RefreshHandler) => void;
	onRefreshMount: (resetFunction: () => void) => void;
	onRefreshDestroy: (resetFunction: () => void) => void;
	allFiltersDefault: Readable<boolean>;
	clearFilters: () => Promise<void>;
	onSearchChange: (value: string, settings: TableSearchSettings, handler?: SearchHandler) => void;
	onSearchDestroy: () => void;
	resetFlag: Readable<boolean>;
};

export function setInfiniteTableContext(ctx: InfiniteTableContext): InfiniteTableContext {
	return setContext(infiniteTableContextKey, ctx);
}

export function getInfiniteTableContext(): InfiniteTableContext {
	return getContext(infiniteTableContextKey);
}
