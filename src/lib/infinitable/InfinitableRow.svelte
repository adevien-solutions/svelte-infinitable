<script lang="ts">
	import { createEventDispatcher, getContext, onMount, tick } from 'svelte';
	import { twMerge } from 'tailwind-merge';
	import Checkbox from '../components/ui/checkbox/checkbox.svelte';
	import * as Tooltip from '../components/ui/tooltip/index.js';
	import { INFINITE_TABLE_CONTEXT_KEY, type InfiniteTableContext } from './context.js';

	export let header = false;
	export let selected = false;
	const initial = selected;
	export let disabled = false;
	/** Controls whether the HTML of the component is rendered or not. */
	export let hidden = false;
	export let disabledMessage: string | undefined = 'This row cannot be selected';
	let c = '';
	export { c as class };
	const { selectable, allSelected } = getContext<InfiniteTableContext>(INFINITE_TABLE_CONTEXT_KEY);
	const dispatch = createEventDispatcher<{ change: boolean }>();

	$: if (!header && !hidden) {
		selected = $allSelected;
	}

	async function onChange() {
		if (disabled) {
			return;
		}
		await tick();
		dispatch('change', selected);
	}

	onMount(() => {
		selected = initial;
	});
</script>

{#if !hidden}
	<tr
		class={twMerge(
			'duration-100',
			'[&>th]:py-2 [&>th]:pl-2 last:[&>th]:pr-2',
			'[&>td]:py-1 [&>td]:pl-2 last:[&>td]:pr-2',
			header
				? ''
				: selected
					? 'bg-blue-50 focus-within:bg-blue-100/80 hover:bg-blue-100/80'
					: 'focus-within:bg-gray-100 hover:bg-gray-100',
			c
		)}
		{...$$restProps}
	>
		{#if selectable}
			<svelte:element this={header ? 'th' : 'td'} class="w-[25px]">
				{#if disabled && disabledMessage}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Checkbox checked={selected} disabled={true} class={header ? 'mb-1' : 'mb-0.5'} />
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>{disabledMessage}</p>
						</Tooltip.Content>
					</Tooltip.Root>
				{:else}
					<Checkbox
						bind:checked={selected}
						on:click={onChange}
						{disabled}
						class={header ? 'mb-1' : 'mb-0.5'}
					/>
				{/if}
			</svelte:element>
		{/if}
		<slot />
	</tr>
{/if}
