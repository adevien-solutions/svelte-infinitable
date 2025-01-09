<script lang="ts">
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { twMerge } from 'tailwind-merge';
	import Button from '../components/ui/button/button.svelte';
	import { buttonVariants } from '../components/ui/button/index.js';
	import * as Popover from '../components/ui/popover/index.js';
	import * as Tooltip from '../components/ui/tooltip/index.js';
	import { cn } from '../components/utils.js';
	import type { SortDirection, TableHeader, WithRequired } from '../types/index.js';
	import { getInfiniteTableContext } from './context.js';
	import * as Filter from './filters/index.js';
	import InfinitableFilterIcon from './infinitable-filter-icon.svelte';
	import { debounce, isFilterHeader, uniqueId } from './utils.svelte.js';

	type Props = {
		header: TableHeader;
		class?: string;
		children?: Snippet;
		[key: string]: any;
	};

	let { header, class: c = '', children, ...rest }: Props = $props();
	const {
		sorting,
		onFilterMount,
		onFilterDestroy,
		onFilterChange,
		onSortChange,
		resetFlag,
		element: { table }
	} = getInfiniteTableContext();
	const id = uniqueId(header.label);
	const filter = $state(
		isFilterHeader(header)
			? {
					value: header.filter.value as any,
					defaultValue: header.filter.value,
					isDefault: true
				}
			: undefined
	);
	let width: string | number = $state('auto');
	let elementWidth: number = $state(0);
	let lastResetFlag = $state($resetFlag);
	let sortDirection: SortDirection | undefined = $state(undefined);

	$effect(() => {
		elementWidth;
		onResize();
	});

	$effect(() => {
		if (lastResetFlag !== $resetFlag) {
			lastResetFlag = $resetFlag;
			if (isFilterHeader(header) && filter) {
				header.filter.value = filter.value = filter.defaultValue;
				filter.isDefault = true;
			}
			updateFilter(true);
		}
	});

	$effect(() => {
		if (sortDirection && $sorting?.id !== id) {
			sortDirection = undefined;
		}
	});

	onMount(() => {
		if (isFilterHeader(header)) {
			onFilterMount(header);
		}
	});

	onDestroy(() => {
		if (isFilterHeader(header)) {
			onFilterDestroy(header);
		}
	});

	function reset(): void {
		if (isFilterHeader(header) && filter) {
			filter.value = header.filter.value = filter.defaultValue;
		}
		updateIsDefaultFilter();
		updateFilter();
	}

	function save(): void {
		if (isFilterHeader(header) && filter) {
			header.filter.value = filter.value;
		}
		updateIsDefaultFilter();
		updateFilter();
	}

	function updateIsDefaultFilter(): void {
		if (!(isFilterHeader(header) && filter)) {
			return;
		}

		if (header.filter.mode === 'custom') {
			filter.isDefault = header.filter.isDefaultValue(header.filter.value as any);
		} else {
			try {
				const currentValue = JSON.stringify(header.filter.value);
				const defaultValue = JSON.stringify(filter.defaultValue);
				filter.isDefault = currentValue === defaultValue;
			} catch (error) {
				filter.isDefault = header.filter.value === filter.defaultValue;
			}
		}
	}

	function updateFilter(isUserReset = false): void {
		if (!(isFilterHeader(header) && filter)) {
			return;
		}

		const detail = { header, isDefault: filter.isDefault };
		onFilterChange(detail, isUserReset);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!isFilterHeader(header)) {
			return;
		}

		if (e.key === 'Enter') {
			save();
		}
	}

	function sort() {
		const headerSnap = $state.snapshot(header) as WithRequired<TableHeader, 'sort'>;
		if (!headerSnap.sort) {
			return;
		}

		if (sortDirection) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortDirection = headerSnap.sort.defaultDirection ?? 'asc';
		}

		onSortChange({
			id,
			header: headerSnap,
			direction: sortDirection
		});
	}

	const onResize = debounce(() => {
		setWidth();
	}, 50);

	function setWidth(): void {
		const { style } = header;
		// Default to `auto` width if no style is provided
		if (!style) {
			return updateWidth('auto');
		}

		// Check for undefined `width` and `minWidth`
		if (style.width === undefined) {
			if (style.minWidth === undefined) {
				return updateWidth('auto');
			}

			return setMinGuardedWidth('auto', style.minWidth);
		}

		const widthProperty = typeof style.width === 'number' ? `${style.width}px` : style.width;
		if (style.minWidth === undefined) {
			return updateWidth(widthProperty);
		}

		return setMinGuardedWidth(widthProperty, style.minWidth);
	}

	/**
	 * Sets the width of the current table header cell to `widthProperty`,
	 * unless the width would be less than the provided `minWidth`,
	 * in which case the width is set to `minWidth`.
	 */
	function setMinGuardedWidth(widthProperty: string, minWidth: number): void {
		const currentWidth = speculateWidth(widthProperty) ?? elementWidth ?? 0;
		if (currentWidth < minWidth) {
			return updateWidth(`${minWidth}px`);
		} else {
			return updateWidth(widthProperty);
		}
	}

	/**
	 * Updates the `width` variabe, but only if it doesn't have the same value already.
	 * This is to prevent unnecessary re-renders.
	 */
	function updateWidth(value: typeof width): void {
		if (width === value) {
			return;
		}
		width = value;
	}

	/**
	 * Returns the width of the current table header cell in pixels,
	 * as if it's width was set to the value provided.
	 *
	 * @param widthProperty The width CSS property to set on the temporary table header cell.
	 */
	function speculateWidth(widthProperty: string = 'auto'): number | undefined {
		if (!$table?.parentElement) return;

		const wrapper = $table.parentElement;
		const tempTable = $table.cloneNode(true) as HTMLTableElement;
		const tempHeader = tempTable.querySelector<HTMLTableCellElement>(
			`[data-infinitable-header-label="${header.label}"]`
		);
		if (!tempHeader) return;

		tempTable.style.opacity = '0';
		tempTable.style.position = 'absolute';
		tempTable.style.zIndex = '-999';
		tempTable.style.left = '0';
		tempTable.style.width = '100%';
		tempHeader.style.width = widthProperty;

		wrapper.appendChild(tempTable);
		const headerWidth = tempHeader.clientWidth;
		wrapper.removeChild(tempTable);
		return headerWidth;
	}
