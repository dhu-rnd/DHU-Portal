export interface User {
	id: string;
	name: string | null;
}

export interface Passkey {
	id: string;
	public_key: string; // base64 encoded
	user_id: string;
	webauthn_user_id: string;
	counter: number;
	device_type: string;
	backed_up: boolean;
	transports: string | null;
	created_at: string | null;
}
