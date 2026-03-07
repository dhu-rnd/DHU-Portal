import type { LayoutServerLoad } from "./$types";
import type { User } from "$lib/server/db-types";
import { getSupabase } from "$lib/server/supabase";
import { env } from "$env/dynamic/private";

export const load: LayoutServerLoad = async ({ locals: { session } }) => {
	const { userId } = session.data;

	if (!userId || !env.SUPABASE_URL) {
		return { user: undefined };
	}

	try {
		const supabase = getSupabase();
		const { data: user } = await supabase
			.from("users")
			.select("*")
			.eq("id", userId)
			.single<User>();

		return { user: user ?? undefined };
	} catch (e) {
		console.error("Failed to fetch user:", e);
		return { user: undefined };
	}
};
