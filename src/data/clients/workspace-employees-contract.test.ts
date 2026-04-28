import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EmployeePermissions } from "../domains/companies";
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
 * Workspace-employees' list shape is a flat `WorkspaceEmployee[]` — not
 * `CursorPage<T>`, since the workspace roster is a small bounded list.
 */

const SEED: WorkspaceEmployeeDetail[] = [
	{
		id: 1,
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
				addresses: [],
				employeeCount: 3,
				procurementItemCount: 5,
			},
		],
		permissions: {
			id: "perm-1",
			employeeId: 1,
			procurement: "edit",
			tasks: "edit",
			companies: "edit",
			employees: "edit",
			emails: "edit",
		},
	},
	{
		id: 2,
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
			employeeId: 2,
			procurement: "view",
			tasks: "view",
			companies: "none",
			employees: "none",
			emails: "none",
		},
	},
	{
		id: 3,
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
			employeeId: 3,
			procurement: "none",
			tasks: "none",
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
	const store = new Map<number, WorkspaceEmployeeDetail>();
	let counter = 1000;
	for (const e of SEED) store.set(e.id, structuredClone(e));

	const stripPermissions = (e: WorkspaceEmployeeDetail) => {
		const { permissions: _permissions, ...rest } = e;
		return rest;
	};

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/api\/workspace\/employees$/,
			respond: () => ({ status: 200, body: Array.from(store.values()).map(stripPermissions) }),
		},
		{
			method: "GET",
			path: /^\/api\/workspace\/employees\/(\d+)$/,
			respond: ({ url }) => {
				const id = Number(/\/(\d+)$/.exec(url)?.[1]);
				const found = store.get(id);
				if (!found) return { status: 404, body: { detail: `employee ${id} not found` } };
				return { status: 200, body: found };
			},
		},
		{
			method: "POST",
			path: /^\/api\/workspace\/employees\/invite$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { invites: InviteEmployeeData[] };
				for (const invite of data.invites) {
					if (!invite.email) return { status: 400, body: { fieldErrors: { email: ["required"] } } };
					if (invite.email === "__conflict__@example.com") {
						return { status: 409, body: { detail: "email already invited" } };
					}
					counter += 1;
					store.set(counter, {
						id: counter,
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
							employeeId: counter,
							procurement: "none",
							tasks: "none",
							companies: "none",
							employees: "none",
							emails: "none",
						},
					});
				}
				return { status: 204 };
			},
		},
		{
			method: "PATCH",
			path: /^\/api\/workspace\/employees\/(\d+)$/,
			respond: ({ url, init }) => {
				const id = Number(/\/(\d+)$/.exec(url)?.[1]);
				const existing = store.get(id);
				if (!existing) return { status: 404, body: { detail: `employee ${id} not found` } };
				const data = JSON.parse(init?.body as string) as UpdateWorkspaceEmployeeData;
				if (data.firstName === "__validation__") {
					return { status: 400, body: { fieldErrors: { firstName: ["invalid"] } } };
				}
				const updated: WorkspaceEmployeeDetail = { ...existing, ...data };
				store.set(id, updated);
				return { status: 200, body: updated };
			},
		},
		{
			method: "POST",
			path: /^\/api\/workspace\/employees\/delete$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { ids: number[] };
				for (const id of data.ids) {
					const existing = store.get(id);
					// HTTP mirrors the in-memory rule: admins can't be deleted.
					if (existing && existing.role !== "user") continue;
					store.delete(id);
				}
				return { status: 204 };
			},
		},
		{
			method: "PATCH",
			path: /^\/api\/workspace\/employees\/(\d+)\/permissions$/,
			respond: ({ url, init }) => {
				const id = Number(/\/(\d+)\/permissions$/.exec(url)?.[1]);
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
		expect(list.map((e) => e.id).sort()).toEqual([1, 2, 3]);
		expect(list[0]).not.toHaveProperty("permissions");
		expect(list.find((e) => e.id === 1)?.email).toBe("ivan@example.com");
	});

	it("list surfaces companies array on each employee", async () => {
		const list = await client.list();
		const ivan = list.find((e) => e.id === 1);
		expect(ivan?.companies[0].name).toBe("Компания А");
	});

	it("list exposes pending employees (registeredAt=null)", async () => {
		const list = await client.list();
		expect(list.some((e) => e.registeredAt == null)).toBe(true);
	});

	it("get returns detail with permissions for known id", async () => {
		const detail = await client.get(2);
		expect(detail.id).toBe(2);
		expect(detail.permissions.procurement).toBe("view");
	});

	it("get throws NotFoundError for unknown id", async () => {
		await expect(client.get(99999)).rejects.toBeInstanceOf(NotFoundError);
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

	it("invite supports bulk", async () => {
		await client.invite([
			{ ...VALID_INVITE, email: "a@x.com" },
			{ ...VALID_INVITE, email: "b@x.com", role: "admin" },
		]);
		const list = await client.list();
		expect(list.find((e) => e.email === "a@x.com")).toBeDefined();
		expect(list.find((e) => e.email === "b@x.com")).toBeDefined();
	});

	it("update merges patch and persists", async () => {
		await client.update(2, { position: "Старший менеджер" });
		const detail = await client.get(2);
		expect(detail.position).toBe("Старший менеджер");
		// untouched
		expect(detail.firstName).toBe("Мария");
	});

	it("update throws NotFoundError for unknown id", async () => {
		await expect(client.update(99999, { position: "Test" })).rejects.toBeInstanceOf(NotFoundError);
	});

	it("delete removes user-role employees", async () => {
		await client.delete([2]);
		const list = await client.list();
		expect(list.find((e) => e.id === 2)).toBeUndefined();
	});

	it("delete leaves admin employees in place", async () => {
		await client.delete([1]);
		const list = await client.list();
		expect(list.find((e) => e.id === 1)).toBeDefined();
	});

	it("updatePermissions patches only provided levels", async () => {
		const result = await client.updatePermissions(2, { procurement: "edit" });
		expect(result.procurement).toBe("edit");
		expect(result.tasks).toBe("view");
		const detail = await client.get(2);
		expect(detail.permissions.procurement).toBe("edit");
	});

	it("updatePermissions throws NotFoundError for unknown id", async () => {
		await expect(client.updatePermissions(99999, { procurement: "edit" })).rejects.toBeInstanceOf(NotFoundError);
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
			await client.update(1, { firstName: "__validation__" });
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
