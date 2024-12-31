<script lang="ts">
	import { cn } from '@/utils.js';
	import { Calendar as CalendarPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CalendarPrimitive.GridProps = $props();
</script>

<CalendarPrimitive.Grid
	bind:ref
	class={cn('w-full border-collapse space-y-1', className)}
	{...restProps}
/>
