import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type {
	AuthenticationResponseJSON,
	AuthenticatorTransportFuture,
} from "@simplewebauthn/types";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";
import type { Passkey } from "$lib/server/db-types";
import { getSupabase } from "$lib/server/supabase";
import type { RequestHandler } from "./$types";

function decodePublicKey(base64: string): Uint8Array<ArrayBuffer> {
	const buf = Buffer.from(base64, "base64");
	const ab = new ArrayBuffer(buf.byteLength);
	const bytes = new Uint8Array(ab);
	for (let i = 0; i < buf.byteLength; i++) {
		bytes[i] = buf[i];
	}
	return bytes;
}

export const POST: RequestHandler = async ({
	request,
	locals: { session },
}) => {
	const response: AuthenticationResponseJSON = await request.json();
	const expectedChallenge = session.data.challenge;

	const supabase = getSupabase();

	const { data: passkey } = await supabase
		.from("passkeys")
		.select("*")
		.eq("id", response.id)
		.single<Passkey>();

	if (!expectedChallenge || !passkey)
		return json(
			{ error: "challenge or user not found" },
			{ status: 400, statusText: "Bad Request" },
		);

	const verification = await (async () => {
		try {
			return await verifyAuthenticationResponse({
				response,
				expectedChallenge,
				expectedOrigin: env.PUBLIC_ORIGIN!,
				expectedRPID: env.PUBLIC_RP_ID!,
				credential: {
					id: passkey.id,
					publicKey: decodePublicKey(passkey.public_key),
					counter: passkey.counter,
					transports: passkey.transports?.split(
						",",
					) as AuthenticatorTransportFuture[],
				},
			});
		} catch (err) {
			console.error(err);
		}
	})();

	if (!verification)
		return json(
			{ error: "challenge or user not found" },
			{ status: 400, statusText: "Bad Request" },
		);

	const { verified } = verification;
	const { newCounter } = verification.authenticationInfo;

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
