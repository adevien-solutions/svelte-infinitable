<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { twMerge } from 'tailwind-merge';
	import Checkbox from '../components/ui/checkbox/checkbox.svelte';
	import * as Tooltip from '../components/ui/tooltip/index.js';
	import { getInfiniteTableContext } from './context.js';

	type Props = {
		header?: boolean;
		selected?: boolean;
		disabled?: boolean;
		disabledMessage?: string;
		class?: string;
		onChange?: (selected: boolean) => void;
		children?: () => any;
		[key: string]: any;
	};

	let {
		header = false,
		selected = false,
		disabled = false,
		disabledMessage = 'This row cannot be selected',
		class: c = '',
		onChange = () => {},
		children,
		...rest
	}: Props = $props();
	const initial = selected;
	const { selectable, allSelected } = getInfiniteTableContext();

	$effect(() => {
		if (disabled) return;
		selected = $allSelected;
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

<tr
	class={twMerge(
		'relative duration-100',
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
			{#if disabled}
				{#if disabledMessage}
					<Tooltip.Provider delayDuration={200}>
						<Tooltip.Root>
							<Tooltip.Trigger>
								{@render disabledCheckbox()}
							</Tooltip.Trigger>
							<Tooltip.Content class="font-normal" side="right">
								<p>{disabledMessage}</p>
							</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				{:else}
					{@render disabledCheckbox()}
				{/if}
			{:else}
				<Checkbox
					bind:checked={selected}
					onclick={onClick}
					{disabled}
					class={header ? 'mt-1' : 'mt-0.5'}
				/>
			{/if}
		</svelte:element>
	{/if}
	{@render children?.()}
</tr>

{#snippet disabledCheckbox()}
	<Checkbox checked={selected} disabled={true} class={header ? 'mt-1' : 'mt-0.5'} />
{/snippet}
