import { afterEach, describe, expect, test, vi } from "vitest";
import { clearTokens, getAccessToken, isAuthenticated, readCsrfToken, setTokens } from "./auth";

afterEach(() => {
	localStorage.clear();
	sessionStorage.clear();
	document.cookie.split(";").forEach((c) => {
		const eq = c.indexOf("=");
		const name = (eq >= 0 ? c.slice(0, eq) : c).trim();
		if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
	});
	vi.restoreAllMocks();
});

describe("auth tokens", () => {
	test("setTokens stores access token in sessionStorage", () => {
		setTokens("access-123");
		expect(sessionStorage.getItem("auth-access-token")).toBe("access-123");
	});

	test("getAccessToken returns stored access token", () => {
		sessionStorage.setItem("auth-access-token", "my-access");
		expect(getAccessToken()).toBe("my-access");
	});

	test("getAccessToken returns null when no token stored", () => {
		expect(getAccessToken()).toBeNull();
	});

	test("clearTokens removes access token from sessionStorage", () => {
		setTokens("access");
		clearTokens();
		expect(sessionStorage.getItem("auth-access-token")).toBeNull();
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

describe("readCsrfToken", () => {
	test("returns null when no csrftoken cookie is set", () => {
		expect(readCsrfToken()).toBeNull();
	});

	test("returns the csrftoken cookie value when present", () => {
		document.cookie = "csrftoken=abc123";
		expect(readCsrfToken()).toBe("abc123");
	});

	test("ignores other cookies", () => {
		document.cookie = "sessionid=foo";
		document.cookie = "csrftoken=xyz";
		document.cookie = "other=bar";
		expect(readCsrfToken()).toBe("xyz");
	});

	test("decodes URL-encoded cookie values", () => {
		document.cookie = "csrftoken=" + encodeURIComponent("a/b+c");
		expect(readCsrfToken()).toBe("a/b+c");
	});
});
