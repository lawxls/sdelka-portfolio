import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, test, vi } from "vitest";
import { server } from "@/test-msw";
import { mockHostname } from "@/test-utils";
import { setTokens } from "./auth";
import { login, logout, parseApiError } from "./auth-api";

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("login", () => {
	test("sends POST to /api/v1/auth/login with email and password", async () => {
		mockHostname("acme.localhost");
		let capturedBody: unknown;
		server.use(
			http.post("/api/v1/auth/login", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ access: "a-token", refresh: "r-token", user: { email: "a@b.com" } });
			}),
		);

		const result = await login("a@b.com", "pass123");
		expect(capturedBody).toEqual({ email: "a@b.com", password: "pass123" });
		expect(result).toEqual({ access: "a-token", refresh: "r-token", user: { email: "a@b.com" } });
	});

	test("throws on 401 with parsed error body", async () => {
		mockHostname("acme.localhost");
		server.use(
			http.post("/api/v1/auth/login", () => {
				return HttpResponse.json({ detail: "Неверный email или пароль" }, { status: 401 });
			}),
		);

		await expect(login("a@b.com", "wrong")).rejects.toMatchObject({
			status: 401,
			body: { detail: "Неверный email или пароль" },
		});
	});
});

describe("logout", () => {
	test("sends POST to /api/v1/auth/logout with refresh token", async () => {
		mockHostname("acme.localhost");
		setTokens("access-t", "refresh-t");
		let capturedBody: unknown;
		let capturedAuth: string | null = null;
		server.use(
			http.post("/api/v1/auth/logout", async ({ request }) => {
				capturedBody = await request.json();
				capturedAuth = request.headers.get("Authorization");
				return new HttpResponse(null, { status: 204 });
			}),
		);

		await logout();
		expect(capturedBody).toEqual({ refresh: "refresh-t" });
		expect(capturedAuth).toBe("Bearer access-t");
	});
});

describe("parseApiError", () => {
	test("parses field-level errors", () => {
		const result = parseApiError({ email: "Уже существует", password: "Слишком короткий" });
		expect(result).toEqual({
			fieldErrors: { email: "Уже существует", password: "Слишком короткий" },
			detail: null,
		});
	});

	test("parses detail error", () => {
		const result = parseApiError({ detail: "Неверный email или пароль" });
		expect(result).toEqual({
			fieldErrors: {},
			detail: "Неверный email или пароль",
		});
	});

	test("handles null/undefined body", () => {
		expect(parseApiError(null)).toEqual({ fieldErrors: {}, detail: null });
		expect(parseApiError(undefined)).toEqual({ fieldErrors: {}, detail: null });
	});

	test("handles mixed body with detail and field errors", () => {
		const result = parseApiError({ detail: "Error", email: "Bad" });
		expect(result).toEqual({
			fieldErrors: { email: "Bad" },
			detail: "Error",
		});
	});
});
