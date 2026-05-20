import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EmployeePermissions } from "../domains/employees";
import type {
	InviteEmployeeData,
	UpdatePermissionsData,
	UpdateWorkspaceEmployeeData,
	WorkspaceEmployeeDetail,
} from "../domains/workspace-employees";
import { ConflictError, NetworkError, NotFoundError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { WorkspaceEmployeesClient } from "./workspace-employees-client";
import { createHttpWorkspaceEmployeesClient } from "./workspace-employees-http";
import { createInMemoryWorkspaceEmployeesClient } from "./workspace-employees-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 *
 * Wire shapes mirror the backend:
 *   - `GET .../workspace/employees/` is cursor-paginated; adapter unwraps `.results`.
 *   - `POST .../invite/` returns the freshly-created `WorkspaceEmployee[]` (201 body).
 *   - `POST .../delete/` returns `{ archived, failed }` so the bulk-archive
 *     toolbar can surface per-row reasons.
 */

const SEED: WorkspaceEmployeeDetail[] = [
	{
		id: "1",
		firstName: "Иван",
		lastName: "Иванов",
		patronymic: "Иванович",
		position: "Директор",
		role: "admin",
		phone: "+71112223344",
		email: "ivan@example.com",
		registeredAt: "2024-01-15T10:00:00Z",
		companies: [
			{
				id: "c1",
				name: "Компания А",
				isMain: true,
				addressesCount: 0,
				employeeCount: 3,
				procurementItemCount: 5,
				createdAt: "2026-04-01T00:00:00+03:00",
				updatedAt: "2026-04-01T00:00:00+03:00",
			},
		],
		permissions: {
			id: "perm-1",
			employeeId: "1",
			procurementInquiries: "edit",
			positions: "edit",
			tasks: "edit",
			workspaceSettings: "edit",
			companies: "edit",
			employees: "edit",
			emails: "edit",
		},
	},
	{
		id: "2",
		firstName: "Мария",
		lastName: "Петрова",
		patronymic: "Сергеевна",
		position: "Менеджер",
		role: "user",
		phone: "+79998887766",
		email: "maria@example.com",
		registeredAt: "2024-03-20T10:00:00Z",
		companies: [],
		permissions: {
			id: "perm-2",
			employeeId: "2",
			procurementInquiries: "view",
			positions: "view",
			tasks: "view",
			workspaceSettings: "none",
			companies: "none",
			employees: "none",
			emails: "none",
		},
	},
	{
		id: "3",
		firstName: "Дмитрий",
		lastName: "Попов",
		patronymic: "",
		position: "Менеджер",
		role: "user",
		phone: "",
		email: "dpopov@example.com",
		registeredAt: null,
		companies: [],
		permissions: {
			id: "perm-3",
			employeeId: "3",
			procurementInquiries: "none",
			positions: "none",
			tasks: "none",
			workspaceSettings: "none",
			companies: "none",
			employees: "none",
			emails: "none",
		},
	},
];

const VALID_INVITE: InviteEmployeeData = {
	email: "new@example.com",
	firstName: "Новый",
	lastName: "Сотрудник",
	patronymic: "",
	position: "Менеджер",
	role: "user",
	companies: [],
};

interface Adapter {
	name: string;
	build: () => WorkspaceEmployeesClient;
}

function memoryAdapter(): Adapter {
	return {
		name: "memory",
		build: () => createInMemoryWorkspaceEmployeesClient({ seed: SEED.map((e) => structuredClone(e)) }),
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

function httpAdapter(): Adapter {
	const store = new Map<string, WorkspaceEmployeeDetail>();
	let counter = 1000;
	for (const e of SEED) store.set(e.id, structuredClone(e));

	const stripPermissions = (e: WorkspaceEmployeeDetail) => {
		const { permissions: _permissions, ...rest } = e;
		return rest;
	};

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/workspace\/employees\/$/,
			respond: () => ({
				status: 200,
				body: {
					next: null,
					previous: null,
					results: Array.from(store.values()).map(stripPermissions),
				},
			}),
		},
		{
			method: "GET",
			path: /^\/workspace\/employees\/(\d+)\/$/,
			respond: ({ url }) => {
				const id = /\/(\d+)\/$/.exec(url)?.[1] ?? "";
				const found = store.get(id);
				if (!found) return { status: 404, body: { detail: `employee ${id} not found` } };
				return { status: 200, body: found };
			},
		},
		{
			method: "POST",
			path: /^\/workspace\/employees\/invite\/$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { invites: InviteEmployeeData[] };
				const created: ReturnType<typeof stripPermissions>[] = [];
				for (const invite of data.invites) {
					if (!invite.email) return { status: 400, body: { fieldErrors: { email: ["required"] } } };
					if (invite.email === "__conflict__@example.com") {
						return { status: 409, body: { detail: "email already invited" } };
					}
					counter += 1;
					const detail: WorkspaceEmployeeDetail = {
						id: String(counter),
						firstName: invite.firstName,
						lastName: invite.lastName,
						patronymic: invite.patronymic,
						position: invite.position,
						role: invite.role,
						phone: "",
						email: invite.email,
						registeredAt: null,
						companies: [],
						permissions: {
							id: `perm-${counter}`,
							employeeId: String(counter),
							procurementInquiries: "none",
							positions: "none",
							tasks: "none",
							workspaceSettings: "none",
							companies: "none",
							employees: "none",
							emails: "none",
						},
					};
					store.set(String(counter), detail);
					created.push(stripPermissions(detail));
				}
				return { status: 201, body: created };
			},
		},
		{
			method: "PATCH",
			path: /^\/workspace\/employees\/(\d+)\/$/,
			respond: ({ url, init }) => {
				const id = /\/(\d+)\/$/.exec(url)?.[1] ?? "";
				const existing = store.get(id);
				if (!existing) return { status: 404, body: { detail: `employee ${id} not found` } };
				const data = JSON.parse(init?.body as string) as UpdateWorkspaceEmployeeData;
				if (data.firstName === "__validation__") {
					return { status: 400, body: { fieldErrors: { firstName: ["invalid"] } } };
				}
				const { companies: companyIds, ...rest } = data;
				const updated: WorkspaceEmployeeDetail = {
					...existing,
					...rest,
					companies: companyIds === undefined ? existing.companies : [],
				};
				store.set(id, updated);
				return { status: 200, body: updated };
			},
		},
		{
			method: "POST",
			path: /^\/workspace\/employees\/delete\/$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { ids: string[] };
				const archived: string[] = [];
				const failed: Array<{
					id: string;
					code: "not_found" | "cannot_archive_owner" | "cannot_archive_admin";
				}> = [];
				for (const id of data.ids) {
					const existing = store.get(id);
					if (!existing) {
						failed.push({ id, code: "not_found" });
						continue;
					}
					if (existing.role === "admin") {
						failed.push({ id, code: "cannot_archive_admin" });
						continue;
					}
					store.delete(id);
					archived.push(id);
				}
				return { status: 200, body: { archived, failed } };
			},
		},
		{
			method: "PATCH",
			path: /^\/workspace\/employees\/(\d+)\/permissions\/$/,
			respond: ({ url, init }) => {
				const id = /\/(\d+)\/permissions\/$/.exec(url)?.[1] ?? "";
				const existing = store.get(id);
				if (!existing) return { status: 404, body: { detail: `employee ${id} not found` } };
				const data = JSON.parse(init?.body as string) as UpdatePermissionsData;
				const updated: EmployeePermissions = { ...existing.permissions, ...data };
				store.set(id, { ...existing, permissions: updated });
				return { status: 200, body: updated };
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
		build: () => createHttpWorkspaceEmployeesClient(http),
	};
}

const adapters: Array<() => Adapter> = [() => memoryAdapter(), () => httpAdapter()];

describe.each(
	adapters.map((make) => [make().name, make]),
)("WorkspaceEmployeesClient contract — %s adapter", (_label, make) => {
	let client: WorkspaceEmployeesClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("list returns the seeded employees without permissions", async () => {
		const list = await client.list();
		expect(list.map((e) => e.id).sort()).toEqual(["1", "2", "3"]);
		expect(list[0]).not.toHaveProperty("permissions");
		expect(list.find((e) => e.id === "1")?.email).toBe("ivan@example.com");
	});

	it("list surfaces companies array on each employee", async () => {
		const list = await client.list();
		const ivan = list.find((e) => e.id === "1");
		expect(ivan?.companies[0].name).toBe("Компания А");
	});

	it("list exposes pending employees (registeredAt=null)", async () => {
		const list = await client.list();
		expect(list.some((e) => e.registeredAt == null)).toBe(true);
	});

	it("get returns detail with permissions for known id", async () => {
		const detail = await client.get("2");
		expect(detail.id).toBe("2");
		expect(detail.permissions.procurementInquiries).toBe("view");
		expect(detail.permissions.positions).toBe("view");
	});

	it("get throws NotFoundError for unknown id", async () => {
		await expect(client.get("99999")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("invite + list roundtrip — appends invitee with registeredAt=null", async () => {
		const before = await client.list();
		await client.invite([VALID_INVITE]);
		const after = await client.list();
		expect(after.length).toBe(before.length + 1);
		const added = after.find((e) => e.email === VALID_INVITE.email);
		expect(added).toBeDefined();
		expect(added?.registeredAt).toBeNull();
	});

	it("invite returns the freshly-created rows (201 body)", async () => {
		const created = await client.invite([VALID_INVITE]);
		expect(created).toHaveLength(1);
		expect(created[0].email).toBe(VALID_INVITE.email);
		expect(created[0].registeredAt).toBeNull();
		// The 201 body matches the list shape (no `permissions` field).
		expect(created[0]).not.toHaveProperty("permissions");
	});

	it("invite supports bulk", async () => {
		const created = await client.invite([
			{ ...VALID_INVITE, email: "a@x.com" },
			{ ...VALID_INVITE, email: "b@x.com", role: "admin" },
		]);
		expect(created.map((e) => e.email).sort()).toEqual(["a@x.com", "b@x.com"]);
		const list = await client.list();
		expect(list.find((e) => e.email === "a@x.com")).toBeDefined();
		expect(list.find((e) => e.email === "b@x.com")).toBeDefined();
	});

	it("update merges patch and persists", async () => {
		await client.update("2", { position: "Старший менеджер" });
		const detail = await client.get("2");
		expect(detail.position).toBe("Старший менеджер");
		// untouched
		expect(detail.firstName).toBe("Мария");
	});

	it("update throws NotFoundError for unknown id", async () => {
		await expect(client.update("99999", { position: "Test" })).rejects.toBeInstanceOf(NotFoundError);
	});

	it("update accepts a companies array on the payload", async () => {
		// Both adapters must accept the field without rejecting — the in-memory
		// adapter resolves the ids to summaries (via the injected port), and the
		// HTTP adapter just forwards them in the patch body.
		await client.update("2", { companies: [] });
		const detail = await client.get("2");
		expect(detail.companies).toEqual([]);
	});

	it("delete removes user-role employees and returns them in archived[]", async () => {
		const result = await client.delete(["2"]);
		expect(result.archived).toEqual(["2"]);
		expect(result.failed).toEqual([]);
		const list = await client.list();
		expect(list.find((e) => e.id === "2")).toBeUndefined();
	});

	it("delete reports admin employees in failed[] with cannot_archive_admin", async () => {
		const result = await client.delete(["1"]);
		expect(result.archived).toEqual([]);
		expect(result.failed).toEqual([{ id: "1", code: "cannot_archive_admin" }]);
		const list = await client.list();
		expect(list.find((e) => e.id === "1")).toBeDefined();
	});

	it("delete reports unknown ids in failed[] with not_found", async () => {
		const result = await client.delete(["99999"]);
		expect(result.archived).toEqual([]);
		expect(result.failed).toEqual([{ id: "99999", code: "not_found" }]);
	});

	it("delete handles a mixed batch — partial archive + failures", async () => {
		const result = await client.delete(["1", "2", "99999"]);
		expect(result.archived).toEqual(["2"]);
		expect(result.failed.map((f) => f.id).sort()).toEqual(["1", "99999"]);
	});

	it("updatePermissions patches only provided levels", async () => {
		const result = await client.updatePermissions("2", { procurementInquiries: "edit" });
		expect(result.procurementInquiries).toBe("edit");
		expect(result.positions).toBe("view");
		expect(result.tasks).toBe("view");
		const detail = await client.get("2");
		expect(detail.permissions.procurementInquiries).toBe("edit");
	});

	it("updatePermissions throws NotFoundError for unknown id", async () => {
		await expect(client.updatePermissions("99999", { procurementInquiries: "edit" })).rejects.toBeInstanceOf(
			NotFoundError,
		);
	});
});

describe("in-memory adapter — getCompanySummaries port", () => {
	beforeEach(() => {
		_setMockDelay(0, 0);
	});

	afterEach(() => {
		_resetMockDelay();
	});

	it("invokes the injected port with the requested company ids", async () => {
		const getCompanySummaries = vi.fn(async (ids: string[]) =>
			ids.map((id) => ({
				id,
				name: `Company ${id}`,
				isMain: false,
				addressesCount: 0,
				employeeCount: 0,
				procurementItemCount: 0,
				createdAt: "2026-04-01T00:00:00+03:00",
				updatedAt: "2026-04-01T00:00:00+03:00",
			})),
		);
		const client = createInMemoryWorkspaceEmployeesClient({
			seed: SEED.map((e) => structuredClone(e)),
			getCompanySummaries,
		});

		await client.invite([{ ...VALID_INVITE, email: "z@x.com", companies: ["c1", "c2"] }]);

		expect(getCompanySummaries).toHaveBeenCalledWith(["c1", "c2"]);
		const list = await client.list();
		const added = list.find((e) => e.email === "z@x.com");
		expect(added?.companies.map((c) => c.id)).toEqual(["c1", "c2"]);
	});

	it("skips the port when invite has no companies", async () => {
		const getCompanySummaries = vi.fn(async () => []);
		const client = createInMemoryWorkspaceEmployeesClient({
			seed: SEED.map((e) => structuredClone(e)),
			getCompanySummaries,
		});

		await client.invite([VALID_INVITE]);

		expect(getCompanySummaries).not.toHaveBeenCalled();
	});
});

/**
 * HTTP-only error branches. The in-memory adapter doesn't surface validation /
 * conflict errors so they're tested only against the HTTP adapter.
 */
describe("HTTP-only error branches", () => {
	it("invite with empty email throws ValidationError with fieldErrors", async () => {
		const client = httpAdapter().build();
		try {
			await client.invite([{ ...VALID_INVITE, email: "" }]);
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ email: ["required"] });
		}
	});

	it("invite with duplicate email throws ConflictError", async () => {
		const client = httpAdapter().build();
		await expect(client.invite([{ ...VALID_INVITE, email: "__conflict__@example.com" }])).rejects.toBeInstanceOf(
			ConflictError,
		);
	});

	it("update with sentinel firstName throws ValidationError", async () => {
		const client = httpAdapter().build();
		try {
			await client.update("1", { firstName: "__validation__" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ firstName: ["invalid"] });
		}
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpWorkspaceEmployeesClient(http);
		await expect(client.list()).rejects.toBeInstanceOf(NetworkError);
	});
});
