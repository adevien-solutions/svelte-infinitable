import type { CustomFiltering } from './filters.js';

type TableSearchMode<T extends 'server' | 'auto' | 'custom'> = {
	/**
	 * If the mode of search is `server`, you'll have to handle it on the server side.
	 * To do this, provide the `onSearch` function for the table.
	 *
	 * Setting this to anything other than `server` will make the search client sided.
	 *
	 * __WARNING:__ Having client side search with infinite loading enabled can trigger many `infinite` events.
	 */
	mode: T;
};

export type TableSearchSettings =
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
	  });
