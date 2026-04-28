import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentEmployee, UserSettings } from "../domains/profile";
import { ConflictError, NetworkError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import { _resetWorkspaceStore, _setMe, _setUserSettings } from "../workspace-mock-data";
import type { ProfileClient } from "./profile-client";
import { createHttpProfileClient } from "./profile-http";
import { createInMemoryProfileClient } from "./profile-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 *
 * Profile is a single-row domain — `me`, `settings`, `update`, and
 * `changePassword` all operate on the active session's user record. There is
 * no list shape.
 */

const SEED_ME: CurrentEmployee = { id: 7, role: "admin" };
const SEED_SETTINGS: UserSettings = {
	first_name: "Иван",
	last_name: "Иванов",
	patronymic: "Иванович",
	email: "ivan@example.com",
	phone: "+79991234567",
	avatar_icon: "blue",
	date_joined: "2024-01-15T10:00:00Z",
	mailing_allowed: true,
};

interface Adapter {
	name: string;
	build: () => ProfileClient;
}

function memoryAdapter(): Adapter {
	return {
		name: "memory",
		build: () => {
			_resetWorkspaceStore();
			_setMe({ ...SEED_ME });
			_setUserSettings({ ...SEED_SETTINGS });
			return createInMemoryProfileClient();
		},
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

function httpAdapter(): Adapter {
	let me: CurrentEmployee = { ...SEED_ME };
	let settings: UserSettings = { ...SEED_SETTINGS };

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/api\/me$/,
			respond: () => ({ status: 200, body: me }),
		},
		{
			method: "GET",
			path: /^\/api\/profile\/settings$/,
			respond: () => ({ status: 200, body: settings }),
		},
		{
			method: "PATCH",
			path: /^\/api\/profile\/settings$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as Partial<UserSettings>;
				if (data.first_name === "__validation__") {
					return { status: 400, body: { fieldErrors: { first_name: ["invalid"] } } };
				}
				settings = { ...settings, ...data };
				return { status: 200, body: settings };
			},
		},
		{
			method: "POST",
			path: /^\/api\/profile\/password$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { currentPassword: string; newPassword: string };
				if (data.currentPassword === "__wrong__") return { status: 409, body: { detail: "wrong password" } };
				if (data.newPassword === "") return { status: 400, body: { fieldErrors: { newPassword: ["required"] } } };
				return { status: 200, body: { detail: "Пароль успешно изменён" } };
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
		return new Response(hasBody ? JSON.stringify(result.body) : null, {
			status: result.status,
			headers: hasBody ? { "content-type": "application/json" } : undefined,
		});
	});

	const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => "test-token" });

	return {
		name: "http",
		build: () => {
			me = { ...SEED_ME };
			settings = { ...SEED_SETTINGS };
			return createHttpProfileClient(http);
		},
	};
}

const adapters: Array<() => Adapter> = [() => memoryAdapter(), () => httpAdapter()];

describe.each(adapters.map((make) => [make().name, make]))("ProfileClient contract — %s adapter", (_label, make) => {
	let client: ProfileClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("me returns the seeded current user", async () => {
		const me = await client.me();
		expect(me).toEqual(SEED_ME);
	});

	it("settings returns the seeded user settings", async () => {
		const settings = await client.settings();
		expect(settings.first_name).toBe(SEED_SETTINGS.first_name);
		expect(settings.email).toBe(SEED_SETTINGS.email);
	});

	it("update merges the patch and returns the updated settings", async () => {
		const updated = await client.update({ first_name: "Пётр", mailing_allowed: false });
		expect(updated.first_name).toBe("Пётр");
		expect(updated.last_name).toBe(SEED_SETTINGS.last_name);
		expect(updated.mailing_allowed).toBe(false);
	});

	it("update + settings roundtrip — change persists", async () => {
		await client.update({ phone: "+71112223344" });
		const re = await client.settings();
		expect(re.phone).toBe("+71112223344");
	});

	it("changePassword resolves with success detail on the happy path", async () => {
		const result = await client.changePassword("old", "new123");
		expect(result.detail).toMatch(/успеш/i);
	});
});

/**
 * HTTP-only error branches. The in-memory adapter doesn't surface validation /
 * conflict errors so they're tested only against the HTTP adapter.
 */
describe("HTTP-only error branches", () => {
	it("update with sentinel name throws ValidationError with fieldErrors", async () => {
		const client = httpAdapter().build();
		try {
			await client.update({ first_name: "__validation__" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ first_name: ["invalid"] });
		}
	});

	it("changePassword with wrong current password throws ConflictError", async () => {
		const client = httpAdapter().build();
		await expect(client.changePassword("__wrong__", "new123")).rejects.toBeInstanceOf(ConflictError);
	});

	it("changePassword with empty new password throws ValidationError with fieldErrors", async () => {
		const client = httpAdapter().build();
		try {
			await client.changePassword("old", "");
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ newPassword: ["required"] });
		}
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpProfileClient(http);
		await expect(client.me()).rejects.toBeInstanceOf(NetworkError);
	});
});
