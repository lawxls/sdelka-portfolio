import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AddEmailPayload, WorkspaceEmail } from "../domains/emails";
import { ConflictError, NetworkError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { EmailsClient } from "./emails-client";
import { createHttpEmailsClient } from "./emails-http";
import { createInMemoryEmailsClient } from "./emails-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 *
 * Emails' list shape is a flat `WorkspaceEmail[]` — not `CursorPage<T>`,
 * since the workspace inbox roster is a small bounded list.
 */

const SEED: WorkspaceEmail[] = [
	{ id: "e1", email: "a@example.com", status: "active", type: "corporate", sentCount: 10 },
	{ id: "e2", email: "b@example.com", status: "active", type: "service", sentCount: 5 },
	{ id: "e3", email: "c@example.com", status: "disabled", type: "service", sentCount: 0 },
];

const VALID_PAYLOAD: AddEmailPayload = {
	email: "new@example.com",
	password: "secret",
	smtpHost: "smtp.example.com",
	smtpPort: 587,
	imapHost: "imap.example.com",
	imapPort: 993,
};

interface Adapter {
	name: string;
	build: () => EmailsClient;
}

function memoryAdapter(): Adapter {
	return {
		name: "memory",
		build: () => createInMemoryEmailsClient(SEED.map((e) => ({ ...e }))),
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

function httpAdapter(): Adapter {
	const store = new Map<string, WorkspaceEmail>(SEED.map((e) => [e.id, { ...e }]));
	let counter = 0;

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/api\/workspace\/emails$/,
			respond: () => ({ status: 200, body: Array.from(store.values()) }),
		},
		{
			method: "POST",
			path: /^\/api\/workspace\/emails$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as AddEmailPayload;
				if (!data.email) return { status: 400, body: { fieldErrors: { email: ["required"] } } };
				if (data.email === "__conflict__@example.com") return { status: 409, body: { detail: "email already exists" } };
				counter += 1;
				const record: WorkspaceEmail = {
					id: `new-${counter}`,
					email: data.email,
					status: "active",
					type: "corporate",
					sentCount: 0,
					smtpHost: data.smtpHost,
					smtpPort: data.smtpPort,
					imapHost: data.imapHost,
					imapPort: data.imapPort,
				};
				store.set(record.id, record);
				return { status: 201, body: record };
			},
		},
		{
			method: "POST",
			path: /^\/api\/workspace\/emails\/delete$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { ids: string[] };
				for (const id of data.ids) store.delete(id);
				return { status: 204 };
			},
		},
		{
			method: "POST",
			path: /^\/api\/workspace\/emails\/disable$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { ids: string[] };
				for (const id of data.ids) {
					const existing = store.get(id);
					if (existing) store.set(id, { ...existing, status: "disabled" });
				}
				return { status: 204 };
			},
		},
	];

	const fetchStub = vi.fn(async (input: string, init?: RequestInit) => {
		const url = input;
		const method = init?.method ?? "GET";
		const path = new URL(url, "http://test").pathname + new URL(url, "http://test").search;
		const route = routes.find((r) => r.method === method && r.path.test(path));
		if (!route) throw new Error(`Unmatched ${method} ${url}`);
		const result = await route.respond({ url, init });
		const hasBody = result.body !== undefined && result.status !== 204;
		return new Response(hasBody ? JSON.stringify(result.body) : null, {
			status: result.status,
			headers: hasBody ? { "content-type": "application/json" } : undefined,
		});
	});

	const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => "test-token" });

	return {
		name: "http",
		build: () => createHttpEmailsClient(http),
	};
}

const adapters: Array<() => Adapter> = [() => memoryAdapter(), () => httpAdapter()];

describe.each(adapters.map((make) => [make().name, make]))("EmailsClient contract — %s adapter", (_label, make) => {
	let client: EmailsClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("list returns the seeded emails", async () => {
		const emails = await client.list();
		expect(emails.map((e) => e.id).sort()).toEqual(["e1", "e2", "e3"]);
	});

	it("add returns the new record and surfaces SMTP/IMAP fields", async () => {
		const created = await client.add(VALID_PAYLOAD);
		expect(created.email).toBe(VALID_PAYLOAD.email);
		expect(created.status).toBe("active");
		expect(created.type).toBe("corporate");
		expect(created.sentCount).toBe(0);
		expect(created.smtpHost).toBe(VALID_PAYLOAD.smtpHost);
		expect(created.smtpPort).toBe(VALID_PAYLOAD.smtpPort);
		expect(created.imapHost).toBe(VALID_PAYLOAD.imapHost);
		expect(created.imapPort).toBe(VALID_PAYLOAD.imapPort);
		expect(created.id).toBeTruthy();
	});

	it("add + list roundtrip", async () => {
		const created = await client.add(VALID_PAYLOAD);
		const emails = await client.list();
		expect(emails.find((e) => e.id === created.id)?.email).toBe(VALID_PAYLOAD.email);
	});

	it("delete removes the given ids", async () => {
		await client.delete(["e1", "e3"]);
		const emails = await client.list();
		expect(emails.map((e) => e.id)).toEqual(["e2"]);
	});

	it("delete with empty ids is a no-op", async () => {
		await client.delete([]);
		const emails = await client.list();
		expect(emails.map((e) => e.id).sort()).toEqual(["e1", "e2", "e3"]);
	});

	it("disable flips status on the given ids and leaves others untouched", async () => {
		await client.disable(["e1"]);
		const emails = await client.list();
		expect(emails.find((e) => e.id === "e1")?.status).toBe("disabled");
		expect(emails.find((e) => e.id === "e2")?.status).toBe("active");
	});

	it("disable is idempotent for already-disabled ids", async () => {
		await client.disable(["e3"]);
		const emails = await client.list();
		expect(emails.find((e) => e.id === "e3")?.status).toBe("disabled");
	});
});

/**
 * HTTP-only error branches. The in-memory adapter doesn't surface validation /
 * conflict errors so they're tested only against the HTTP adapter.
 */
describe("HTTP-only error branches", () => {
	it("add with empty email throws ValidationError with fieldErrors", async () => {
		const client = httpAdapter().build();
		try {
			await client.add({ ...VALID_PAYLOAD, email: "" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ email: ["required"] });
		}
	});

	it("add with duplicate email throws ConflictError", async () => {
		const client = httpAdapter().build();
		await expect(client.add({ ...VALID_PAYLOAD, email: "__conflict__@example.com" })).rejects.toBeInstanceOf(
			ConflictError,
		);
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpEmailsClient(http);
		await expect(client.list()).rejects.toBeInstanceOf(NetworkError);
	});
});
