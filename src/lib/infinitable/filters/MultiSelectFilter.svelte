<script lang="ts">
	import InfinitableAction from '../InfinitableAction.svelte';
	import type { FilterOption } from '../types.js';

	export let value: FilterOption[];
	export let options: FilterOption[];
	let internalOption = options.map((option) => ({
		value: option,
		checked: value.includes(option)
	}));
	let allChecked = internalOption.every((option) => option.checked);

	function setValue() {
		value = internalOption.reduce(
			(acc, option) => {
				if (option.checked) {
					acc.push(option.value);
				}
				return acc;
			},
			[] as typeof value
		);
	}

	function toggleAll() {
		allChecked = !allChecked;
		internalOption = internalOption.map((option) => {
			option.checked = allChecked;
			return option;
		});
		setValue();
	}

	function invert() {
		internalOption = internalOption.map((option) => {
			option.checked = !option.checked;
			return option;
		});
		allChecked = internalOption.every((option) => option.checked);
		setValue();
	}

	function onChange() {
		setValue();
		allChecked = internalOption.every((option) => option.checked);
	}
</script>

<div class="space-y-2 pb-2">
	<div
		class="sticky left-0 top-0 mb-2 flex w-full items-center justify-between border-b bg-white p-2"
	>
		<label class="flex grow items-start">
			<input
				type="checkbox"
				value="all"
				checked={allChecked}
				on:change={toggleAll}
				class="mt-0.5 rounded-[3px]"
			/>
			<span class="pl-2">Select all</span>
		</label>
		<InfinitableAction on:click={invert} class="ml-2 font-medium">
			Invert selection
		</InfinitableAction>
	</div>
	{#each internalOption ?? [] as option}
		<label class="flex items-start px-2">
			<input
				type="checkbox"
				value={option.value.name}
				bind:checked={option.checked}
				on:change={onChange}
				class="mt-0.5 rounded-[3px]"
			/>
			<span class="pl-2">{option.value.label}</span>
		</label>
	{/each}
</div>
