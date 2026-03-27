import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, test, vi } from "vitest";
import { server } from "@/test-msw";
import { mockHostname } from "@/test-utils";
import { setTokens } from "./auth";
import {
	checkEmail,
	confirmEmail,
	forgotPassword,
	login,
	logout,
	parseApiError,
	register,
	resetPassword,
	verifyInvitationCode,
} from "./auth-api";

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

describe("verifyInvitationCode", () => {
	test("sends POST with code and returns validity", async () => {
		mockHostname("acme.localhost");
		let capturedBody: unknown;
		server.use(
			http.post("/api/v1/auth/verify-invitation-code", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ valid: true });
			}),
		);

		const result = await verifyInvitationCode("ABC12");
		expect(capturedBody).toEqual({ code: "ABC12" });
		expect(result).toEqual({ valid: true });
	});

	test("returns valid false for invalid code", async () => {
		mockHostname("acme.localhost");
		server.use(
			http.post("/api/v1/auth/verify-invitation-code", () => {
				return HttpResponse.json({ valid: false });
			}),
		);

		const result = await verifyInvitationCode("WRONG");
		expect(result).toEqual({ valid: false });
	});
});

describe("checkEmail", () => {
	test("sends POST with email and returns exists status", async () => {
		mockHostname("acme.localhost");
		let capturedBody: unknown;
		server.use(
			http.post("/api/v1/auth/check-email", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ exists: false });
			}),
		);

		const result = await checkEmail("new@user.com");
		expect(capturedBody).toEqual({ email: "new@user.com" });
		expect(result).toEqual({ exists: false });
	});

	test("returns exists true for taken email", async () => {
		mockHostname("acme.localhost");
		server.use(
			http.post("/api/v1/auth/check-email", () => {
				return HttpResponse.json({ exists: true });
			}),
		);

		const result = await checkEmail("taken@user.com");
		expect(result).toEqual({ exists: true });
	});
});

describe("confirmEmail", () => {
	test("sends POST with token and returns message", async () => {
		mockHostname("acme.localhost");
		let capturedBody: unknown;
		server.use(
			http.post("/api/v1/auth/confirm-email", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ message: "Email confirmed successfully" });
			}),
		);

		const result = await confirmEmail("uid-token-123");
		expect(capturedBody).toEqual({ token: "uid-token-123" });
		expect(result).toEqual({ message: "Email confirmed successfully" });
	});

	test("throws on 400 with error body", async () => {
		mockHostname("acme.localhost");
		server.use(
			http.post("/api/v1/auth/confirm-email", () => {
				return HttpResponse.json({ detail: "Недействительный токен" }, { status: 400 });
			}),
		);

		await expect(confirmEmail("bad-token")).rejects.toMatchObject({
			status: 400,
			body: { detail: "Недействительный токен" },
		});
	});
});

describe("forgotPassword", () => {
	test("sends POST with email and returns message", async () => {
		mockHostname("acme.localhost");
		let capturedBody: unknown;
		server.use(
			http.post("/api/v1/auth/forgot-password", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ detail: "Password reset email sent" });
			}),
		);

		const result = await forgotPassword("user@example.com");
		expect(capturedBody).toEqual({ email: "user@example.com" });
		expect(result).toEqual({ detail: "Password reset email sent" });
	});
});

describe("resetPassword", () => {
	test("sends POST with token and password, returns message", async () => {
		mockHostname("acme.localhost");
		let capturedBody: unknown;
		server.use(
			http.post("/api/v1/auth/reset-password", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ detail: "Password has been reset" });
			}),
		);

		const result = await resetPassword("uid-token-123", "newSecure1");
		expect(capturedBody).toEqual({ token: "uid-token-123", password: "newSecure1" });
		expect(result).toEqual({ detail: "Password has been reset" });
	});

	test("throws on 400 with error body", async () => {
		mockHostname("acme.localhost");
		server.use(
			http.post("/api/v1/auth/reset-password", () => {
				return HttpResponse.json({ detail: "Недействительный или просроченный токен" }, { status: 400 });
			}),
		);

		await expect(resetPassword("bad-token", "newSecure1")).rejects.toMatchObject({
			status: 400,
			body: { detail: "Недействительный или просроченный токен" },
		});
	});
});

describe("register", () => {
	test("sends POST with registration data and returns tokens", async () => {
		mockHostname("acme.localhost");
		let capturedBody: unknown;
		server.use(
			http.post("/api/v1/auth/register", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json(
					{ access: "a-token", refresh: "r-token", user: { email: "new@user.com" } },
					{ status: 201 },
				);
			}),
		);

		const result = await register({
			email: "new@user.com",
			password: "securePass1",
			first_name: "Иван",
			phone: "+71234567890",
			invitation_code: "ABC12",
		});
		expect(capturedBody).toEqual({
			email: "new@user.com",
			password: "securePass1",
			first_name: "Иван",
			phone: "+71234567890",
			invitation_code: "ABC12",
		});
		expect(result).toEqual({ access: "a-token", refresh: "r-token", user: { email: "new@user.com" } });
	});

	test("throws on 400 with field-level errors", async () => {
		mockHostname("acme.localhost");
		server.use(
			http.post("/api/v1/auth/register", () => {
				return HttpResponse.json({ password: "Пароль слишком простой" }, { status: 400 });
			}),
		);

		await expect(
			register({
				email: "new@user.com",
				password: "123",
				first_name: "Иван",
				phone: "+71234567890",
				invitation_code: "ABC12",
			}),
		).rejects.toMatchObject({
			status: 400,
			body: { password: "Пароль слишком простой" },
		});
	});
});
