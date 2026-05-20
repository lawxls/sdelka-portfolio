import { describe, expect, test } from "vitest";
import { makeMe, makePermissions } from "@/test-utils";
import type { CurrentEmployee } from "./domains/profile";
import { canEdit, canView, effectiveLevel, firstAccessiblePath } from "./permissions";

function userMe(overrides: Partial<CurrentEmployee> = {}): CurrentEmployee {
	return makeMe({
		role: "user",
		isWorkspaceOwner: false,
		permissions: makePermissions(),
		...overrides,
	});
}

describe("effectiveLevel", () => {
	test("workspace owner gets edit regardless of role/permissions", () => {
		const me = makeMe({ isWorkspaceOwner: true, role: "user", permissions: makePermissions() });
		expect(effectiveLevel(me, "tasks")).toBe("edit");
		expect(effectiveLevel(me, "companies")).toBe("edit");
	});

	test("admin role gets edit on every module", () => {
		const me = makeMe({
			isWorkspaceOwner: false,
			role: "admin",
			permissions: makePermissions(),
		});
		expect(effectiveLevel(me, "tasks")).toBe("edit");
		expect(effectiveLevel(me, "emails")).toBe("edit");
	});

	test("user role returns the matrix value", () => {
		const me = userMe({ permissions: makePermissions({ tasks: "view", companies: "edit" }) });
		expect(effectiveLevel(me, "tasks")).toBe("view");
		expect(effectiveLevel(me, "companies")).toBe("edit");
		expect(effectiveLevel(me, "emails")).toBe("none");
	});

	test("archived-only user (role/permissions null) resolves every module to none", () => {
		const me = makeMe({ isWorkspaceOwner: false, role: null, permissions: null });
		expect(effectiveLevel(me, "tasks")).toBe("none");
		expect(effectiveLevel(me, "employees")).toBe("none");
	});

	test("missing me resolves to none", () => {
		expect(effectiveLevel(null, "tasks")).toBe("none");
		expect(effectiveLevel(undefined, "tasks")).toBe("none");
	});
});

describe("canView / canEdit", () => {
	test("canView is true for view and edit, false for none", () => {
		const me = userMe({
			permissions: makePermissions({ tasks: "view", companies: "edit", emails: "none" }),
		});
		expect(canView(me, "tasks")).toBe(true);
		expect(canView(me, "companies")).toBe(true);
		expect(canView(me, "emails")).toBe(false);
	});

	test("canEdit is true only for edit", () => {
		const me = userMe({
			permissions: makePermissions({ tasks: "view", companies: "edit" }),
		});
		expect(canEdit(me, "tasks")).toBe(false);
		expect(canEdit(me, "companies")).toBe(true);
	});
});

describe("firstAccessiblePath", () => {
	test("owner lands on /inquiries (first in nav order)", () => {
		expect(firstAccessiblePath(makeMe())).toBe("/inquiries");
	});

	test("user with only tasks visible lands on /tasks", () => {
		const me = userMe({ permissions: makePermissions({ tasks: "view" }) });
		expect(firstAccessiblePath(me)).toBe("/tasks");
	});

	test("user with only emails visible lands on /settings/emails", () => {
		const me = userMe({ permissions: makePermissions({ emails: "view" }) });
		expect(firstAccessiblePath(me)).toBe("/settings/emails");
	});

	test("user with no modules visible falls back to /settings/profile", () => {
		const me = userMe();
		expect(firstAccessiblePath(me)).toBe("/settings/profile");
	});

	test("archived-only user falls back to /settings/profile", () => {
		const me = makeMe({ isWorkspaceOwner: false, role: null, permissions: null });
		expect(firstAccessiblePath(me)).toBe("/settings/profile");
	});

	test("nav order honored — inquiries before positions even when both visible", () => {
		const me = userMe({
			permissions: makePermissions({ procurementInquiries: "view", positions: "edit" }),
		});
		expect(firstAccessiblePath(me)).toBe("/inquiries");
	});

	test("missing me falls back to /settings/profile", () => {
		expect(firstAccessiblePath(null)).toBe("/settings/profile");
		expect(firstAccessiblePath(undefined)).toBe("/settings/profile");
	});
});
