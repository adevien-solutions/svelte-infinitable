<script lang="ts">
	import { twMerge } from 'tailwind-merge';

	/** Needs to be an icon class name, eg: `fa-icon` */
	export let icon: `fa-${string}` | undefined = undefined;
	export let disabled = false;
	let c = '';
	export { c as class };
</script>

<button
	type="button"
	class={twMerge(
		'px-2 py-1.5 rounded-md duration-100 bg-transparent hover:bg-slate-400/20 focus:bg-slate-400/20 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
		c
	)}
	on:click
	{disabled}
	{...$$restProps}
>
	{#if icon}
		<i class="fa {icon}" />
	{/if}
	<span class="pl-1">
		<slot />
	</span>
</button>
