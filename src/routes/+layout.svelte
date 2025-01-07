<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<main class="mx-auto max-w-5xl p-8">
	{@render children()}
</main>

<svelte:head>
	<title>Svelte Infinitable - virtual table component • Adevien</title>
</svelte:head>
