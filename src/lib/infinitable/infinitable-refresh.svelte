<script lang="ts">
	import RotateCW from 'lucide-svelte/icons/rotate-cw';
	import { onMount, type Snippet } from 'svelte';
	import { Button, type ButtonSize, type ButtonVariant } from '../components/ui/button/index.js';
	import * as Tooltip from '../components/ui/tooltip/index.js';
	import type { RefreshHandler } from '../types/handlers.js';
	import { getInfiniteTableContext } from './context.js';
	import { createTickingRelativeTime } from './utils.svelte.js';

	type Props = {
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		class?: string;

		onRefresh?: RefreshHandler;

		children?: Snippet;
	};

	let {
		variant = 'ghost',
		size = 'default',
		disabled = false,
		class: c = '',
		onRefresh,
		children
	}: Props = $props();

	const {
		state: internalState,
		refresh,
		onRefreshMount,
		onRefreshDestroy
	} = getInfiniteTableContext();
	let lastRefresh = $state<ReturnType<typeof createTickingRelativeTime>>();

	onMount(() => {
		onRefreshMount(resetLastRefresh);

		return () => {
			onRefreshDestroy(resetLastRefresh);
			lastRefresh?.cancel();
		};
	});

	function resetLastRefresh() {
		lastRefresh?.cancel();
		lastRefresh = createTickingRelativeTime(new Date());
	}

	async function onClick() {
		refresh(onRefresh);
	}
</script>

<Tooltip.Provider delayDuration={200}>
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					{variant}
					{size}
					class={c}
					onclick={onClick}
					disabled={disabled || $internalState === 'loading'}
				>
					{#if children}
						{@render children()}
					{:else}
						<RotateCW size={16} class={$internalState === 'loading' ? 'animate-spin' : ''} />
						<span> Refresh </span>
					{/if}
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content class="font-normal">
			<p>
				Refreshed {lastRefresh?.value}
			</p>
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
