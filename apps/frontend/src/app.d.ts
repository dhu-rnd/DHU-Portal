// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		// interface Error {}

		interface Locals {
			session: {
				data: {
					userId?: string;
					challenge?: string;
					challengeType?: "registration" | "authentication";
					challengeExpiresAt?: number;
					pendingUserId?: string;
					pendingUserName?: string;
					webauthnUserId?: string;
				};
				setData(data: {
					userId?: string;
					challenge?: string;
					challengeType?: "registration" | "authentication";
					challengeExpiresAt?: number;
					pendingUserId?: string;
					pendingUserName?: string;
					webauthnUserId?: string;
				}): void;
				save(): void;
				destroy(): void;
			};
		}

		// interface PageData {}
		// interface PageState {}
	}
}

export {};
