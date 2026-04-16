import { afterEach, describe, expect, test, vi } from "vitest";
import {
	clearInvitationCode,
	clearTokens,
	getAccessToken,
	getInvitationCode,
	isAuthenticated,
	setInvitationCode,
	setTokens,
} from "./auth";

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("auth tokens", () => {
	test("setTokens stores access token in localStorage", () => {
		setTokens("access-123");
		expect(localStorage.getItem("auth-access-token")).toBe("access-123");
	});

	test("getAccessToken returns stored access token", () => {
		localStorage.setItem("auth-access-token", "my-access");
		expect(getAccessToken()).toBe("my-access");
	});

	test("getAccessToken returns null when no token stored", () => {
		expect(getAccessToken()).toBeNull();
	});

	test("clearTokens removes access token from localStorage", () => {
		setTokens("access");
		clearTokens();
		expect(localStorage.getItem("auth-access-token")).toBeNull();
	});

	test("clearTokens dispatches auth:cleared event", () => {
		const handler = vi.fn();
		window.addEventListener("auth:cleared", handler);
		clearTokens();
		expect(handler).toHaveBeenCalledTimes(1);
		window.removeEventListener("auth:cleared", handler);
	});

	test("isAuthenticated returns true when access token exists", () => {
		setTokens("access");
		expect(isAuthenticated()).toBe(true);
	});

	test("isAuthenticated returns false when no access token", () => {
		expect(isAuthenticated()).toBe(false);
	});
});

describe("invitation code", () => {
	test("setInvitationCode stores code in localStorage", () => {
		setInvitationCode("ABC12");
		expect(localStorage.getItem("auth-invitation-code")).toBe("ABC12");
	});

	test("getInvitationCode returns stored code", () => {
		localStorage.setItem("auth-invitation-code", "XYZ99");
		expect(getInvitationCode()).toBe("XYZ99");
	});

	test("getInvitationCode returns null when no code stored", () => {
		expect(getInvitationCode()).toBeNull();
	});

	test("clearInvitationCode removes code from localStorage", () => {
		setInvitationCode("ABC12");
		clearInvitationCode();
		expect(localStorage.getItem("auth-invitation-code")).toBeNull();
	});
});
