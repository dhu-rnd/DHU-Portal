<script lang="ts">
import Button from "$lib/components/Button.svelte";
import ModalWindow from "$lib/components/ModalWindow.svelte";
import type { LayoutServerData } from "./$types";

const { data }: { data: LayoutServerData } = $props();
let isLoginModalOpen = $state(true);
</script>

<svelte:head>
	<title>Sign In | DHU Portal</title>

	<!-- Google Font Icons -->
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=arrow_forward,login,passkey,person"
	>
</svelte:head>

<main>
	<div class="content">
		<ModalWindow
			title="ログイン"
			class="login-modal"
			open={isLoginModalOpen}
			showOverlay={true}
			closeOnBackdrop={true}
			closeOnEscape={true}
			onClose={() => (isLoginModalOpen = false)}
		>
			{#snippet header()}
				<p class="login-title">
					<span class="material-symbols-outlined" style="font-size: 1rem">login</span>
					ログイン
				</p>
			{/snippet}

			<div class="mx-auto my-8 flex h-16 w-16 items-center justify-center">
				<span class="material-symbols-outlined text-slate-600" style="font-size: 3rem">person</span>
			</div>

			<form class="login-form" method="post" action="/auth/signin">
				<div class="login-field">
					<label for="username" class="login-input-label">学籍番号</label>
					<input
						id="username"
						type="text"
						name="username"
						autocomplete="username"
						inputmode="text"
						required
						placeholder="A00DC000"
						spellcheck="false"
						autocapitalize="none"
						class="userid-input-shell"
					>
				</div>

				<button type="submit" class="submit-icon-button" aria-label="続ける">
					<span class="material-symbols-outlined">arrow_forward</span>
				</button>
			</form>

			<div
				class="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400"
			>
				<span class="h-px flex-1 bg-zinc-300"></span>
				<span>or</span>
				<span class="h-px flex-1 bg-zinc-300"></span>
			</div>

			<div class="flex justify-center">
				<Button variant="strong" class="w-full">
					<span class="material-symbols-outlined">passkey</span>
					パスキーでログイン
				</Button>
			</div>

			{#if data.user}
				<p class="mt-5 text-center text-xs font-semibold text-emerald-700">
					{data.user.name}
					さんでログイン中です
				</p>
			{/if}
		</ModalWindow>

		{#if !isLoginModalOpen}
			<Button variant="strong" rounded onclick={() => (isLoginModalOpen = true)}>
				<span class="material-symbols-outlined">login</span>
				ログイン
			</Button>
		{/if}
	</div>
</main>

<style lang="scss">
.content {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100vh;
	width: 100vw;
}

.login-title {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	margin: 0;
}

.login-form {
	margin-top: 1.5rem;
	display: flex;
	align-items: flex-end;
	gap: 0.55rem;
}

.login-field {
	flex: 1;
	min-width: 0;
}

.login-input-label {
	display: inline-block;
	margin: 0 0 0.5rem 0.5rem;
	font-size: 0.75rem;
	font-weight: 400;
	color: rgb(71 85 105);
}

.userid-input-shell {
	border: none;

	display: flex;
	align-items: center;
	padding: 0.5rem 0.75rem;
	width: 100%;
	font-size: 1rem;
	border-radius: 0.75rem;
	outline: solid 1px #00000020;
	background: rgb(255 255 255 / 94%);
	transition: all 160ms ease;

	&:focus-within {
		outline-color: rgb(132 204 22);
		box-shadow: 0 0 0 2px rgb(163 230 53 / 50%);
	}
}


.login-input-prefix,
.login-input-suffix {
	padding-inline: 0.6rem;
	font-size: 0.8rem;
	font-weight: 600;
	color: rgb(113 113 122);
	white-space: nowrap;
	user-select: none;
}

.login-input-suffix {
	color: rgb(148 163 184);
}

.login-input-shell input {
	outline: none;
	box-shadow: none;
	appearance: none;
	background: transparent;
}

.login-input-shell input:focus,
.login-input-shell input:focus-visible {
	outline: none;
	box-shadow: none;
}

.submit-icon-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.58rem 0.66rem;
	border: 1px solid rgb(212 212 216);
	border-radius: 9999px;
	background: rgb(255 255 255 / 80%);
	color: rgb(64 64 64);
	cursor: pointer;
	transition:
		background-color 160ms ease,
		border-color 160ms ease,
		transform 160ms ease;
}

.submit-icon-button:hover {
	border-color: rgb(132 204 22);
	background: rgb(236 252 203);
	transform: translateY(-1px);
}

.submit-icon-button:focus-visible {
	outline: none;
	box-shadow: 0 0 0 3px rgb(163 230 53 / 27%);
}
</style>
