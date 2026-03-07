import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { json } from "@sveltejs/kit";
import { getRequiredEnv } from "$lib/server/env";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals: { session } }) => {
	const { rpId } = getRequiredEnv();

	const options = await generateAuthenticationOptions({
		rpID: rpId,
		userVerification: "preferred",
		allowCredentials: [],
	});

	session.setData({
		challenge: options.challenge,
	});
	session.save();

	return json({ options });
};
