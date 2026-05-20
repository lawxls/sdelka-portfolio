import { describe, expect, test } from "vitest";
import { AuthError } from "./errors";

/**
 * Tests for the structured 403 envelope inspection on `AuthError`. The backend's
 * permission layer ships three named codes — each surfaces as a distinct
 * affordance in the UI (module-specific toast vs. inline form error), so the
 * client needs the code + module + required level on the thrown error itself.
 *
 * 403s without a recognized envelope keep the generic behavior (no `code`,
 * no `module`, no `required`) — UI fallback stays untouched.
 */

describe("AuthError envelope — permission_denied_module", () => {
	test("exposes code, module, and required when body matches the envelope", () => {
		const err = new AuthError(403, {
			code: "permission_denied_module",
			module: "tasks",
			required: "edit",
			detail: "You don't have edit on tasks.",
		});
		expect(err.code).toBe("permission_denied_module");
		expect(err.module).toBe("tasks");
		expect(err.required).toBe("edit");
	});

	test("missing module field falls back to generic (no code, no module)", () => {
		const err = new AuthError(403, { code: "permission_denied_module", required: "edit" });
		expect(err.code).toBeUndefined();
		expect(err.module).toBeUndefined();
	});

	test("unknown module value falls back to generic", () => {
		const err = new AuthError(403, {
			code: "permission_denied_module",
			module: "nonsense",
			required: "edit",
		});
		expect(err.code).toBeUndefined();
		expect(err.module).toBeUndefined();
	});

	test("unknown required level falls back to generic", () => {
		const err = new AuthError(403, {
			code: "permission_denied_module",
			module: "tasks",
			required: "superedit",
		});
		expect(err.code).toBeUndefined();
		expect(err.required).toBeUndefined();
	});
});

describe("AuthError envelope — cannot_modify_workspace_owner", () => {
	test("exposes code; module/required stay undefined", () => {
		const err = new AuthError(403, {
			code: "cannot_modify_workspace_owner",
			detail: "Owner can't be demoted.",
		});
		expect(err.code).toBe("cannot_modify_workspace_owner");
		expect(err.module).toBeUndefined();
		expect(err.required).toBeUndefined();
	});
});

describe("AuthError envelope — admin_role_required", () => {
	test("exposes code; module/required stay undefined", () => {
		const err = new AuthError(403, { code: "admin_role_required", detail: "Admin role required" });
		expect(err.code).toBe("admin_role_required");
		expect(err.module).toBeUndefined();
		expect(err.required).toBeUndefined();
	});
});

describe("AuthError envelope — fallback", () => {
	test("403 with no recognized code carries no envelope fields", () => {
		const err = new AuthError(403, { code: "weird_unknown_code", detail: "huh?" });
		expect(err.code).toBeUndefined();
		expect(err.module).toBeUndefined();
	});

	test("403 with no body carries no envelope fields", () => {
		const err = new AuthError(403);
		expect(err.code).toBeUndefined();
	});

	test("403 with a string body carries no envelope fields", () => {
		const err = new AuthError(403, "Forbidden");
		expect(err.code).toBeUndefined();
	});

	test("401 ignores envelope codes — the permission envelopes are 403-only by contract", () => {
		const err = new AuthError(401, { code: "admin_role_required" });
		expect(err.code).toBeUndefined();
	});
});
