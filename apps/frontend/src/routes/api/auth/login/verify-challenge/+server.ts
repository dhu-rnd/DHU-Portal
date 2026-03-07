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
import {
	isAuthBlocked,
	recordAuthFailure,
	resetAuthFailures,
} from "$lib/server/session";
import { getSupabase } from "$lib/server/supabase";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({
	request,
	locals: { session },
}) => {
	// Check for brute-force lockout
	const lockStatus = isAuthBlocked(session.data);
	if (lockStatus.blocked) {
		const remainingMinutes = Math.ceil((lockStatus.remainingMs || 0) / 60000);
		return json(
			{
				error: "Too many failed attempts",
				message: `Account temporarily locked. Try again in ${remainingMinutes} minute(s).`,
			},
			{ status: 429, statusText: "Too Many Requests" },
		);
	}

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
		// Record authentication failure
		const updatedData = recordAuthFailure(session.data);
		session.setData(updatedData);
		session.save();

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

		// Reset auth failures on successful login
		const clearedData = resetAuthFailures(session.data);
		session.setData({ ...clearedData, userId: passkey.user_id });
		session.save();
	} else {
		// Record failure if verification returned false
		const updatedData = recordAuthFailure(session.data);
		session.setData(updatedData);
		session.save();
	}

	return json({ verified });
};
