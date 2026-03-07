import {
	type VerifiedAuthenticationResponse,
	verifyAuthenticationResponse,
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
	const challengeType = session.data.challengeType;
	const challengeExpiresAt = session.data.challengeExpiresAt;
	const { origin, rpId } = getRequiredEnv();

	const clearChallenge = () => {
		session.setData({
			challenge: undefined,
			challengeType: undefined,
			challengeExpiresAt: undefined,
		});
		session.save();
	};

	if (!expectedChallenge || challengeType !== "authentication") {
		clearChallenge();
		return json(
			{ error: "No challenge found in session" },
			{ status: 400, statusText: "Bad Request" },
		);
	}

	if (!challengeExpiresAt || challengeExpiresAt < Date.now()) {
		clearChallenge();
		return json(
			{ error: "Challenge expired" },
			{ status: 400, statusText: "Bad Request" },
		);
	}

	const supabase = getSupabase();

	const { data: passkey, error: passkeyError } = await supabase
		.from("passkeys")
		.select("*")
		.eq("id", response.id)
		.single<Passkey>();

	if (passkeyError) {
		console.error("Failed to load passkey:", passkeyError);
		clearChallenge();
		return json(
			{ error: "Failed to load passkey" },
			{ status: 500, statusText: "Internal Server Error" },
		);
	}

	if (!passkey) {
		clearChallenge();
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
		clearChallenge();
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
	clearChallenge();

	if (verified) {
		await supabase
			.from("passkeys")
			.update({ counter: newCounter })
			.eq("id", passkey.id);

		session.setData({ userId: passkey.user_id });
		session.save();
	}

	return json({ verified });
};
