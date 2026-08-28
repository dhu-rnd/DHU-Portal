import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function deriveSessionKey(secret: string): Buffer {
	return createHash("sha256").update(secret, "utf8").digest();
}

/**
 * Encrypt session data
 * Format: {iv (base64)}.{authTag (base64)}.{encryptedData (base64)}
 */
export function encryptSession(data: string, secret: string): string {
	const key = deriveSessionKey(secret);
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);

	let encrypted = cipher.update(data, "utf8", "base64");
	encrypted += cipher.final("base64");

	const authTag = cipher.getAuthTag();

	// Combine: iv + authTag + encrypted
	return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted}`;
}

/**
 * Decrypt session data
 */
export function decryptSession(encrypted: string, secret: string): string {
	try {
		const [ivBase64, authTagBase64, encryptedData] = encrypted.split(".");
		if (!ivBase64 || !authTagBase64 || !encryptedData) {
			throw new Error("Invalid encrypted format");
		}

		const key = deriveSessionKey(secret);
		const iv = Buffer.from(ivBase64, "base64");
		const authTag = Buffer.from(authTagBase64, "base64");

		const decipher = createDecipheriv(ALGORITHM, key, iv);
		decipher.setAuthTag(authTag);

		let decrypted = decipher.update(encryptedData, "base64", "utf8");
		decrypted += decipher.final("utf8");

		return decrypted;
	} catch (error) {
		console.error("Failed to decrypt session:", error);
		return "{}";
	}
}

// Brute-force protection constants
const MAX_AUTH_FAILURES = 5;
const AUTH_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_FAIL_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const MAX_REGISTRATION_ATTEMPTS = 3;
const REGISTRATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

interface SessionData {
	authFailCount?: number | undefined;
	authFailTimestamp?: number | undefined;
	lockedUntil?: number | undefined;
	registrationAttempts?: number | undefined;
	registrationLastAttempt?: number | undefined;
	[key: string]: unknown;
}

/**
 * Check if authentication is blocked due to too many failures
 */
export function isAuthBlocked(sessionData: SessionData): {
	blocked: boolean;
	remainingMs?: number;
} {
	const now = Date.now();
	const lockedUntil = sessionData.lockedUntil;

	if (lockedUntil && lockedUntil > now) {
		return { blocked: true, remainingMs: lockedUntil - now };
	}

	return { blocked: false };
}

/**
 * Record authentication failure and apply lockout if threshold exceeded
 */
export function recordAuthFailure(sessionData: SessionData): SessionData {
	const now = Date.now();
	const lastFailTime = sessionData.authFailTimestamp || 0;
	const failCount = sessionData.authFailCount || 0;

	// Reset counter if outside failure window
	if (now - lastFailTime > AUTH_FAIL_WINDOW_MS) {
		return {
			...sessionData,
			authFailCount: 1,
			authFailTimestamp: now,
			lockedUntil: undefined,
		};
	}

	const newFailCount = failCount + 1;

	// Apply lockout if threshold exceeded
	if (newFailCount >= MAX_AUTH_FAILURES) {
		return {
			...sessionData,
			authFailCount: newFailCount,
			authFailTimestamp: now,
			lockedUntil: now + AUTH_LOCKOUT_DURATION_MS,
		};
	}

	return {
		...sessionData,
		authFailCount: newFailCount,
		authFailTimestamp: now,
	};
}

/**
 * Reset authentication failure tracking on successful login
 */
export function resetAuthFailures(sessionData: SessionData): SessionData {
	return {
		...sessionData,
		authFailCount: undefined,
		authFailTimestamp: undefined,
		lockedUntil: undefined,
	};
}

/**
 * Check if registration is rate-limited
 */
export function isRegistrationRateLimited(sessionData: SessionData): {
	limited: boolean;
	remainingMs?: number;
} {
	const now = Date.now();
	const attempts = sessionData.registrationAttempts || 0;
	const lastAttempt = sessionData.registrationLastAttempt || 0;

	// Reset counter if outside window
	if (now - lastAttempt > REGISTRATION_WINDOW_MS) {
		return { limited: false };
	}

	if (attempts >= MAX_REGISTRATION_ATTEMPTS) {
		const windowEnd = lastAttempt + REGISTRATION_WINDOW_MS;
		return { limited: true, remainingMs: windowEnd - now };
	}

	return { limited: false };
}

/**
 * Record registration attempt
 */
export function recordRegistrationAttempt(sessionData: SessionData): SessionData {
	const now = Date.now();
	const lastAttempt = sessionData.registrationLastAttempt || 0;
	const attempts = sessionData.registrationAttempts || 0;

	// Reset counter if outside window
	if (now - lastAttempt > REGISTRATION_WINDOW_MS) {
		return {
			...sessionData,
			registrationAttempts: 1,
			registrationLastAttempt: now,
		};
	}

	return {
		...sessionData,
		registrationAttempts: attempts + 1,
		registrationLastAttempt: now,
	};
}
