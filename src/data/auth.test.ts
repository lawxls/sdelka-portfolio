import { afterEach, describe, expect, it } from "vitest";
import { clearToken, getToken, hasToken, setToken } from "./auth";

afterEach(() => {
	localStorage.clear();
});

describe("getToken", () => {
	it("returns null when no token stored", () => {
		expect(getToken()).toBeNull();
	});

	it("returns the stored JWT", () => {
		localStorage.setItem("auth-token", "eyJ.test.jwt");
		expect(getToken()).toBe("eyJ.test.jwt");
	});
});

describe("setToken", () => {
	it("stores the JWT in localStorage", () => {
		setToken("eyJ.new.jwt");
		expect(localStorage.getItem("auth-token")).toBe("eyJ.new.jwt");
	});
});

describe("clearToken", () => {
	it("removes the token from localStorage", () => {
		setToken("eyJ.test.jwt");
		expect(getToken()).toBe("eyJ.test.jwt");

		clearToken();
		expect(getToken()).toBeNull();
	});
});

describe("hasToken", () => {
	it("returns false when no token stored", () => {
		expect(hasToken()).toBe(false);
	});

	it("returns true when a token is stored", () => {
		setToken("eyJ.test.jwt");
		expect(hasToken()).toBe(true);
	});

	it("returns false after clearToken", () => {
		setToken("eyJ.test.jwt");
		clearToken();
		expect(hasToken()).toBe(false);
	});
});
