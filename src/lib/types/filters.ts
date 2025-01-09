import type { TableHeader, TableItem } from './table.js';
import type { AnyRecord, WithRequired } from './utils.js';

/**
 * A custom filtering function that gets called on each item in the table.
 * @returns `true` if the item should be shown, `false` if it should be hidden.
 */
export type CustomFiltering<T extends TableItem = TableItem> = (item: T, index: number) => boolean;

type TableFilterModeOption = 'server' | 'auto' | 'custom';
type TableFilterMode<T extends TableFilterModeOption = TableFilterModeOption> = {
	/**
	 * If the mode of the filter is `server`, you'll have to handle it on the server side.
	 * To do this, provide the `onFilter` function for the table.
	 *
	 * Setting this to anything other than `server` will make the filter client sided.
	 *
	 * __WARNING:__ Having client side filtering with infinite loading enabled can trigger many `infinite` events.
	 */
	mode: T;
};
type GenericFilter<T extends { type: string; value?: unknown }> = T;

export type FilterOption = {
	/** The text that will appear to users. */
	label: string;
	/** The value that will be used in the filter. */
	name: string;
};

/** A free text filter. */
export type TextFilter = GenericFilter<
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
export type MultiSelectFilter<T extends FilterOption = FilterOption> = GenericFilter<
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
export type CustomFilter<T = unknown> = GenericFilter<
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

export type TableHeaderFilter = TextFilter | MultiSelectFilter | CustomFilter;

export type TableFilterHeader<M extends AnyRecord = AnyRecord> = WithRequired<
	TableHeader<M>,
	'filter'
>;
