import { afterEach, describe, expect, test, vi } from "vitest";
import {
	clearInvitationCode,
	clearTokens,
	getAccessToken,
	getInvitationCode,
	getRefreshToken,
	isAuthenticated,
	setInvitationCode,
	setTokens,
} from "./auth";

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("auth tokens", () => {
	test("setTokens stores access and refresh tokens in localStorage", () => {
		setTokens("access-123", "refresh-456");
		expect(localStorage.getItem("auth-access-token")).toBe("access-123");
		expect(localStorage.getItem("auth-refresh-token")).toBe("refresh-456");
	});

	test("getAccessToken returns stored access token", () => {
		localStorage.setItem("auth-access-token", "my-access");
		expect(getAccessToken()).toBe("my-access");
	});

	test("getAccessToken returns null when no token stored", () => {
		expect(getAccessToken()).toBeNull();
	});

	test("getRefreshToken returns stored refresh token", () => {
		localStorage.setItem("auth-refresh-token", "my-refresh");
		expect(getRefreshToken()).toBe("my-refresh");
	});

	test("getRefreshToken returns null when no token stored", () => {
		expect(getRefreshToken()).toBeNull();
	});

	test("clearTokens removes both tokens from localStorage", () => {
		setTokens("access", "refresh");
		clearTokens();
		expect(localStorage.getItem("auth-access-token")).toBeNull();
		expect(localStorage.getItem("auth-refresh-token")).toBeNull();
	});

	test("clearTokens dispatches auth:cleared event", () => {
		const handler = vi.fn();
		window.addEventListener("auth:cleared", handler);
		clearTokens();
		expect(handler).toHaveBeenCalledTimes(1);
		window.removeEventListener("auth:cleared", handler);
	});

	test("isAuthenticated returns true when access token exists", () => {
		setTokens("access", "refresh");
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
