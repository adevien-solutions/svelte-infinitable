export type SortDirection = 'asc' | 'desc';

type TableSortMode<T extends 'server' | 'auto'> = {
	/**
	 * If the mode of sorting is `auto`, the sorting will be done on the client automatically, on the existing items.
	 * To do this, provide the `onSort` function for the table.
	 *
	 * If the mode of sorting is `server`, you'll have to handle it on the server side.
	 *
	 * Setting this to anything other than `server` will make the sort client sided.
	 */
	mode: T;
};

export type TableHeaderSortProperty = string;
export type TableHeaderServerSort = TableSortMode<'server'>;
export type TableHeaderAutoSort = TableSortMode<'auto'> & {
	/** The property to sort by. Can be a dot-separated nested property (eg. `'user.name'`). */
	property: TableHeaderSortProperty;
};
export type TableHeaderSort = {
	defaultDirection?: SortDirection;
} & (TableHeaderServerSort | TableHeaderAutoSort);
