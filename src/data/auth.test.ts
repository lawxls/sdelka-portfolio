import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAuth, isAuthenticated, setAuthenticated, validateCode } from "./auth";

const LS_KEY = "auth-timestamp";

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("isAuthenticated", () => {
	it("returns false when no stored data exists", () => {
		expect(isAuthenticated()).toBe(false);
	});

	it("returns true after setAuthenticated is called", () => {
		setAuthenticated();
		expect(isAuthenticated()).toBe(true);
	});

	it("returns false after 24h TTL expires", () => {
		setAuthenticated();
		expect(isAuthenticated()).toBe(true);

		// Advance time past 24 hours
		const over24h = 24 * 60 * 60 * 1000 + 1;
		vi.spyOn(Date, "now").mockReturnValue(Date.now() + over24h);

		expect(isAuthenticated()).toBe(false);
	});

	it("returns true just before 24h TTL expires", () => {
		setAuthenticated();

		const just_under_24h = 24 * 60 * 60 * 1000 - 1000;
		vi.spyOn(Date, "now").mockReturnValue(Date.now() + just_under_24h);

		expect(isAuthenticated()).toBe(true);
	});
});

describe("clearAuth", () => {
	it("removes authentication", () => {
		setAuthenticated();
		expect(isAuthenticated()).toBe(true);

		clearAuth();
		expect(isAuthenticated()).toBe(false);
	});

	it("removes localStorage key", () => {
		setAuthenticated();
		expect(localStorage.getItem(LS_KEY)).not.toBeNull();

		clearAuth();
		expect(localStorage.getItem(LS_KEY)).toBeNull();
	});
});

describe("validateCode", () => {
	it("returns true for the correct code", () => {
		expect(validateCode("Sd3lk")).toBe(true);
	});

	it("returns false for an incorrect code", () => {
		expect(validateCode("wrong")).toBe(false);
	});

	it("is case-sensitive", () => {
		expect(validateCode("sd3lk")).toBe(false);
		expect(validateCode("SD3LK")).toBe(false);
	});
});
