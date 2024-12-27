export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRecord = Record<string | number | symbol, any>;
export type TableItem = AnyRecord;

/**
 * A custom filtering function that gets called on each item in the table.
 * @returns `true` if the item should be shown, `false` if it should be hidden.
 */
export type CustomFiltering<T extends TableItem = TableItem> = (item: T, index: number) => boolean;

type TableSearchMode<T extends 'server' | 'auto' | 'custom'> = {
	/**
	 * If the mode of search is `server`, you'll have to handle it on the server side.
	 *
	 * Setting this to anything other than `server` will make the search client sided.
	 *
	 * __WARNING:__ Having client side search with infinite loading enabled can trigger many `infinite` events.
	 */
	mode: T;
};

export type TableSearchSettings = {
	/**
	 * The placeholder text of the search input.
	 *
	 * @default 'Search'
	 */
	placeholder?: string;
	/**
	 * The amount of milliseconds to wait after the user's last keystroke.
	 *
	 * @default 500
	 */
	debounceDelay?: number;
} & (
	| TableSearchMode<'server'>
	| (TableSearchMode<'auto'> & {
			/**
			 * The property to search by. Can be a dot-separated nested property, or an array of properties.
			 *
			 * The value that `property` points to must be of type `string`, `number`, or `boolean`.
			 * @example
			 * 'user.name'
			 * // or
			 * ['id', 'user.name']
			 * // where both 'id' and 'user.name' have string, number, or boolean values
			 */
			property: string | string[];
			/**
			 * If true, the filter will be case sensitive.
			 *
			 * @default false
			 */
			caseSensitive?: boolean;
	  })
	| (TableSearchMode<'custom'> & {
			/**
			 * A custom filtering function that gets called on each item in the table.
			 * @property item The item to filter.
			 * @property index The index of the item in the table.
			 * @returns `true` if the item should be shown, `false` if it should be filtered out.
			 */
			onSearch: CustomFiltering;
	  })
);

export type TableBaseHeader<T extends AnyRecord = AnyRecord> = {
	label: string;
	sort?: TableHeaderSort;
	style?: TableHeaderStyle;
	/**
	 * Additional data that can be used to add custom information about the header.
	 */
	meta?: T;
};

type TableFilterModeOption = 'server' | 'auto' | 'custom';
type TableFilterMode<T extends TableFilterModeOption = TableFilterModeOption> = {
	/**
	 * If the mode of the filter is `server`, you'll have to handle it on the server side.
	 *
	 * Setting this to anything other than `server` will make the filter client sided.
	 *
	 * __WARNING:__ Having client side filtering with infinite loading enabled can trigger many `infinite` events.
	 */
	mode: T;
};
type GenericFilter<T extends { type: string; value?: unknown }> = {
	filter: T;
};

export type FilterOption = {
	/** The text that will appear to users. */
	label: string;
	/** The value that will be used in the filter. */
	name: string;
};

/** A free text filter. */
export type TextFilterHeader = TableBaseHeader &
	GenericFilter<
		{
			type: 'text';
			value?: string;
			placeholder?: string;
		} & (
			| TableFilterMode<'server'>
			| (TableFilterMode<'auto'> & {
					property: string | number | symbol | (string | number | symbol)[];
					settings?: {
						/**
						 * If true, the filter will be case sensitive.
						 * @default false
						 */
						caseSensitive?: boolean;
					};
			  })
			| (TableFilterMode<'custom'> & {
					isDefaultValue: (value: string) => boolean;
					onFilter: CustomFiltering;
			  })
		)
	>;

/** A multi-select filter. */
export type MultiSelectFilterHeader<T extends FilterOption = FilterOption> = TableBaseHeader &
	GenericFilter<
		{
			type: 'multiSelect';
			options: T[];
			value?: T[];
		} & (
			| TableFilterMode<'server'>
			| (TableFilterMode<'auto'> & {
					property: string | number | symbol | (string | number | symbol)[];
			  })
			| (TableFilterMode<'custom'> & {
					isDefaultValue: (value: T[]) => boolean;
					onFilter: CustomFiltering;
			  })
		)
	>;

/** A custom filter. */
export type CustomFilterHeader<T = unknown> = TableBaseHeader &
	GenericFilter<
		{
			type: 'custom';
			value?: T;
		} & (
			| TableFilterMode<'server'>
			| (TableFilterMode<'custom'> & {
					isDefaultValue: (value: T) => boolean;
					onFilter: CustomFiltering;
			  })
		)
	>;

export type TableFilterHeader = TextFilterHeader | MultiSelectFilterHeader | CustomFilterHeader;

export type TableHeader = TableBaseHeader | TableFilterHeader;

export type SortDirection = 'asc' | 'desc';

export type TableHeaderStyle = {
	/**
	 * If it's a number, it'll be treated as a pixel value.
	 * If it's a string, it'll be treated as a CSS value.
	 * Otherwise, defaults to 'auto'.
	 */
	width?: string | number;
	/**
	 * `minWidth` must be a number, and will be treated as a pixel value.
	 */
	minWidth?: number;
};

type TableSortMode<T extends 'server' | 'auto'> = {
	/**
	 * If the mode of sorting is `auto`, the sorting will be done on the client automatically, on the existing items.
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
export type RefreshHandler = (detail: RefreshDetail) => Promise<void> | void;

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
export type InfiniteHandler = (detail: InfiniteDetail) => Promise<void> | void;

export type SearchDetail = {
	/** The value of the search input. */
	value: string;
};
/**
 * A function that gets called when the user types in the search input.
 * @param detail The details of the search input.
 * @param refresh Use the provided functions to update the table.
 */
export type SearchHandler = (detail: SearchDetail, result: RefreshDetail) => Promise<void> | void;

export type FilterDetailItem = {
	header: TableFilterHeader;
	isDefault: boolean;
};
export type FilterDetail = {
	current: FilterDetailItem;
	all: FilterDetailItem[];
};
/**
 * A function that gets called after the table filters changed.
 * @param detail The details of the filters.
 * @param refresh Use the provided functions to update the table.
 */
export type FilterHandler = (detail: FilterDetail, result: RefreshDetail) => Promise<void> | void;

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
export type SortHandler = (detail: SortDetail, result: RefreshDetail) => Promise<void> | void;

export type SelectDetail = TableItem[];
export type SelectHandler = (detail: SelectDetail) => void;
