<script lang="ts">
import AuthButton from "$lib/components/AuthButton.svelte";
import type { LayoutServerData } from "./$types";

const { data }: { data: LayoutServerData } = $props();
</script>

{#if data.user}
	<p>{data.user.name}さん、こんにちは！</p>
{/if}

<AuthButton user={data.user} />

<p><a href="/register">ユーザー登録</a></p>
