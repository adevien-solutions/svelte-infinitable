<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Infinitable from '$lib/infinitable/index.js';
	import type {
		FilterDetailItem,
		FilterHandler,
		InfiniteHandler,
		RefreshHandler,
		SearchHandler,
		SelectHandler,
		SortDirection,
		SortHandler,
		TableHeader
	} from '$lib/types/index.js';
	import ClipboardList from 'lucide-svelte/icons/clipboard-list';
	import EllipsisVertical from 'lucide-svelte/icons/ellipsis-vertical';
	import Info from 'lucide-svelte/icons/info';
	import Trash from 'lucide-svelte/icons/trash';
	import {
		formatDateString,
		getTasks,
		isFinishedTaskState,
		tableHeaders,
		taskStateData,
		type TaskData
	} from './index.js';

	let table: Infinitable.Root;
	let items: TaskData[] = [];
	let selectedTasks: TaskData[] = [];
	let cancelDisabled = true;
	let page = 1;
	let totalCount = 0;

	async function loadItems(
		search?: string,
		filter?: Partial<Record<keyof TaskData, string[]>>,
		sort?: keyof TaskData,
		direction?: SortDirection
	) {
		const limit = 100;
		const { data, depleted, total } = await getTasks(
			page++,
			limit,
			search,
			filter,
			sort,
			direction
		);
		totalCount = total;
		return { data, depleted };
	}

	function filtersToObject(
		filters:
			| FilterDetailItem<
					TableHeader<{
						name: keyof TaskData;
					}>
			  >[]
			| undefined
	) {
		return filters?.reduce(
			(acc, { header }) => {
				if (!header.meta?.name) {
					return acc;
				}

				if (header.filter.type === 'text' && header.filter.value) {
					acc[header.meta.name] = [header.filter.value];
				} else if (header.filter.type === 'multiSelect') {
					const values = header.filter.value?.map(({ name }) => name);
					if (values?.length) {
						acc[header.meta.name] = values;
					}
				}

				return acc;
			},
			{} as Partial<Record<keyof TaskData, string[]>>
		);
	}

	const onInfinite: InfiniteHandler = async ({ loaded, completed, error }) => {
		try {
			const { search, filters, sort } = table.getSearchFilterSort<typeof tableHeaders>();
			const { data, depleted } = await loadItems(
				search?.value,
				filtersToObject(filters),
				sort?.header?.meta?.name,
				sort?.direction
			);
			depleted ? completed(data) : loaded(data);
		} catch (e) {
			error();
		}
	};

	const onRefresh: RefreshHandler = async ({ loaded, completed, error }) => {
		try {
			page = 1;
			const { data, depleted } = await loadItems();
			depleted ? completed(data) : loaded(data);
		} catch (e) {
			error();
		}
	};

	const onSearch: SearchHandler = async ({ loaded, completed, error }, { value }) => {
		try {
			page = 1;
			const { filters, sort } = table.getSearchFilterSort<typeof tableHeaders>();
			const { data, depleted } = await loadItems(
				value,
				filtersToObject(filters),
				sort?.header.meta?.name,
				sort?.direction
			);
			depleted ? completed(data) : loaded(data);
		} catch (e) {
			error();
		}
	};

	const onFilter: FilterHandler = async ({ loaded, completed, error }) => {
		try {
			page = 1;
			const { search, filters, sort } = table.getSearchFilterSort<typeof tableHeaders>();
			const { data, depleted } = await loadItems(
				search?.value,
				filtersToObject(filters),
				sort?.header.meta?.name,
				sort?.direction
			);
			depleted ? completed(data) : loaded(data);
		} catch (e) {
			error();
		}
	};

	const onSort: SortHandler = async ({ loaded, completed, error }, { direction }) => {
		try {
			page = 1;
			const { search, filters, sort } = table.getSearchFilterSort<typeof tableHeaders>();
			const { data, depleted } = await loadItems(
				search?.value,
				filtersToObject(filters),
				sort?.header.meta?.name,
				direction
			);
			depleted ? completed(data) : loaded(data);
		} catch (e) {
			error();
		}
	};

	const onSelect: SelectHandler = (items) => {
		selectedTasks = [...items] as TaskData[];
		// Array.every returns true if the array is empty
		cancelDisabled = selectedTasks.every(({ state }) => isFinishedTaskState(state));
	};
</script>

<Infinitable.Root
	bind:this={table}
	bind:items
	rowHeight={36}
	refreshable
	selectable
	search={{ mode: 'server', placeholder: 'Search tasks' }}
	rowDisabler={({ state }) => isFinishedTaskState(state)}
	disabledRowMessage="Task is already finished"
	{onRefresh}
	{onInfinite}
	{onSearch}
	{onFilter}
	{onSort}
	{onSelect}
	class="h-[60vh] min-h-[400px]"
>
	{#snippet actionsStart()}
		<Button variant="ghost" onclick={() => alert('Mock action')} disabled={cancelDisabled}>
			<Trash size={16} />
			<span> Cancel tasks </span>
		</Button>
	{/snippet}

	{#snippet headers()}
		{#each tableHeaders as header}
			<Infinitable.Header {header} />
		{/each}
	{/snippet}

	{#snippet children({ index })}
		{@const { id, name, project_name, state, created_at } = items[index] ?? {}}
		{@const label = name || id}
		<td>
			{label}
		</td>
		<td>
			{project_name}
		</td>
		<td class="whitespace-nowrap !py-2">
			<span>
				<span
					class="inline-block h-2.5 w-2.5 rounded-full
					{taskStateData[state]?.color ?? 'bg-gray-500'}"
				></span>
				<span class="pl-0.5">{taskStateData[state]?.label ?? 'Unkown'}</span>
			</span>
		</td>
		<td class="whitespace-nowrap !py-2">
			{formatDateString(created_at)}
		</td>
		<td class="!p-0 text-center">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					class={buttonVariants({
						variant: 'ghost',
						size: 'sm',
						class: 'h-8 w-8 p-0 hover:bg-black/5'
					})}
				>
					<span class="sr-only"> Row menu </span>
					<EllipsisVertical size={18} />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.Item onclick={() => alert('Mock action')}>
						<Info size={16} />
						<span class="pl-2">Details</span>
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => alert('Mock action')}>
						<Trash size={16} />
						<span class="pl-2">Cancel task</span>
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</td>
	{/snippet}

	{#snippet completedEmpty()}
		<ClipboardList size={32} />
		<p class="text-center font-medium">No tasks found</p>
	{/snippet}

	{#snippet rowsDetail({ rowCount, selectedCount })}
		<p class="my-1 text-sm text-gray-500">
			{rowCount} of {totalCount} task{rowCount === 1 ? '' : 's'} shown, {selectedCount} selected
		</p>
	{/snippet}
</Infinitable.Root>
