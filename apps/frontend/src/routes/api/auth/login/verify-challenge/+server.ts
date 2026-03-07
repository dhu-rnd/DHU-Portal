import {
	verifyAuthenticationResponse,
	type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
	AuthenticationResponseJSON,
	AuthenticatorTransportFuture,
} from "@simplewebauthn/types";
import { json } from "@sveltejs/kit";
import { base64ToUint8Array } from "$lib/server/crypto";
import type { Passkey } from "$lib/server/db-types";
import { getRequiredEnv } from "$lib/server/env";
import { getSupabase } from "$lib/server/supabase";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({
	request,
	locals: { session },
}) => {
	const response: AuthenticationResponseJSON = await request.json();
	const expectedChallenge = session.data.challenge;
	const { origin, rpId } = getRequiredEnv();

	if (!expectedChallenge) {
		return json(
			{ error: "No challenge found in session" },
			{ status: 400, statusText: "Bad Request" },
		);
	}

	const supabase = getSupabase();

	const { data: passkey } = await supabase
		.from("passkeys")
		.select("*")
		.eq("id", response.id)
		.single<Passkey>();

	if (!passkey) {
		return json(
			{ error: "Passkey not found" },
			{ status: 404, statusText: "Not Found" },
		);
	}

	let verification: VerifiedAuthenticationResponse;
	try {
		verification = await verifyAuthenticationResponse({
			response,
			expectedChallenge,
			expectedOrigin: origin,
			expectedRPID: rpId,
			credential: {
				id: passkey.id,
				publicKey: base64ToUint8Array(passkey.public_key),
				counter: passkey.counter,
				transports: (passkey.transports?.split(",") ||
					[]) as AuthenticatorTransportFuture[],
			},
		});
	} catch (err) {
		console.error("Authentication verification failed:", err);
		return json(
			{
				error: "Verification failed",
				details: err instanceof Error ? err.message : "Unknown error",
			},
			{ status: 400, statusText: "Bad Request" },
		);
	}

	const { verified } = verification;
	const { newCounter } = verification.authenticationInfo;

	if (verified) {
		await supabase
			.from("passkeys")
			.update({ counter: newCounter })
			.eq("id", passkey.id);

		// Clear challenge after successful authentication
		session.setData({ userId: passkey.user_id, challenge: undefined });
		session.save();
	}

	return json({ verified });
};
