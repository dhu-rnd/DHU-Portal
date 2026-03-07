import type { Handle } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

interface SessionData {
	userId?: string;
	challenge?: string;
}

export const handle: Handle = async ({ event, resolve }) => {
	const secret = env.SESSION_SECRET;
	const cookieName = "session";

	// Read session from cookie
	const raw = event.cookies.get(cookieName);
	let data: SessionData = {};
	if (raw) {
		try {
			data = JSON.parse(raw);
		} catch {
			data = {};
		}
	}

	// Provide session helpers via locals
	event.locals.session = {
		data,
		setData(newData: SessionData) {
			data = newData;
		},
		save() {
			event.cookies.set(cookieName, JSON.stringify(data), {
				path: "/",
				httpOnly: true,
				sameSite: "lax",
				secure: false, // set to true in production
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
