<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { twMerge } from 'tailwind-merge';
	import Checkbox from '../components/ui/checkbox/checkbox.svelte';
	import * as Tooltip from '../components/ui/tooltip/index.js';
	import { getInfiniteTableContext } from './context.js';

	type Props = {
		header?: boolean;
		selected?: boolean;
		class?: string;
		disabled?: boolean;
		/** Controls whether the HTML of the component is rendered or not. */
		hidden?: boolean;
		disabledMessage?: string;
		onChange?: (selected: boolean) => void;
		children?: () => any;
		[key: string]: any;
	};

	let {
		header = false,
		selected = false,
		class: c = '',
		disabled = false,
		hidden = false,
		disabledMessage = 'This row cannot be selected',
		onChange = () => {},
		children,
		...rest
	}: Props = $props();
	const initial = selected;
	const { selectable, allSelected } = getInfiniteTableContext();

	$effect(() => {
		if (!header && !hidden) {
			selected = $allSelected;
		}
	});

	onMount(() => {
		selected = initial;
	});

	async function onClick() {
		if (disabled) {
			return;
		}
		await tick();
		onChange(selected);
	}
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
					? 'bg-blue-50 hover:bg-blue-100/80 focus-visible:bg-blue-100/80'
					: 'hover:bg-gray-100 focus-visible:bg-gray-100',
			c
		)}
		{...rest}
	>
		{#if selectable}
			<svelte:element this={header ? 'th' : 'td'} class="w-[25px]">
				{#if disabled && disabledMessage}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Checkbox checked={selected} disabled={true} class={header ? 'mt-1' : 'mt-0.5'} />
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>{disabledMessage}</p>
						</Tooltip.Content>
					</Tooltip.Root>
				{:else}
					<Checkbox
						bind:checked={selected}
						on:click={onClick}
						{disabled}
						class={header ? 'mt-1' : 'mt-0.5'}
					/>
				{/if}
			</svelte:element>
		{/if}
		{@render children?.()}
	</tr>
{/if}
