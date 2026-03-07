/**
 * Convert Uint8Array to Base64 string
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

/**
 * Decode Base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
	const buf = Buffer.from(base64, "base64");
	const ab = new ArrayBuffer(buf.byteLength);
	const bytes = new Uint8Array(ab);
	for (let i = 0; i < buf.byteLength; i++) {
		bytes[i] = buf[i];
	}
	return bytes;
}
