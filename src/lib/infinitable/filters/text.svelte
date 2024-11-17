<script lang="ts">
	export let value = '';
	export let placeholder = 'Enter text to filter by';
</script>

<div class="p-2">
	<input
		type="text"
		bind:value
		class="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none duration-200
		placeholder:text-gray-500 hover:border-gray-500 focus-visible:border-gray-500 focus-visible:ring-1
		focus-visible:ring-blue-400"
		{placeholder}
		{...$$restProps}
	/>
</div>
