/**
 * A custom filtering function that gets called on each item in the table.
 * @returns `true` if the item should be shown, `false` if it should be hidden.
 */
export type CustomFiltering<T extends TableItem = TableItem> = (item: T, index: number) => boolean;

type TableSearchType<T extends 'server' | 'auto' | 'custom'> = {
	/**
	 * If the type of search is `server`, you'll have to handle the search on the server side.
	 *
	 * Setting this to anything other than `server` will make the search client sided.
	 *
	 * __WARNING:__ Having client side search with infinite loading enabled can trigger many `infinite` events.
	 */
	type: T;
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
	| (TableSearchType<'server'> & {
			/**
			 * A function that gets called when the user types in the search input.
			 */
			onSearch: (detail: SearchEventParam) => Promise<void> | void;
	  })
	| (TableSearchType<'auto'> & {
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
	| (TableSearchType<'custom'> & {
			/**
			 * A custom filtering function that gets called on each item in the table.
			 * @property item The item to filter.
			 * @property index The index of the item in the table.
			 * @returns `true` if the item should be shown, `false` if it should be filtered out.
			 */
			onSearch: CustomFiltering;
	  })
);

export type TableBaseHeader = {
	label: string;
	sort?: TableHeaderSort;
	style?: TableHeaderStyle;
};

type GenericFilter<T extends { type: string; value?: unknown }> = {
	filter: T & { property: string | number | symbol | (string | number | symbol)[] };
};

export type FilterOption = {
	/** The text that will appear to users. */
	label: string;
	/** The value that will be used in the filter. */
	name: string;
};

/** A free text filter. */
export type TextFilterHeader = TableBaseHeader &
	GenericFilter<{
		type: 'text';
		value?: string;
		placeholder?: string;
		settings?: {
			/**
			 * If true, the filter will be case sensitive.
			 * @default false
			 */
			caseSensitive?: boolean;
		};
	}>;

/** A multi-select filter. */
export type MultiSelectFilterHeader<T extends FilterOption = FilterOption> = TableBaseHeader &
	GenericFilter<{
		type: 'multiSelect';
		options: T[];
		value?: T[];
	}>;

/** A custom filter. */
export type CustomFilterHeader<T = unknown> = TableBaseHeader & {
	filter: {
		type: 'custom';
		value?: T;
		isDefaultValue: (value: T) => boolean;
		onFilter: CustomFiltering;
	};
};

export type TableFilterHeader = TextFilterHeader | MultiSelectFilterHeader | CustomFilterHeader;

export type TableHeader = TableBaseHeader | TableFilterHeader;

export type FilterChangeEventParam = {
	header: TableFilterHeader;
	isDefault: boolean;
	isAllReset: boolean;
};
// export type FilterChangeEvent = CustomEvent<FilterChangeEventParam>;
// export type FiltersChangeEvent = CustomEvent<FilterChangeEventParam[]>;

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

export type TableHeaderSort = {
	/** The property to sort by. Can be a dot-separated nested property (eg. `'user.name'`). */
	property: string;
	defaultDirection?: SortDirection;
};

export type SortingChangeEventParam = {
	header: TableHeader;
	property: TableHeaderSort['property'];
	direction: SortDirection;
};
// export type SortingChangeEvent = CustomEvent<SortingChangeEventParam>;

export type SearchEventParam = {
	value: string;
} & RefreshEventParam;
// export type SearchEvent = CustomEvent<SearchEventParam>;

export type InfiniteEventParam = {
	loaded: (newItems: TableItem[]) => void;
	completed: (newItems: TableItem[]) => void;
	error: (message?: string) => void;
};

// export type InfiniteEvent = CustomEvent<InfiniteEventParam>;

export type RefreshEventParam = {
	loaded: (items: TableItem[]) => void;
	completed: (items: TableItem[]) => void;
	error: (message?: string) => void;
};

// export type RefreshEvent = CustomEvent<RefreshEventParam>;

export type SelectChangeEventParam = TableItem[];
// export type SelectChangeEvent = CustomEvent<SelectChangeEventParam>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TableItem = Record<string | number | symbol, any>;
