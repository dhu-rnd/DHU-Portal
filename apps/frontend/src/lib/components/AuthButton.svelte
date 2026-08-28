<script lang="ts">
import { startAuthentication } from "@simplewebauthn/browser";
import type { VerifiedAuthenticationResponse } from "@simplewebauthn/server";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/types";
import { invalidateAll } from "$app/navigation";

const { user }: { user: { id: string; name: string | null } | undefined } = $props();

// biome-ignore lint/correctness/noUnusedVariables: This function is used in the template
async function login() {
	const { options } = (await (await fetch("/api/auth/login")).json().catch((err) => {
		console.error(err);
	})) as { options: PublicKeyCredentialRequestOptionsJSON | null };

	if (!options) return;

	const authenticationResponse = await startAuthentication({
		optionsJSON: options,
	});

	const verificationJSON: VerifiedAuthenticationResponse = await (
		await fetch("/api/auth/login/verify-challenge", {
			method: "POST",
			credentials: "same-origin",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(authenticationResponse),
		})
	).json();

	if (verificationJSON.verified) {
		await invalidateAll();
	} else {
		throw new Error(`Verification failed: ${verificationJSON}`);
	}
}

// biome-ignore lint/correctness/noUnusedVariables: This function is used in the template
async function logout() {
	await fetch("/api/auth/logout", {
		method: "POST",
		credentials: "same-origin",
	});
	await invalidateAll();
}
</script>

{#if user?.id}
	<button type="button" onclick={logout}>ログアウトする</button>
{:else}
	<button type="button" onclick={login}>ログインする</button>
{/if}
