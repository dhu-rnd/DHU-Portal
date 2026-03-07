import { createId } from "@paralleldrive/cuid2";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/types";
import { error, json } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";
import { getSupabase } from "$lib/server/supabase";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({
	request,
	locals: { session },
}) => {
	const body: { username?: string } = await request.json();
	const userName = body.username;

	if (!userName) return error(400, "Parameter missing");

	const supabase = getSupabase();
	const userId = createId();

	const { data: user, error: dbError } = await supabase
		.from("users")
		.insert({ id: userId, name: userName })
		.select()
		.single();

	if (dbError || !user) {
		console.error("[register] DB error:", dbError);
		return error(500, "Failed to create user");
	}

	const options: PublicKeyCredentialCreationOptionsJSON =
		await generateRegistrationOptions({
			rpName: env.PUBLIC_RP_NAME ?? "DHU Portal",
			rpID: env.PUBLIC_RP_ID ?? "localhost",
			userName,
			userID: new TextEncoder().encode(user.id),
			attestationType: "none",
			excludeCredentials: undefined,
			authenticatorSelection: {
				residentKey: "required",
				userVerification: "preferred",
				authenticatorAttachment: "platform",
			},
		});

	session.setData({
		userId: user.id,
		challenge: options.challenge,
	});
	session.save();

	return json({ options });
};
