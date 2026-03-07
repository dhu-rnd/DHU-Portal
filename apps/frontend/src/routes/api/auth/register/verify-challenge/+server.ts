import {
	type VerifiedRegistrationResponse,
	verifyRegistrationResponse,
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
	const challengeType = session.data.challengeType;
	const challengeExpiresAt = session.data.challengeExpiresAt;
	const pendingUserId = session.data.pendingUserId;
	const pendingUserName = session.data.pendingUserName;
	const webauthnUserId = session.data.webauthnUserId;
	const { origin, rpId } = getRequiredEnv();

	const clearRegistrationState = () => {
		session.setData({
			challenge: undefined,
			challengeType: undefined,
			challengeExpiresAt: undefined,
			pendingUserId: undefined,
			pendingUserName: undefined,
			webauthnUserId: undefined,
		});
		session.save();
	};

	if (!expectedChallenge || challengeType !== "registration") {
		clearRegistrationState();
		return json(
			{ error: "No challenge found in session" },
			{ status: 400, statusText: "Bad Request" },
		);
	}

	if (!challengeExpiresAt || challengeExpiresAt < Date.now()) {
		clearRegistrationState();
		return json(
			{ error: "Challenge expired" },
			{ status: 400, statusText: "Bad Request" },
		);
	}

	if (!pendingUserId || !pendingUserName || !webauthnUserId) {
		clearRegistrationState();
		return json(
			{ error: "Registration session is invalid" },
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
		clearRegistrationState();
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
	clearRegistrationState();

	if (verified && registrationInfo) {
		const supabase = getSupabase();
		const { credential, credentialDeviceType, credentialBackedUp } =
			registrationInfo;

		const { error: userError } = await supabase.from("users").insert({
			id: pendingUserId,
			name: pendingUserName,
		});

		if (userError) {
			console.error("Failed to save user:", userError);
			return json(
				{ error: "Failed to save user" },
				{ status: 500, statusText: "Internal Server Error" },
			);
		}

		const { error: dbError } = await supabase.from("passkeys").insert({
			id: credential.id,
			user_id: pendingUserId,
			webauthn_user_id: webauthnUserId,
			public_key: uint8ArrayToBase64(credential.publicKey),
			counter: credential.counter,
			transports: credential.transports?.join(",") ?? null,
			device_type: credentialDeviceType,
			backed_up: credentialBackedUp,
		});

		if (dbError) {
			console.error("Failed to save passkey:", dbError);
			await supabase.from("users").delete().eq("id", pendingUserId);
			return json(
				{ error: "Failed to save passkey" },
				{ status: 500, statusText: "Internal Server Error" },
			);
		}

		session.setData({
			userId: pendingUserId,
		});
		session.save();
	}

	return json({ verified });
};
