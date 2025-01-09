import type { SortDirection } from './sort.js';
import type { TableHeader, TableItem } from './table.js';
import type { WithRequired } from './utils.js';

export type RefreshDetail = {
	/**
	 * Should be called when the items are loaded, but there are more items to load.
	 * @param items The items that are going to replace the current list.
	 */
	loaded: (items: TableItem[]) => void;
	/**
	 * Should be called when the items are loaded, and there are no more items to load.
	 * @param items The items that are going to replace the current list.
	 */
	completed: (items: TableItem[]) => void;
	error: (message?: string) => void;
};
export type RefreshHandler = (result: RefreshDetail) => Promise<void> | void;

export type InfiniteDetail = {
	/**
	 * Should be called when the items are loaded, but there are more items to load.
	 * @param newItems The items that are going to be appended to the end of the current list.
	 */
	loaded: (newItems: TableItem[]) => void;
	/**
	 * Should be called when the items are loaded, and there are no more items to load.
	 * @param newItems The items that are going to be appended to the end of the current list.
	 */
	completed: (newItems: TableItem[]) => void;
	error: (message?: string) => void;
};
export type InfiniteHandler = (result: InfiniteDetail) => Promise<void> | void;

export type SearchDetail = {
	/** The value of the search input. */
	value: string;
};
/**
 * A function that gets called when the user types in the search input.
 * @param detail The details of the search input.
 * @param refresh Use the provided functions to update the table.
 */
export type SearchHandler = (result: RefreshDetail, detail: SearchDetail) => Promise<void> | void;

export type FilterDetailItem<T extends TableHeader = TableHeader> = {
	header: WithRequired<T, 'filter'>;
	isDefault: boolean;
};
export type FilterDetail<T extends TableHeader = TableHeader> = {
	current: FilterDetailItem<T>;
	all: FilterDetailItem<T>[];
};
/**
 * A function that gets called after the table filters changed.
 * @param detail The details of the filters.
 * @param refresh Use the provided functions to update the table.
 */
export type FilterHandler = (result: RefreshDetail, detail: FilterDetail) => Promise<void> | void;

export type SortDetail<T extends TableHeader = TableHeader> = {
	header: WithRequired<T, 'sort'>;
	direction: SortDirection;
};
export type InternalSortDetail = SortDetail & {
	id: string;
};
/**
 * A function that gets called after the table sorting changed.
 * @param detail The details of the sorting.
 * @param refresh Use the provided functions to update the table.
 */
export type SortHandler = (result: RefreshDetail, detail: SortDetail) => Promise<void> | void;

export type SelectDetail = TableItem[];
export type SelectHandler = (detail: SelectDetail) => void;
