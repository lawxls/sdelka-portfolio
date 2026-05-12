import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RegisterInput } from "../domains/session";
import { AuthError, NetworkError, TooManyRequestsError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetIdCounter, _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { SessionClient } from "./session-client";
import { createHttpSessionClient } from "./session-http";
import { createInMemorySessionClient } from "./session-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 *
 * Slice #270 grew the surface to register, confirmEmail, and checkEmail. Slice
 * #273 added requestPasswordChange (authed-only no-body call backing the
 * settings "send reset link" CTA). The adapter behavior covered: login
 * success/401/403; refresh success/no-cookie; register success returns the
 * user without tokens; register with mismatched passwords / taken email
 * throws ValidationError; confirmEmail with invalid uid+token throws
 * ValidationError; checkEmail reports existence; throttled responses throw
 * TooManyRequestsError; requestPasswordChange resolves with no body.
 */

const SEED_USERS = [
	{
		email: "valid@example.com",
		password: "good-pass",
		user: { id: 7, email: "valid@example.com" },
	},
	{
		email: "unverified@example.com",
		password: "good-pass",
		user: { id: 8, email: "unverified@example.com" },
		verified: false,
	},
];

function validRegisterInput(overrides: Partial<RegisterInput> = {}): RegisterInput {
	return {
		email: "newuser@example.com",
		password: "fresh-pass-1",
		password_confirm: "fresh-pass-1",
		first_name: "Иван",
		last_name: "Иванов",
		phone: "+79991234567",
		...overrides,
	};
}

interface Adapter {
	name: string;
	build: () => SessionClient;
}

function memoryAdapter(): Adapter {
	return {
		name: "memory",
		build: () => createInMemorySessionClient({ users: SEED_USERS, refreshAvailable: true }),
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => {
		status: number;
		body?: unknown;
		headers?: Record<string, string>;
	};
}

function httpAdapter(): Adapter {
	let refreshCount = 0;

	const routes: HttpRoute[] = [
		{
			method: "POST",
			path: /^\/auth\/login\/$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { email: string; password: string };
				if (data.email === "throttled@example.com") {
					return { status: 429, body: { detail: "throttled" }, headers: { "retry-after": "60" } };
				}
				const seed = SEED_USERS.find((u) => u.email === data.email && u.password === data.password);
				if (!seed) return { status: 401, body: { code: "invalid_credentials" } };
				if (seed.verified === false) return { status: 403, body: { code: "email_not_verified" } };
				return {
					status: 200,
					body: { access: `access-${seed.user.id}`, refresh: `refresh-${seed.user.id}`, user: seed.user },
				};
			},
		},
		{
			method: "POST",
			path: /^\/auth\/refresh\/$/,
			respond: () => {
				refreshCount += 1;
				return { status: 200, body: { access: `access-refresh-${refreshCount}` } };
			},
		},
		{
			method: "POST",
			path: /^\/auth\/logout\/$/,
			respond: () => ({ status: 205 }),
		},
		{
			method: "POST",
			path: /^\/auth\/register\/$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as RegisterInput;
				if (data.password !== data.password_confirm) {
					return {
						status: 400,
						body: { password_confirm: [{ code: "passwords_do_not_match", message: "Mismatch" }] },
					};
				}
				if (SEED_USERS.some((u) => u.email === data.email)) {
					return {
						status: 400,
						body: { email: [{ code: "unique", message: "Already taken" }] },
					};
				}
				return { status: 201, body: { user: { id: 99, email: data.email } } };
			},
		},
		{
			method: "POST",
			path: /^\/auth\/confirm-email\/$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { uid: string; token: string };
				if (data.uid === "good-uid" && data.token === "good-token") {
					return {
						status: 200,
						body: {
							access: "access-confirmed",
							refresh: "refresh-confirmed",
							user: { id: 42, email: "confirmed@example.com" },
						},
					};
				}
				return { status: 400, body: { code: "invalid_or_expired_link" } };
			},
		},
		{
			method: "POST",
			path: /^\/auth\/check-email\/$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { email: string };
				const exists = SEED_USERS.some((u) => u.email === data.email);
				return { status: 200, body: { exists } };
			},
		},
		{
			method: "POST",
			path: /^\/auth\/resend-confirmation\/$/,
			// Anti-enumeration: identical 200 regardless of email validity.
			respond: () => ({ status: 200 }),
		},
		{
			method: "POST",
			path: /^\/auth\/forgot-password\/$/,
			// Anti-enumeration: identical 200 regardless of email validity.
			respond: () => ({ status: 200 }),
		},
		{
			method: "POST",
			path: /^\/auth\/request-password-change\/$/,
			respond: () => ({ status: 200 }),
		},
		{
			method: "POST",
			path: /^\/auth\/reset-password\/$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as {
					uid: string;
					token: string;
					new_password: string;
					new_password_confirm: string;
				};
				if (data.new_password !== data.new_password_confirm) {
					return {
						status: 400,
						body: { new_password_confirm: [{ code: "passwords_do_not_match", message: "Mismatch" }] },
					};
				}
				if (data.uid === "good-uid" && data.token === "good-token") {
					return { status: 204 };
				}
				return { status: 400, body: { code: "invalid_or_expired_link" } };
			},
		},
	];

	const fetchStub = vi.fn(async (input: string, init?: RequestInit) => {
		const method = init?.method ?? "GET";
		const path = new URL(input, "http://test").pathname + new URL(input, "http://test").search;
		const route = routes.find((r) => r.method === method && r.path.test(path));
		if (!route) throw new Error(`Unmatched ${method} ${input}`);
		const result = await route.respond({ url: input, init });
		const hasBody = result.body !== undefined && result.status !== 204;
		const headers = {
			...(hasBody ? { "content-type": "application/json" } : {}),
			...(result.headers ?? {}),
		};
		return new Response(hasBody ? JSON.stringify(result.body) : null, { status: result.status, headers });
	});

	const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null, getCsrfToken: () => null });

	return {
		name: "http",
		build: () => {
			refreshCount = 0;
			return createHttpSessionClient(http);
		},
	};
}

