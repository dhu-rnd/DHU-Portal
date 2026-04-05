<script lang="ts">
import "uno.css";
import "./layout.css";
import "@unocss/reset/normalize.css";
import "@unocss/reset/sanitize/sanitize.css";
import "@unocss/reset/sanitize/assets.css";
import favicon from "$lib/assets/favicon.svg";

let { children } = $props();
</script>

<svelte:head>
	<title>DHU Portal</title>
	<link rel="icon" href={favicon}>
</svelte:head>
{@render children()}
