<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import {
		formatDateString,
		getProjects,
		getTasks,
		headers,
		isFinishedTaskState,
		taskStateData,
		type TaskData
	} from '$lib/example/index.js';
	import * as Infinitable from '$lib/infinitable/index.js';
	import EllipsisVertical from 'lucide-svelte/icons/ellipsis-vertical';
	import { onMount } from 'svelte';

	let table: Infinitable.Root;
	let selectedTasks: TaskData[] = [];
	let cancelDisabled = true;
	let page = 1;
	let totalCount = 0;

	onMount(setProjectHeaderOptions);

	async function setProjectHeaderOptions() {
		// Find the project header, so we don't rely on its position in the headers array
		const projectHeader = headers.find((h) => h.label === 'Project');
		if (
			!(projectHeader && 'filter' in projectHeader && projectHeader.filter.type === 'multiSelect')
		) {
			return;
		}

		// Mocking an asynchronous request to an endpoint that returns a list of projects
		const projects = await getProjects();
		const options: Infinitable.FilterOption[] = projects.map((p) => ({
			label: p.name,
			name: p.id
		}));
		projectHeader.filter.options = options;
		projectHeader.filter.value = options;
	}

	async function loadItems() {
		const { data, depleted, total } = await getTasks(page++);
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

	function onSelect({ detail }: Infinitable.SelectChangeEvent) {
		selectedTasks = detail.map((item) => item as TaskData);
		// Array.every returns true if the array is empty
		cancelDisabled = selectedTasks.every(({ state }) => isFinishedTaskState(state));
	}
</script>

<Infinitable.Root
	bind:this={table}
	search={{ property: ['name', 'id'], placeholder: 'Search tasks' }}
	rowHeight={36}
	refreshable
	selectable
	disabledRowMessage="This task cannot be canceled"
	class="bg- h-[60vh] min-h-[400px]"
	let:item
	let:selectedCount
	on:select={onSelect}
	on:infinite={infiniteHandler}
	on:refresh={refreshHandler}
>
	<svelte:fragment slot="actionsStart">
		<Tooltip.Root disableHoverableContent={!cancelDisabled}>
			<Tooltip.Trigger asChild>
				<Infinitable.Action
					on:click={() => {
						console.log('implement modal');
					}}
					disabled={cancelDisabled}
					icon="fa-light fa-trash"
				>
					Cancel tasks
				</Infinitable.Action>
			</Tooltip.Trigger>
			<Tooltip.Content>
				{#if selectedCount}
					None of the selected tasks can be canceled
				{:else}
					No tasks selected
				{/if}
			</Tooltip.Content>
		</Tooltip.Root>
	</svelte:fragment>

	<svelte:fragment slot="headers">
		{#each headers as header}
			<Infinitable.Header {header} />
		{/each}
	</svelte:fragment>

	{@const { id, name, project_name, state, created_at } = item}
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
		<EllipsisVertical size={18} />
	</td>

	<svelte:fragment slot="completed">
		{#if totalCount > 0}
			<div class="text-center text-sm text-gray-600">End of list</div>
		{:else}
			<div class="flex flex-col items-center justify-center gap-2 overflow-hidden pb-2 pt-10">
				<i class="fa-solid fa-lg fa-bars-progress text-6xl" />
				<div class="text-center">No tasks found</div>
			</div>
		{/if}
	</svelte:fragment>

	<p slot="rowsDetail" let:rowCount let:selectedCount class="my-1 text-sm text-gray-500">
		{rowCount} of {totalCount} task{rowCount === 1 ? '' : 's'} shown, {selectedCount} selected
	</p>
</Infinitable.Root>
