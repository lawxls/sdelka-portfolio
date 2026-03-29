import { ApiError } from "./api-error";
import { getAccessToken } from "./auth";
import { getTenant } from "./tenant";

const BASE = "/api/v1/auth";

export interface UserSettings {
	first_name: string;
	last_name: string;
	email: string;
	phone: string;
	avatar_icon: string;
	date_joined: string;
	mailing_allowed: boolean;
}

export async function fetchSettings(): Promise<UserSettings> {
	const headers = new Headers();
	headers.set("X-Tenant", getTenant() ?? "");
	const token = getAccessToken();
	if (token) headers.set("Authorization", `Bearer ${token}`);

	const response = await fetch(`${BASE}/settings`, { headers });

	if (!response.ok) {
		throw new ApiError(response.status, await response.json().catch(() => null));
	}

	return response.json();
}
