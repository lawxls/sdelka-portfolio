import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, test } from "vitest";
import { setTokens } from "@/data/auth";
import { server } from "@/test-msw";
import { mockHostname } from "@/test-utils";
import { fetchSettings } from "./settings-api";

beforeEach(() => {
	localStorage.clear();
	mockHostname("acme.localhost");
	setTokens("test-access", "test-refresh");
});

describe("fetchSettings", () => {
	test("calls GET /api/v1/auth/settings with auth headers", async () => {
		let capturedHeaders: Record<string, string> = {};

		server.use(
			http.get("/api/v1/auth/settings", ({ request }) => {
				capturedHeaders = {
					authorization: request.headers.get("Authorization") ?? "",
					tenant: request.headers.get("X-Tenant") ?? "",
				};
				return HttpResponse.json({
					first_name: "Иван",
					last_name: "Иванов",
					email: "ivan@example.com",
					phone: "+79991234567",
					avatar_icon: "blue",
					date_joined: "2024-01-15T10:00:00Z",
					mailing_allowed: true,
				});
			}),
		);

		const result = await fetchSettings();

		expect(capturedHeaders.authorization).toBe("Bearer test-access");
		expect(capturedHeaders.tenant).toBe("acme");
		expect(result).toEqual({
			first_name: "Иван",
			last_name: "Иванов",
			email: "ivan@example.com",
			phone: "+79991234567",
			avatar_icon: "blue",
			date_joined: "2024-01-15T10:00:00Z",
			mailing_allowed: true,
		});
	});

	test("throws on non-OK response", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => {
				return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 });
			}),
		);

		await expect(fetchSettings()).rejects.toThrow();
	});
});
