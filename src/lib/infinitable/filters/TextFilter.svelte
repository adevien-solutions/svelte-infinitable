<script lang="ts">
	export let value = '';
	export let placeholder = 'Enter text to filter by';
</script>

<div class="p-2">
	<input
		type="text"
		bind:value
		class="border border-gray-400 rounded-md px-2 py-1 w-full"
		{placeholder}
		{...$$restProps}
	/>
</div>
