import {
	verifyRegistrationResponse,
	type VerifiedRegistrationResponse,
} from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { json } from "@sveltejs/kit";
import { uint8ArrayToBase64 } from "$lib/server/crypto";
import { getRequiredEnv } from "$lib/server/env";
import { getSupabase } from "$lib/server/supabase";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({
	request,
	locals: { session },
}) => {
	const registrationResponseJSON: RegistrationResponseJSON =
		await request.json();
	const expectedChallenge = session.data.challenge;
	const { origin, rpId } = getRequiredEnv();

	if (!expectedChallenge) {
		return json(
			{ error: "No challenge found in session" },
			{ status: 400, statusText: "Bad Request" },
		);
	}

	let verification: VerifiedRegistrationResponse;
	try {
		verification = await verifyRegistrationResponse({
			response: registrationResponseJSON,
			expectedChallenge,
			expectedOrigin: origin,
			expectedRPID: rpId,
		});
	} catch (err) {
		console.error("Registration verification failed:", err);
		return json(
			{
				error: "Verification failed",
				details: err instanceof Error ? err.message : "Unknown error",
			},
			{ status: 400, statusText: "Bad Request" },
		);
	}

	const { verified, registrationInfo } = verification;

	if (verified && registrationInfo) {
		const supabase = getSupabase();

		const userId = session.data.userId ?? "";
		const webauthnUserId = session.data.webauthnUserId ?? "";
		const { credential, credentialDeviceType, credentialBackedUp } =
			registrationInfo;

		const { error: dbError } = await supabase.from("passkeys").insert({
			id: credential.id,
			user_id: userId,
			webauthn_user_id: webauthnUserId,
			public_key: uint8ArrayToBase64(credential.publicKey),
			counter: credential.counter,
			transports: credential.transports?.join(",") ?? null,
			device_type: credentialDeviceType,
			backed_up: credentialBackedUp,
		});

		if (dbError) {
			console.error("Failed to save passkey:", dbError);
			return json(
				{ error: "Failed to save passkey" },
				{ status: 500, statusText: "Internal Server Error" },
			);
		}

		// Clear challenge after successful registration
		session.setData({ userId, challenge: undefined, webauthnUserId: undefined });
		session.save();
	}

	return json({ verified });
};
