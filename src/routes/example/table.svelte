<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Infinitable from '$lib/infinitable/index.js';
	import type {
		FilterDetailItem,
		InfiniteHandler,
		RefreshDetail,
		RefreshHandler,
		SelectHandler,
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

	async function loadItems(ignoreFiltering = false) {
		const limit = 100;
		let res: Awaited<ReturnType<typeof getTasks>>;

		if (ignoreFiltering) {
			res = await getTasks(page++, limit);
		} else {
			const { search, filters, sort } = table.getSearchFilterSort<typeof tableHeaders>();
			res = await getTasks(
				page++,
				limit,
				search?.value,
				filtersToObject(filters),
				sort?.header.meta?.name,
				sort?.direction
			);
		}

		const { total, ...rest } = res;
		totalCount = total;
		return rest;
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
			const { data, depleted } = await loadItems();
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

	const searchFilterSortHandler = async ({ loaded, completed, error }: RefreshDetail) => {
		try {
			page = 1;
			const { data, depleted } = await loadItems();
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
	selectable
	rowDisabler={({ state }) => isFinishedTaskState(state)}
	disabledRowMessage="Task is already finished"
	{onInfinite}
	onFilter={searchFilterSortHandler}
	onSort={searchFilterSortHandler}
	{onSelect}
	class="h-[60vh] min-h-[400px]"
	debug
>
	{#snippet actions()}
		<Infinitable.ActionRow>
			<div class="grow">
				<Infinitable.Search
					settings={{ mode: 'server' }}
					onSearch={searchFilterSortHandler}
					placeholder="Search tasks"
				/>
			</div>
			<Button variant="ghost" onclick={() => alert('Mock action')} disabled={cancelDisabled}>
				<Trash size={16} />
				<span> Cancel tasks </span>
			</Button>
			<Infinitable.Refresh {onRefresh} />
			<Infinitable.FilterClear />
		</Infinitable.ActionRow>
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
