import type { Readable } from 'svelte/store';
import type {
	FilterChangeEventDetail,
	SortingChangeEventDetail,
	TableFilterHeader
} from './types.js';

export const INFINITE_TABLE_CONTEXT_KEY = 'infiniteTableContextKey' as const;

export type InfiniteTableRowData<T = unknown> = { selected: boolean; meta?: Record<string, T> };
export type InfiniteTableRowDataStoreValue = Record<string, InfiniteTableRowData>;

export type InfiniteTableContext = {
	element: {
		table: Readable<HTMLTableElement | undefined>;
	};
	/** Controls whether the table rows are selectable or not. */
	selectable: boolean;
	allSelected: Readable<boolean>;
	sorting: Readable<SortingChangeEventDetail | undefined>;
	onFilterMount: (filterHeader: TableFilterHeader) => void;
	onFilterChange: (detail: FilterChangeEventDetail) => void;
	onFilterDestroy: (filterHeader: TableFilterHeader) => void;
	onSortChange: (detail: SortingChangeEventDetail) => void;
	resetFlag: Readable<boolean>;
};