</script>

<th
	bind:clientWidth={elementWidth}
	onkeydown={handleKeyDown}
	class={twMerge('text-left font-semibold', c)}
	style="width: {width};"
	data-infinitable-header-label={header.label}
	{...rest}
>
	<div class="flex items-center justify-start gap-1.5">
		{#if header.sort}
			<Tooltip.Provider delayDuration={200}>
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button {...props} onclick={sort} variant="link" class="h-7 p-0">
								{header.label}
								{#if $sorting?.id === id}
									{#if $sorting.direction === 'asc'}
										<span in:fade|local={{ duration: 200 }}>
											<ChevronUp size={16} />
										</span>
									{:else if $sorting.direction === 'desc'}
										<span in:fade|local={{ duration: 200 }}>
											<ChevronDown size={16} />
										</span>
									{/if}
								{/if}
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content class="font-normal">
						<p>
							Sort
							{#if $sorting?.id === id}
								{#if $sorting?.direction === 'asc'}
									descending
								{:else}
									ascending
								{/if}
							{:else if header.sort}
								{header.sort.defaultDirection === 'asc' ? 'ascending' : 'descending'}
							{/if}
							by {header.label.toLowerCase()}
						</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		{:else}
			<span class="font-semibold">
				{header.label}
			</span>
		{/if}
		{#if isFilterHeader(header) && filter}
			<Popover.Root>
				<Popover.Trigger>
					{#snippet child(popover)}
						<Tooltip.Provider delayDuration={200}>
							<Tooltip.Root>
								<Tooltip.Trigger>
									{#snippet child(tooltip)}
										<Button
											{...{ ...tooltip.props, ...popover.props }}
											variant="ghost"
											class="h-7 w-7 p-0"
										>
											<InfinitableFilterIcon showBadge={!filter.isDefault} />
										</Button>
									{/snippet}
								</Tooltip.Trigger>
								<Tooltip.Content class="font-normal">
									<p>Open filter</p>
								</Tooltip.Content>
							</Tooltip.Root>
						</Tooltip.Provider>
					{/snippet}
				</Popover.Trigger>

				<Popover.Content class="p-0">
					<div class="relative max-h-[min(500px,100vh)] overflow-y-auto">
						{#if children}
							{@render children()}
						{:else if header.filter.type === 'text'}
							<Filter.Text bind:value={filter.value} placeholder={header.filter.placeholder} />
						{:else if header.filter.type === 'multiSelect'}
							<Filter.MultiSelect bind:value={filter.value} options={header.filter.options} />
						{/if}
					</div>

					<div class="flex items-center justify-between border-t p-1">
						<Popover.Close
							disabled={filter.isDefault}
							onclick={reset}
							class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 px-2')}
						>
							Reset
						</Popover.Close>
						<Popover.Close
							onclick={save}
							class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 px-2')}
						>
							Save
						</Popover.Close>
					</div>
				</Popover.Content>
			</Popover.Root>
		{/if}
	</div>
</th>
