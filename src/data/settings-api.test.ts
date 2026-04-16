import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { makeSettings, mockHostname } from "@/test-utils";
import { changePassword, fetchSettings, patchSettings } from "./settings-api";
import { _resetWorkspaceStore, _setUserSettings } from "./workspace-mock-data";

const MOCK_SETTINGS = makeSettings();

beforeEach(() => {
	localStorage.clear();
	mockHostname("acme.localhost");
	_setUserSettings(MOCK_SETTINGS);
});

afterEach(() => {
	_resetWorkspaceStore();
});

describe("fetchSettings", () => {
	test("returns seeded user settings", async () => {
		const result = await fetchSettings();
		expect(result).toEqual(MOCK_SETTINGS);
	});
});

describe("patchSettings", () => {
	test("merges provided fields into the store and returns the updated settings", async () => {
		const result = await patchSettings({ first_name: "Пётр" });
		expect(result.first_name).toBe("Пётр");
		expect(result.last_name).toBe(MOCK_SETTINGS.last_name);

		const reread = await fetchSettings();
		expect(reread.first_name).toBe("Пётр");
	});
});

describe("changePassword", () => {
	test("always resolves with success detail (mock always succeeds)", async () => {
		const result = await changePassword("oldpass123", "newpass456");
		expect(result.detail).toMatch(/успеш/i);
	});
});
