import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

/**
 * Encrypt session data
 */
export function encryptSession(data: string, secret: string): string {
	const key = Buffer.from(secret.padEnd(32, "0").slice(0, 32));
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

		const key = Buffer.from(secret.padEnd(32, "0").slice(0, 32));
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
