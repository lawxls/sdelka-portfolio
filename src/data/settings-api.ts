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

export type SettingsPatch = Partial<Pick<UserSettings, "first_name" | "last_name" | "phone" | "mailing_allowed">>;

function buildSettingsHeaders(): Headers {
	const headers = new Headers();
	headers.set("X-Tenant", getTenant() ?? "");
	const token = getAccessToken();
	if (token) headers.set("Authorization", `Bearer ${token}`);
	return headers;
}

export async function fetchSettings(): Promise<UserSettings> {
	const response = await fetch(`${BASE}/settings`, { headers: buildSettingsHeaders() });

	if (!response.ok) {
		throw new ApiError(response.status, await response.json().catch(() => null));
	}

	return response.json();
}

export async function patchSettings(data: SettingsPatch): Promise<UserSettings> {
	const headers = buildSettingsHeaders();
	headers.set("Content-Type", "application/json");

	const response = await fetch(`${BASE}/settings`, {
		method: "PATCH",
		headers,
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		throw new ApiError(response.status, await response.json().catch(() => null));
	}

	return response.json();
}
