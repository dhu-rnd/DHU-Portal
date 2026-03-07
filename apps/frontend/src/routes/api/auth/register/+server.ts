import { createId } from "@paralleldrive/cuid2";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/types";
import { error, json } from "@sveltejs/kit";
import { uint8ArrayToBase64 } from "$lib/server/crypto";
import { getRequiredEnv } from "$lib/server/env";
import type { RequestHandler } from "./$types";

const REGISTRATION_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const POST: RequestHandler = async ({
	request,
	locals: { session },
}) => {
	const body: { username?: string } = await request.json();
	const userName = body.username?.trim();

	if (!userName) return error(400, "Parameter missing");
	if (userName.length > 64) return error(400, "Username too long");

	const pendingUserId = createId();
	const { rpName, rpId } = getRequiredEnv();

	const userIdBytes = new TextEncoder().encode(pendingUserId);
	const userIdBase64 = uint8ArrayToBase64(userIdBytes);

	const options: PublicKeyCredentialCreationOptionsJSON =
		await generateRegistrationOptions({
			rpName,
			rpID: rpId,
			userName,
			userID: userIdBytes,
			attestationType: "none",
			excludeCredentials: undefined,
			authenticatorSelection: {
				residentKey: "required",
				userVerification: "preferred",
				authenticatorAttachment: "platform",
			},
		});

	session.setData({
		userId: undefined,
		pendingUserId,
		pendingUserName: userName,
		webauthnUserId: userIdBase64,
		challenge: options.challenge,
		challengeType: "registration",
		challengeExpiresAt: Date.now() + REGISTRATION_CHALLENGE_TTL_MS,
	});
	session.save();

	return json({ options });
};
