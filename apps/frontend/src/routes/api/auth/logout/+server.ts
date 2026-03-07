import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals: { session } }) => {
	session.destroy();
	return json({});
};
