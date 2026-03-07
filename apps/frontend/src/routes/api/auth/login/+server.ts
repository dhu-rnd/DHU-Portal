import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals: { session } }) => {
	const options = await generateAuthenticationOptions({
		rpID: env.PUBLIC_RP_ID!,
		userVerification: "preferred",
		allowCredentials: [],
	});

	session.setData({
		challenge: options.challenge,
	});
	session.save();

	return json({ options });
};
