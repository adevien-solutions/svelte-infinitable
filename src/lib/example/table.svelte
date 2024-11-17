<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import {
		formatDateString,
		getTasks,
		headers,
		isFinishedTaskState,
		taskStateData,
		type TaskData
	} from '$lib/example/index.js';
	import * as Infinitable from '$lib/infinitable/index.js';
	import ClipboardList from 'lucide-svelte/icons/clipboard-list';
	import EllipsisVertical from 'lucide-svelte/icons/ellipsis-vertical';
	import Info from 'lucide-svelte/icons/info';
	import Trash from 'lucide-svelte/icons/trash';

	let table: Infinitable.Root;
	let items: TaskData[];
	let selectedTasks: TaskData[] = [];
	let cancelDisabled = true;
	let page = 1;
	let totalCount = 0;

	async function loadItems(search?: string) {
		const limit = 100;
		const { data, depleted, total } = await getTasks(page++, limit, search);
		totalCount = total;
		return { data, depleted };
	}

	async function infiniteHandler({
		detail: { loaded, completed, error }
	}: Infinitable.InfiniteEvent) {
		try {
			const { data, depleted } = await loadItems();
			depleted ? completed(data) : loaded(data);
		} catch (e) {
			error();
		}
	}

	async function refreshHandler({
		detail: { loaded, completed, error }
	}: Infinitable.RefreshEvent) {
		try {
			page = 1;
			const { data, depleted } = await loadItems();
			depleted ? completed(data) : loaded(data);
		} catch (e) {
			error();
		}
	}

	async function searchHandler({ value, loaded, completed, error }: Infinitable.SearchEventParam) {
		try {
			page = 1;
			const { data, depleted } = await loadItems(value);
			depleted ? completed(data) : loaded(data);
		} catch (e) {
			error();
		}
	}

	function onSelect({ detail }: Infinitable.SelectChangeEvent) {
		selectedTasks = detail.map((item) => item as TaskData);
		// Array.every returns true if the array is empty
		cancelDisabled = selectedTasks.every(({ state }) => isFinishedTaskState(state));
	}
</script>

<Infinitable.Root
	bind:this={table}
	bind:items
	rowHeight={36}
	search={{ type: 'server', onSearch: searchHandler, placeholder: 'Search tasks' }}
	refreshable
	selectable
	class="h-[60vh] min-h-[400px]"
	let:index
	on:select={onSelect}
	on:infinite={infiniteHandler}
	on:refresh={refreshHandler}
>
	<svelte:fragment slot="actionsStart" let:wrapper>
		<Button variant="ghost" on:click={() => alert('Mock action')} disabled={cancelDisabled}>
			<Trash size={16} />
			<span class="pl-2"> Cancel tasks </span>
		</Button>
	</svelte:fragment>

	<svelte:fragment slot="headers">
		{#each headers as header}
			<Infinitable.Header {header} />
		{/each}
	</svelte:fragment>

	{@const { id, name, project_name, state, created_at } = items[index]}
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
				class="inline-block h-2.5 w-2.5 rounded-full {taskStateData[state]?.color ?? 'bg-gray-500'}"
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
				<DropdownMenu.Item on:click={() => alert('Mock action')}>
					<Info size={16} />
					<span class="pl-2">Details</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item on:click={() => alert('Mock action')}>
					<Trash size={16} />
					<span class="pl-2">Cancel task</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</td>

	<svelte:fragment slot="completedEmpty">
		<ClipboardList size={32} />
		<p class="text-center font-medium">No tasks found</p>
	</svelte:fragment>

	<p slot="rowsDetail" let:rowCount let:selectedCount class="my-1 text-sm text-gray-500">
		{rowCount} of {totalCount} task{rowCount === 1 ? '' : 's'} shown, {selectedCount} selected
	</p>
</Infinitable.Root>
