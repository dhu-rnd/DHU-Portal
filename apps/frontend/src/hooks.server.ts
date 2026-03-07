import type { Handle } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { decryptSession, encryptSession } from "$lib/server/session";

interface SessionData {
	userId?: string;
	challenge?: string;
	challengeType?: "registration" | "authentication";
	challengeExpiresAt?: number;
	pendingUserId?: string;
	pendingUserName?: string;
	webauthnUserId?: string;
}

export const handle: Handle = async ({ event, resolve }) => {
	const secret = env.SESSION_SECRET;
	if (!secret) {
		throw new Error(
			"SESSION_SECRET environment variable is required for session encryption",
		);
	}

	const cookieName = "session";

	// Read and decrypt session from cookie
	const raw = event.cookies.get(cookieName);
	let data: SessionData = {};
	if (raw) {
		const decrypted = decryptSession(raw, secret);
		try {
			data = JSON.parse(decrypted);
		} catch {
			data = {};
		}
	}

	// Provide session helpers via locals
	event.locals.session = {
		data,
		setData(newData: SessionData) {
			data = { ...data, ...newData };
		},
		save() {
			const encrypted = encryptSession(JSON.stringify(data), secret);
			event.cookies.set(cookieName, encrypted, {
				path: "/",
				httpOnly: true,
				sameSite: "lax",
				secure: process.env.NODE_ENV === "production",
				maxAge: 60 * 60 * 8, // 8 hours
			});
		},
		destroy() {
			data = {};
			event.cookies.delete(cookieName, { path: "/" });
		},
	};

	return resolve(event);
};
