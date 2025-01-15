# Svelte Infinitable

Svelte Infinitable is a virtual table component that uses native <kbd>table</kbd> elements and
supports _infinite scrolling_, _searching_, _filtering_, _sorting_, and more.

![Example table](https://github.com/adevien-solutions/svelte-infinitable/blob/main/assets/example.png?raw=true)

Live demo: [https://infinitable.adevien.com/](https://infinitable.adevien.com/)

## Sponsor

[![Aluma](https://github.com/adevien-solutions/svelte-infinitable/blob/main/assets/aluma.png?raw=true)](https://aluma.io/?utm_source=svelte-infinitable&utm_medium=github&utm_campaign=sponsor)

## Installation

Svelte Infinitable is built with Svelte 5, which means you need to have Svelte 5 installed in your project.

```bash
pnpm add -D svelte-infinitable
# or
yarn add -D svelte-infinitable
# or
npm i -D svelte-infinitable
```

## Usage

### Props

| Name                 | Type                                          | Default                         | Optional | Description                                                                                                                                                                                                                                              |
| -------------------- | --------------------------------------------- | ------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items`              | `TableItem[]`                                 | `[]`                            | Yes      | The items to display in the table. If all of the items are loaded ahead of time, set `ignoreInfinite` to `true` and call `finishInitialLoad()` on the table instance when the initial load is completed.                                                 |
| `rowHeight`          | `number`                                      | -                               | No       | The height of each row in the table.                                                                                                                                                                                                                     |
| `selectable`         | `boolean`                                     | `false`                         | Yes      | Controls whether the table rows are selectable or not.                                                                                                                                                                                                   |
| `refreshable`        | `boolean`                                     | `false`                         | Yes      | Controls whether the table has a refresh button or not.                                                                                                                                                                                                  |
| `search`             | `TableSearchSettings`                         | `undefined`                     | Yes      | Controls whether the table has a search bar or not.                                                                                                                                                                                                      |
| `overscan`           | `number`                                      | `10`                            | Yes      | The number of rows to render above and below the visible area of the table. Also controls how early the table will call the `onInfinite` function.                                                                                                       |
| `ignoreInfinite`     | `boolean`                                     | `false`                         | Yes      | Controls whether the `onInfinite` function is called or not. Useful to set to `true` if you know that you are going to load all the data at once. If set to `true`, call `finishInitialLoad()` on the table instance when the initial load is completed. |
| `rowDisabler`        | `(item: TableItem, index: number) => boolean` | `undefined`                     | Yes      | A function that takes an item and an index as parameters, and returns a boolean indicating whether the row at that index should be disabled or not.                                                                                                      |
| `disabledRowMessage` | `string`                                      | `'This row cannot be selected'` | Yes      | The text that will be displayed when the checkbox of a disabled row is hovered.                                                                                                                                                                          |
| `class`              | `string`                                      | `''`                            | Yes      | Classes to apply to the table wrapper element.                                                                                                                                                                                                           |

### Events

| Name         | Type              | Default     | Optional | Description                                                                |
| ------------ | ----------------- | ----------- | -------- | -------------------------------------------------------------------------- |
| `onInfinite` | `InfiniteHandler` | `undefined` | Yes      | Called when the table has reached the end of the loaded data.              |
| `onRefresh`  | `RefreshHandler`  | `undefined` | Yes      | Called when the user clicks the refresh button.                            |
| `onSearch`   | `SearchHandler`   | `undefined` | Yes      | Called when the user types in the search input, and it's in `server` mode. |
| `onFilter`   | `FilterHandler`   | `undefined` | Yes      | Called when the filtering of the table changes, and it's in `server` mode. |
| `onSort`     | `SortHandler`     | `undefined` | Yes      | Called when the sorting of the table changes, and it's in `server` mode.   |
| `onSelect`   | `SelectHandler`   | `undefined` | Yes      | Called when the selected items change.                                     |

### Slots

| Name                 | Argument                                                                            | Description                                                                          |
| -------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `children` (default) | `{ item: TableItem; index: number; selectedCount: number; isAllSelected: boolean }` | A slot for the table rows.                                                           |
| `actionsStart`       | `{ wrapper: HTMLElement }`                                                          | A slot at the start of the actions section.                                          |
| `actionsEnd`         | `{ wrapper: HTMLElement }`                                                          | A slot at the end of the actions section.                                            |
| `headers`            | -                                                                                   | A slot for the table headers.                                                        |
| `loader`             | -                                                                                   | A slot to replace the loading indicator below existing rows.                         |
| `completed`          | -                                                                                   | A slot to replace the message below existing rows, when the table has no more items. |
| `empty`              | -                                                                                   | A slot to replace the message when the table has items, but they are filtered out.   |
| `loadingEmpty`       | -                                                                                   | A slot to replace the message when the table is loading and empty.                   |
| `completedEmpty`     | -                                                                                   | A slot to replace the screen when the table has no more items and empty.             |
| `errorEmpty`         | -                                                                                   | A slot to replace the screen when the table has an error and empty.                  |
| `idleEmpty`          | -                                                                                   | A slot to replace the screen when the table is idle and empty.                       |
| `rowsDetail`         | `{ rowCount: number; selectedCount: number }`                                       | A slot to replace the info message below the table.                                  |
| `error`              | `{ message: string }`                                                               | A slot to replace the error message below the table.                                 |

## Example

The following is a barebones example of using Svelte Infinitable.
If you want to see a more complex one, check
[`table.svelte` in the example direxctory](https://github.com/adevien-solutions/svelte-infinitable/blob/main/src/routes/example/table.svelte).

```svelte
<script lang="ts">
	import * as Infinitable from 'svelte-infinitable';
	import type { InfiniteHandler } from 'svelte-infinitable/types';
	import { formatDateString, getTasks, tableHeaders, type TaskData } from '$lib/utils.js';

	let items: TaskData[] = [];
	let page = 1;

	async function loadItems() {
		const limit = 100;
		const { data, depleted } = await getTasks(page++, limit);
		return { data, depleted };
	}

	const onInfinite: InfiniteHandler = async ({ loaded, completed, error }) => {
		try {
			const { data, depleted } = await loadItems();
			depleted ? completed(data) : loaded(data);
		} catch (e) {
			error();
		}
	}
</script>

<Infinitable.Root bind:items rowHeight={36} {onInfinite} class="max-h-[400px]">
	{#snippet headers()}
		{#each tableHeaders as header}
			<Infinitable.Header {header} />
		{/each}
	{/snippet}

	{#snippet children({ index })}
		{@const { id, name, created_at } = items[index] ?? {}}
		<td> {id} </td>
		<td> {name} </td>
		<td> {formatDateString(created_at)} </td>
	{/snippet}
</Infinitable.Root>
```
