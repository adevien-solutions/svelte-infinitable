import type { TableHeaderFilter } from './filters.js';
import type { TableHeaderSort } from './sort.js';
import type { AnyRecord } from './utils.js';

export type TableItem = AnyRecord;

export type TableBaseHeader<M extends AnyRecord = AnyRecord> = {
	label: string;
	filter?: TableHeaderFilter;
	sort?: TableHeaderSort;
	style?: TableHeaderStyle;
	/**
	 * Additional data that can be used to add custom information about the header.
	 */
	meta?: M;
};

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

export type TableHeader<M extends AnyRecord = AnyRecord> = TableBaseHeader<M>;
