<script lang="ts">
	import { cn } from '@/utils.js';
	import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: RangeCalendarPrimitive.HeadCellProps = $props();
</script>

<RangeCalendarPrimitive.HeadCell
	bind:ref
	class={cn('w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground', className)}
	{...restProps}
/>
