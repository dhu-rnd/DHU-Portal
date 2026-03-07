import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals: { session } }) => {
	session.destroy();
	return json({});
};
