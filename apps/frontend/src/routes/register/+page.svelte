<script lang="ts">
import { startRegistration } from "@simplewebauthn/browser";
import type { VerifiedRegistrationResponse } from "@simplewebauthn/server";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/types";
import { goto, invalidateAll } from "$app/navigation";

async function createPasskey() {
	const { options } = (await (
		await fetch("/api/auth/register", {
			method: "POST",
			credentials: "same-origin",
			headers: { "Content-Type": "application/json" },
		})
	)
		.json()
		.catch((err) => {
			console.error(err);
		})) as { options: PublicKeyCredentialCreationOptionsJSON | null };

	if (!options) return;

	const registrationResponse = await startRegistration({
		optionsJSON: options,
	});

	const verificationJSON: VerifiedRegistrationResponse = await (
		await fetch("/api/auth/register/verify-challenge", {
			method: "POST",
			credentials: "same-origin",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(registrationResponse),
		})
	).json();

	if (verificationJSON.verified && verificationJSON.userId) {
		await invalidateAll();
		goto("/");
	}
}
</script>

<div class="container">
	<h1>パスキー登録</h1>
	<p>ブラウザで認証器を使用してアカウントを作成します。</p>

	<div class="passkey-register">
		<button onclick={createPasskey}>
			パスキーで登録する
		</button>
	</div>

	<div class="note">
		<p>※ 同じデバイスで複数のパスキーを登録できます</p>
		<p>※ ユーザー名は必要ありません</p>
	</div>
</div>

<style>
.container {
	max-width: 400px;
	margin: 0 auto;
	padding: 2rem;
	text-align: center;
}

.passkey-register {
	margin: 2rem 0;
}

.passkey-register button {
	background: #0070f3;
	color: white;
	border: none;
	padding: 1rem 2rem;
	font-size: 1.1rem;
	border-radius: 8px;
	cursor: pointer;
	width: 100%;
	transition: background 0.2s;
}

.passkey-register button:hover {
	background: #0056b3;
}

.note {
	margin-top: 2rem;
	font-size: 0.9rem;
	color: #666;
}
</style>
