import { beforeEach, describe, expect, it } from "vitest";
import {
	_resetWorkspaceStore,
	_setMe,
	_setUserSettings,
	_setWorkspaceEmployees,
	changePasswordMock,
	fetchCompanyInfoMock,
	fetchMeMock,
	fetchSettingsMock,
	fetchWorkspaceEmployeeMock,
	fetchWorkspaceEmployeesMock,
	inviteEmployeesMock,
	patchSettingsMock,
	updateWorkspaceEmployeePermissionsMock,
	type WorkspaceEmployeeDetail,
} from "./workspace-mock-data";

beforeEach(() => {
	_resetWorkspaceStore();
});

describe("me", () => {
	it("returns seeded current user", async () => {
		const me = await fetchMeMock();
		expect(me).toEqual({ id: 1, role: "owner" });
	});

	it("reflects _setMe override", async () => {
		_setMe({ id: 42, role: "admin" });
		expect(await fetchMeMock()).toEqual({ id: 42, role: "admin" });
	});
});

describe("companyInfo", () => {
	it("returns seeded company name", async () => {
		expect(await fetchCompanyInfoMock()).toEqual({ name: "ОРМАТЕК" });
	});
});

describe("settings", () => {
	it("returns seeded user settings", async () => {
		const s = await fetchSettingsMock();
		expect(s.first_name).toBe("Иван");
		expect(s.email).toBe("ivan.zhuravlyov.58@mostholding.ru");
		expect(s.mailing_allowed).toBe(true);
	});

	it("patchSettings merges changed fields and returns updated settings", async () => {
		const updated = await patchSettingsMock({ first_name: "Пётр", mailing_allowed: false });
		expect(updated.first_name).toBe("Пётр");
		expect(updated.last_name).toBe("Журавлёв");
		expect(updated.mailing_allowed).toBe(false);
	});

	it("patchSettings persists across fetches", async () => {
		await patchSettingsMock({ phone: "+71112223344" });
		const s = await fetchSettingsMock();
		expect(s.phone).toBe("+71112223344");
	});

	it("_setUserSettings replaces store", async () => {
		_setUserSettings({
			first_name: "X",
			last_name: "Y",
			email: "x@y.example",
			phone: "+70000000000",
			avatar_icon: "red",
			date_joined: "2026-01-01T00:00:00Z",
			mailing_allowed: false,
		});
		expect((await fetchSettingsMock()).first_name).toBe("X");
	});
});

describe("changePassword", () => {
	it("always succeeds", async () => {
		const r = await changePasswordMock("anything", "whatever");
		expect(r.detail).toMatch(/успеш/i);
	});
});

describe("workspace employees list", () => {
	it("returns seeded employees without permissions", async () => {
		const list = await fetchWorkspaceEmployeesMock();
		expect(list.length).toBeGreaterThanOrEqual(5);
		expect(list[0]).not.toHaveProperty("permissions");
		expect(list[0].email).toBe("ivan.zhuravlyov.58@mostholding.ru");
	});

	it("includes companies array on each employee", async () => {
		const list = await fetchWorkspaceEmployeesMock();
		expect(list[0].companies[0].name).toBe("ОРМАТЕК");
	});

	it("exposes a pending employee (registeredAt=null)", async () => {
		const list = await fetchWorkspaceEmployeesMock();
		expect(list.some((e) => e.registeredAt == null)).toBe(true);
	});
});

describe("workspace employee detail", () => {
	it("returns detail with permissions for known id", async () => {
		const detail = await fetchWorkspaceEmployeeMock(1);
		expect(detail.id).toBe(1);
		expect(detail.permissions).toBeDefined();
		expect(detail.permissions.analytics).toBe("edit");
	});

	it("throws for unknown id", async () => {
		await expect(fetchWorkspaceEmployeeMock(99999)).rejects.toThrow();
	});
});

describe("inviteEmployees", () => {
	it("appends invitees to the list with default permissions none", async () => {
		const before = await fetchWorkspaceEmployeesMock();
		await inviteEmployeesMock([{ email: "new@example.com", position: "Тестер", role: "user", companies: [] }]);
		const after = await fetchWorkspaceEmployeesMock();
		expect(after.length).toBe(before.length + 1);
		const added = after.find((e) => e.email === "new@example.com");
		if (!added) throw new Error("invitee not found");
		expect(added.registeredAt).toBeNull();

		const detail = await fetchWorkspaceEmployeeMock(added.id);
		expect(detail.permissions.analytics).toBe("none");
		expect(detail.permissions.procurement).toBe("none");
	});

	it("supports bulk invite", async () => {
		await inviteEmployeesMock([
			{ email: "a@x.com", position: "A", role: "user", companies: [] },
			{ email: "b@x.com", position: "B", role: "admin", companies: ["c1"] },
		]);
		const list = await fetchWorkspaceEmployeesMock();
		expect(list.find((e) => e.email === "a@x.com")).toBeDefined();
		expect(list.find((e) => e.email === "b@x.com")).toBeDefined();
	});

	it("persists selected companies on the invitee", async () => {
		await inviteEmployeesMock([
			{ email: "newhire@x.com", position: "Менеджер", role: "user", companies: ["company-1"] },
		]);
		const list = await fetchWorkspaceEmployeesMock();
		const added = list.find((e) => e.email === "newhire@x.com");
		if (!added) throw new Error("invitee not found");
		expect(added.companies.map((c) => c.id)).toEqual(["company-1"]);
	});
});

describe("updateWorkspaceEmployeePermissions", () => {
	it("patches only provided levels and persists", async () => {
		const result = await updateWorkspaceEmployeePermissionsMock(3, { procurement: "none" });
		expect(result.procurement).toBe("none");
		expect(result.analytics).toBe("view"); // untouched
		const detail = await fetchWorkspaceEmployeeMock(3);
		expect(detail.permissions.procurement).toBe("none");
	});

	it("throws for unknown id", async () => {
		await expect(updateWorkspaceEmployeePermissionsMock(99999, { procurement: "edit" })).rejects.toThrow();
	});
});

describe("_setWorkspaceEmployees", () => {
	it("replaces entire list", async () => {
		const custom: WorkspaceEmployeeDetail[] = [
			{
				id: 500,
				firstName: "Test",
				lastName: "User",
				patronymic: "",
				position: "QA",
				role: "user",
				phone: "",
				email: "test@x.com",
				isResponsible: false,
				registeredAt: null,
				companies: [],
				permissions: {
					id: "perm-500",
					employeeId: 500,
					analytics: "edit",
					procurement: "edit",
					companies: "edit",
					tasks: "edit",
				},
			},
		];
		_setWorkspaceEmployees(custom);
		const list = await fetchWorkspaceEmployeesMock();
		expect(list).toHaveLength(1);
		expect(list[0].email).toBe("test@x.com");
	});
});
