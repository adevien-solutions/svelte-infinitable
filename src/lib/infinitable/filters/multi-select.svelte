<script lang="ts">
	import { tick } from 'svelte';
	import Button from '../../components/ui/button/button.svelte';
	import { Checkbox } from '../../components/ui/checkbox/index.js';
	import { Label } from '../../components/ui/label/index.js';
	import type { FilterOption } from '../types.js';

	type Props = {
		value: FilterOption[];
		options: FilterOption[];
	};

	let { value = $bindable([]), options = [] }: Props = $props();
	let internalOption = $state(
		options.map((option) => ({
			value: option,
			checked: value.includes(option)
		}))
	);
	// svelte-ignore state_referenced_locally
	let allChecked = $state(internalOption.every((option) => option.checked));

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

	async function toggleAll() {
		await tick();
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

	async function onChange() {
		await tick();
		setValue();
		allChecked = internalOption.every((option) => option.checked);
	}
</script>

<div class="space-y-2 pb-2">
	<div
		class="sticky left-0 top-0 mb-2 flex w-full items-center justify-between border-b bg-white p-2"
	>
		<Label class="flex items-center">
			<Checkbox checked={allChecked} onclick={toggleAll} />
			<span class="pl-2 font-normal">Select all</span>
		</Label>
		<Button variant="ghost" size="sm" onclick={invert} class="ml-2 h-7 px-2">
			Invert selection
		</Button>
	</div>
	<div class="space-y-2 px-2">
		{#each internalOption ?? [] as option}
			<Label class="flex items-center">
				<Checkbox bind:checked={option.checked} onclick={onChange} />
				<span class="pl-2 font-normal">{option.value.label}</span>
			</Label>
		{/each}
	</div>
</div>
