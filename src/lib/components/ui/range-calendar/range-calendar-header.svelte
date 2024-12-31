<script lang="ts">
	import { cn } from '@/utils.js';
	import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: RangeCalendarPrimitive.HeaderProps = $props();
</script>

<RangeCalendarPrimitive.Header
	bind:ref
	class={cn('relative flex w-full items-center justify-between pt-1', className)}
	{...restProps}
/>
