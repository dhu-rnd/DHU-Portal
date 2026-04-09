import { env as publicEnv } from "$env/dynamic/public";

export function getRequiredEnv() {
	const rpId = publicEnv.PUBLIC_RP_ID;
	const origin = publicEnv.PUBLIC_ORIGIN;
	const rpName = publicEnv.PUBLIC_RP_NAME || "DHU Portal";

	if (!rpId || !origin) {
		throw new Error("Missing required environment variables: PUBLIC_RP_ID and PUBLIC_ORIGIN must be set");
	}

	return { rpId, origin, rpName };
}
