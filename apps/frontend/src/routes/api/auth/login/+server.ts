import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { json } from "@sveltejs/kit";
import { getRequiredEnv } from "$lib/server/env";
import type { RequestHandler } from "./$types";

const AUTHENTICATION_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const GET: RequestHandler = async ({ locals: { session } }) => {
	const { rpId } = getRequiredEnv();

	const options = await generateAuthenticationOptions({
		rpID: rpId,
		userVerification: "preferred",
		allowCredentials: [],
	});

	session.setData({
		challenge: options.challenge,
		challengeType: "authentication",
		challengeExpiresAt: Date.now() + AUTHENTICATION_CHALLENGE_TTL_MS,
	});
	session.save();

	return json({ options });
};