const adapters: Array<() => Adapter> = [() => memoryAdapter(), () => httpAdapter()];

describe.each(adapters.map((make) => [make().name, make]))("SessionClient contract — %s adapter", (_label, make) => {
	let client: SessionClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		_resetIdCounter();
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("login returns access and the user record on the happy path", async () => {
		const result = await client.login({ email: "valid@example.com", password: "good-pass" });
		expect(result.user.email).toBe("valid@example.com");
		expect(result.user.id).toBe(7);
		expect(typeof result.access).toBe("string");
		expect(result.access.length).toBeGreaterThan(0);
	});

	it("login with bad credentials throws AuthError(401)", async () => {
		try {
			await client.login({ email: "valid@example.com", password: "wrong" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
			expect((err as AuthError).status).toBe(401);
		}
	});

	it("login with unverified email throws AuthError(403)", async () => {
		try {
			await client.login({ email: "unverified@example.com", password: "good-pass" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
			expect((err as AuthError).status).toBe(403);
		}
	});

	it("refresh returns a fresh access token when the session is valid", async () => {
		const result = await client.refresh();
		expect(typeof result.access).toBe("string");
		expect(result.access.length).toBeGreaterThan(0);
	});

	it("two refreshes return distinct access tokens", async () => {
		const a = await client.refresh();
		const b = await client.refresh();
		expect(a.access).not.toBe(b.access);
	});

	it("logout resolves with no body on success", async () => {
		await expect(client.logout()).resolves.toBeUndefined();
	});

	it("register returns the user record without tokens on the happy path", async () => {
		const result = await client.register(validRegisterInput());
		expect(result.user.email).toBe("newuser@example.com");
		expect(typeof result.user.id).toBe("number");
		// AC: register on success returns the user (no tokens)
		expect((result as unknown as { access?: string }).access).toBeUndefined();
	});

	it("register with mismatched passwords throws ValidationError carrying passwords_do_not_match", async () => {
		try {
			await client.register(validRegisterInput({ password: "abcdefg1", password_confirm: "different" }));
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			const body = (err as ValidationError).body as { password_confirm?: Array<{ code: string }> };
			expect(body.password_confirm?.[0]?.code).toBe("passwords_do_not_match");
		}
	});

	it("register with an already-taken email throws ValidationError carrying unique", async () => {
		try {
			await client.register(validRegisterInput({ email: "valid@example.com" }));
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			const body = (err as ValidationError).body as { email?: Array<{ code: string }> };
			expect(body.email?.[0]?.code).toBe("unique");
		}
	});

	it("confirmEmail with invalid uid/token throws ValidationError carrying invalid_or_expired_link", async () => {
		try {
			await client.confirmEmail({ uid: "wrong-uid", token: "wrong-token" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			const body = (err as ValidationError).body as { code?: string };
			expect(body.code).toBe("invalid_or_expired_link");
		}
	});

	it("checkEmail returns exists: true for a known email", async () => {
		const result = await client.checkEmail("valid@example.com");
		expect(result.exists).toBe(true);
	});

	it("checkEmail returns exists: false for an unknown email", async () => {
		const result = await client.checkEmail("nobody@example.com");
		expect(result.exists).toBe(false);
	});

	it("resendConfirmation resolves for a known unverified email (anti-enumeration: 200)", async () => {
		await expect(client.resendConfirmation("unverified@example.com")).resolves.toBeUndefined();
	});

	it("resendConfirmation resolves for an unknown email (anti-enumeration: 200)", async () => {
		await expect(client.resendConfirmation("nobody@example.com")).resolves.toBeUndefined();
	});

	it("resendConfirmation resolves for an already-verified email (anti-enumeration: 200)", async () => {
		await expect(client.resendConfirmation("valid@example.com")).resolves.toBeUndefined();
	});

	it("forgotPassword resolves for a known email (anti-enumeration: 200)", async () => {
		await expect(client.forgotPassword({ email: "valid@example.com" })).resolves.toBeUndefined();
	});

	it("forgotPassword resolves for an unknown email (anti-enumeration: 200)", async () => {
		await expect(client.forgotPassword({ email: "nobody@example.com" })).resolves.toBeUndefined();
	});

	it("resetPassword with mismatched passwords throws ValidationError carrying passwords_do_not_match", async () => {
		try {
			await client.resetPassword({
				uid: "any-uid",
				token: "any-token",
				new_password: "newSecure1",
				new_password_confirm: "different",
			});
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			const body = (err as ValidationError).body as { new_password_confirm?: Array<{ code: string }> };
			expect(body.new_password_confirm?.[0]?.code).toBe("passwords_do_not_match");
		}
	});

	it("requestPasswordChange resolves with no body on the happy path", async () => {
		await expect(client.requestPasswordChange()).resolves.toBeUndefined();
	});

	it("resetPassword with invalid uid/token throws ValidationError carrying invalid_or_expired_link", async () => {
		try {
			await client.resetPassword({
				uid: "wrong-uid",
				token: "wrong-token",
				new_password: "newSecure1",
				new_password_confirm: "newSecure1",
			});
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			const body = (err as ValidationError).body as { code?: string };
			expect(body.code).toBe("invalid_or_expired_link");
		}
	});
});

/**
 * In-memory-only branches: the in-memory adapter exposes a "no refresh
 * available" mode and the full register → confirmEmail round-trip that the
 * HTTP path can't easily simulate without baking stateful cookie handling into
 * the fake server.
 */
describe("InMemorySessionClient — refresh-unavailable branch", () => {
	beforeEach(() => {
		_setMockDelay(0, 0);
		_resetIdCounter();
	});

	afterEach(() => {
		_resetMockDelay();
	});

	it("refresh throws AuthError(401) when no refresh cookie is available", async () => {
		const client = createInMemorySessionClient({ users: SEED_USERS, refreshAvailable: false });
		try {
			await client.refresh();
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
			expect((err as AuthError).status).toBe(401);
		}
	});

	it("login flips refresh-available so the next refresh succeeds", async () => {
		const client = createInMemorySessionClient({ users: SEED_USERS, refreshAvailable: false });
		await client.login({ email: "valid@example.com", password: "good-pass" });
		const result = await client.refresh();
		expect(typeof result.access).toBe("string");
	});

	it("logout flips refresh-available off, so a subsequent refresh fails", async () => {
		const client = createInMemorySessionClient({ users: SEED_USERS, refreshAvailable: true });
		await client.logout();
		await expect(client.refresh()).rejects.toBeInstanceOf(AuthError);
	});

	it("resendConfirmation re-issues a token an unverified user can confirm with", async () => {
		const tokens = ["first-token", "second-token"];
		let i = 0;
		const client = createInMemorySessionClient({
			users: SEED_USERS,
			generateConfirmationToken: () => tokens[i++] ?? "fallback-token",
		});

		// register -> first token
		const registered = await client.register(validRegisterInput());
		// resendConfirmation rotates to the second token
		await client.resendConfirmation("newuser@example.com");
		// confirming with the original token now fails (rotated)
		await expect(client.confirmEmail({ uid: String(registered.user.id), token: "first-token" })).rejects.toBeInstanceOf(
			ValidationError,
		);
		// confirming with the rotated token succeeds (auto-login)
		const confirmed = await client.confirmEmail({ uid: String(registered.user.id), token: "second-token" });
		expect(confirmed.user.email).toBe("newuser@example.com");
	});

	it("forgotPassword → resetPassword round-trip rotates the password so the user can log in with the new one", async () => {
		const RESET_TOKEN = "reset-abc";
		const client = createInMemorySessionClient({
			users: SEED_USERS,
			generateConfirmationToken: () => RESET_TOKEN,
		});

		// Mint a reset token for the verified user.
		await client.forgotPassword({ email: "valid@example.com" });

		// Reset with the wrong token: rejects.
		await expect(
			client.resetPassword({
				uid: "7",
				token: "wrong-token",
				new_password: "newSecure1",
				new_password_confirm: "newSecure1",
			}),
		).rejects.toBeInstanceOf(ValidationError);

		// Reset with the right token: succeeds.
		await expect(
			client.resetPassword({
				uid: "7",
				token: RESET_TOKEN,
				new_password: "newSecure1",
				new_password_confirm: "newSecure1",
			}),
		).resolves.toBeUndefined();

		// The old password no longer works.
		await expect(client.login({ email: "valid@example.com", password: "good-pass" })).rejects.toBeInstanceOf(AuthError);
		// The new password does.
		const session = await client.login({ email: "valid@example.com", password: "newSecure1" });
		expect(session.user.email).toBe("valid@example.com");
	});

	it("register followed by confirmEmail flips verified and returns access + user (auto-login)", async () => {
		const FIXED_TOKEN = "fixed-confirmation-token";
		const client = createInMemorySessionClient({
			users: SEED_USERS,
			generateConfirmationToken: () => FIXED_TOKEN,
		});

		const registered = await client.register(validRegisterInput());
		const confirmed = await client.confirmEmail({ uid: String(registered.user.id), token: FIXED_TOKEN });

		expect(confirmed.user.email).toBe("newuser@example.com");
		expect(typeof confirmed.access).toBe("string");
		expect(confirmed.access.length).toBeGreaterThan(0);

		// Auto-login: the user can immediately log in with the password they just registered.
		const login = await client.login({ email: "newuser@example.com", password: "fresh-pass-1" });
		expect(login.user.email).toBe("newuser@example.com");
	});
});

/**
 * HTTP-only error branches. The in-memory adapter doesn't surface throttling
 * or network-level errors — those branches only fire against the HTTP path.
 */
describe("HTTP-only error branches", () => {
	it("login against a throttled endpoint throws TooManyRequestsError with parsed retryAfter", async () => {
		const client = httpAdapter().build();
		try {
			await client.login({ email: "throttled@example.com", password: "anything" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(TooManyRequestsError);
			expect((err as TooManyRequestsError).retryAfter).toBe(60);
		}
	});

	it("refresh against a 401 backend throws AuthError without triggering the interceptor", async () => {
		const fetchStub = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ code: "refresh_invalid" }), {
				status: 401,
				headers: { "content-type": "application/json" },
			}),
		);
		// refresh callback would loop without skipRefresh; assert it's never invoked.
		const refreshCallback = vi.fn();
		const http = createHttpClient({
			baseUrl: "",
			fetch: fetchStub,
			getToken: () => null,
			getCsrfToken: () => null,
			refresh: refreshCallback,
		});
		const client = createHttpSessionClient(http);

		await expect(client.refresh()).rejects.toBeInstanceOf(AuthError);
		expect(refreshCallback).not.toHaveBeenCalled();
		expect(fetchStub).toHaveBeenCalledTimes(1);
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null, getCsrfToken: () => null });
		const client = createHttpSessionClient(http);
		await expect(client.login({ email: "a", password: "b" })).rejects.toBeInstanceOf(NetworkError);
	});

	it("confirmEmail with the documented good uid/token returns access + user", async () => {
		const client = httpAdapter().build();
		const result = await client.confirmEmail({ uid: "good-uid", token: "good-token" });
		expect(result.user.email).toBe("confirmed@example.com");
		expect(result.access).toBe("access-confirmed");
	});

	it("resetPassword with the documented good uid/token resolves with no body (204)", async () => {
		const client = httpAdapter().build();
		await expect(
			client.resetPassword({
				uid: "good-uid",
				token: "good-token",
				new_password: "newSecure1",
				new_password_confirm: "newSecure1",
			}),
		).resolves.toBeUndefined();
	});
});
