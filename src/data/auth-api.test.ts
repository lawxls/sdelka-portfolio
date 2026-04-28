import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { checkEmail, confirmEmail, forgotPassword, login, logout, register, resetPassword } from "./auth-api";
import { _resetIdCounter, _resetMockDelay, _setMockDelay } from "./mock-utils";

beforeEach(() => {
	_setMockDelay(0, 0);
	_resetIdCounter();
});

afterEach(() => {
	localStorage.clear();
	_resetMockDelay();
});

describe("login", () => {
	test("accepts any credentials and returns tokens echoing the email", async () => {
		const result = await login("a@b.com", "anything");
		expect(result.user.email).toBe("a@b.com");
		expect(result.access).toMatch(/^access-/);
		expect(result.refresh).toMatch(/^refresh-/);
	});

	test("accepts empty password", async () => {
		const result = await login("visitor@example.com", "");
		expect(result.user.email).toBe("visitor@example.com");
	});
});

describe("logout", () => {
	test("resolves without throwing", async () => {
		await expect(logout()).resolves.toBeUndefined();
	});
});

describe("checkEmail", () => {
	test("always returns exists: false so any email can register", async () => {
		expect(await checkEmail("new@user.com")).toEqual({ exists: false });
		expect(await checkEmail("already-seen@user.com")).toEqual({ exists: false });
	});
});

describe("confirmEmail", () => {
	test("returns success message", async () => {
		expect(await confirmEmail("uid-token-123")).toEqual({ message: "Email confirmed successfully" });
	});
});

describe("forgotPassword", () => {
	test("returns success detail", async () => {
		expect(await forgotPassword("user@example.com")).toEqual({ detail: "Password reset email sent" });
	});
});

describe("resetPassword", () => {
	test("returns success detail", async () => {
		expect(await resetPassword("uid-token-123", "newSecure1")).toEqual({ detail: "Password has been reset" });
	});
});

describe("register", () => {
	test("accepts any registration data and returns tokens", async () => {
		const result = await register({
			email: "new@user.com",
			password: "securePass1",
			first_name: "Иван",
			phone: "+71234567890",
			invitation_code: "ABC12",
		});
		expect(result.user.email).toBe("new@user.com");
		expect(result.access).toMatch(/^access-/);
		expect(result.refresh).toMatch(/^refresh-/);
	});
});
