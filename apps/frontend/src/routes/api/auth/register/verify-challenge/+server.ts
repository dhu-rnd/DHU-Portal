import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";
import { getSupabase } from "$lib/server/supabase";
import type { RequestHandler } from "./$types";

function uint8ArrayToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

export const POST: RequestHandler = async ({
	request,
	locals: { session },
}) => {
	const registrationResponseJSON: RegistrationResponseJSON =
		await request.json();
	const expectedChallenge = session.data.challenge;

	if (!expectedChallenge)
		return json(
			{ error: "Parameters incorrect" },
			{ status: 400, statusText: "Bad Request" },
		);

	const verification = await (async () => {
		try {
			return await verifyRegistrationResponse({
				response: registrationResponseJSON,
				expectedChallenge,
				expectedOrigin: env.PUBLIC_ORIGIN!,
				expectedRPID: env.PUBLIC_RP_ID!,
			});
		} catch (err) {
			console.error(err);
		}
	})();

	if (!verification)
		return json(
			{ error: "Challenge verification failed" },
			{ status: 400, statusText: "Bad Request" },
		);

	const { verified, registrationInfo } = verification;

	if (verified && registrationInfo) {
		const supabase = getSupabase();

		const userId = session.data.userId ?? "";
		const { credential, credentialDeviceType, credentialBackedUp } =
			registrationInfo;

		const { error: dbError } = await supabase.from("passkeys").insert({
			id: credential.id,
			user_id: userId,
			webauthn_user_id: userId,
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

		session.setData({ userId });
		session.save();
	}

	return json({ verified });
};
