/**
 * A custom filtering function that gets called on each item in the table.
 * @returns `true` if the item should be shown, `false` if it should be hidden.
 */
export type CustomFiltering<T extends TableItem = TableItem> = (item: T, index: number) => boolean;

export type TableSearchSettings = {
	placeholder?: string;
} & (
	| {
			/**
			 * The property to search by. Can be a dot-separated nested property (eg. `'user.name'`),
			 * and can also be an array of properties (eg. `['id', 'user.name']`).
			 *
			 * The value that `property` points to must be a `string`, `number`, or `boolean`
			 * (eg. `object.user.name` must be one of those types).
			 */
			property: string | string[];
			/**
			 * If true, the filter will be case sensitive.
			 * @default false
			 */
			caseSensitive?: boolean;
	  }
	| {
			onSearch: CustomFiltering;
	  }
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

export type FilterChangeEventDetail = {
	header: TableFilterHeader;
	isDefault: boolean;
	isAllReset: boolean;
};
export type FilterChangeEvent = CustomEvent<FilterChangeEventDetail>;
export type FiltersChangeEvent = CustomEvent<FilterChangeEventDetail[]>;

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

export type SortingChangeEventDetail = {
	header: TableHeader;
	property: TableHeaderSort['property'];
	direction: SortDirection;
};
export type SortingChangeEvent = CustomEvent<SortingChangeEventDetail>;

export type InfiniteEventDetail = {
	loaded: (newItems: TableItem[]) => void;
	completed: (newItems: TableItem[]) => void;
	error: (message?: string) => void;
};

export type InfiniteEvent = CustomEvent<InfiniteEventDetail>;

export type RefreshEventDetail = {
	loaded: (items: TableItem[]) => void;
	completed: (items: TableItem[]) => void;
	error: (message?: string) => void;
};

export type RefreshEvent = CustomEvent<RefreshEventDetail>;

export type SelectChangeEventDetail = TableItem[];
export type SelectChangeEvent = CustomEvent<SelectChangeEventDetail>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TableItem = Record<string | number | symbol, any>;
