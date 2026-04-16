import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
	checkEmailMock,
	confirmEmailMock,
	forgotPasswordMock,
	loginMock,
	logoutMock,
	registerMock,
	resetPasswordMock,
	verifyInvitationCodeMock,
} from "./auth-mock-data";
import { _resetIdCounter, _resetMockDelay, _setMockDelay } from "./mock-utils";

beforeEach(() => {
	_setMockDelay(0, 0);
	_resetIdCounter();
});

afterEach(() => {
	_resetMockDelay();
});

describe("loginMock", () => {
	test("returns access, refresh, and user echoing the email", async () => {
		const result = await loginMock("visitor@example.com", "anything");
		expect(result.user.email).toBe("visitor@example.com");
		expect(result.access).toMatch(/^access-/);
		expect(result.refresh).toMatch(/^refresh-/);
	});

	test("accepts any password", async () => {
		const result = await loginMock("a@b.com", "");
		expect(result.user.email).toBe("a@b.com");
	});

	test("issues fresh tokens per call", async () => {
		const first = await loginMock("a@b.com", "x");
		const second = await loginMock("a@b.com", "x");
		expect(first.access).not.toBe(second.access);
	});
});

describe("registerMock", () => {
	test("returns tokens with submitted email", async () => {
		const result = await registerMock({
			email: "new@user.com",
			password: "securePass1",
			first_name: "Иван",
			phone: "+79991234567",
			invitation_code: "ABC12",
		});
		expect(result.user.email).toBe("new@user.com");
		expect(result.access).toMatch(/^access-/);
	});
});

describe("checkEmailMock", () => {
	test("always returns exists: false so registration proceeds", async () => {
		expect(await checkEmailMock("anyone@example.com")).toEqual({ exists: false });
	});
});

describe("verifyInvitationCodeMock", () => {
	test("always returns valid: true", async () => {
		expect(await verifyInvitationCodeMock("CODE1")).toEqual({ valid: true });
		expect(await verifyInvitationCodeMock("")).toEqual({ valid: true });
	});
});

describe("confirmEmailMock", () => {
	test("returns success message", async () => {
		expect(await confirmEmailMock("token-xyz")).toEqual({ message: "Email confirmed successfully" });
	});
});

describe("forgotPasswordMock", () => {
	test("returns detail message", async () => {
		expect(await forgotPasswordMock("user@example.com")).toEqual({ detail: "Password reset email sent" });
	});
});

describe("resetPasswordMock", () => {
	test("returns detail message", async () => {
		expect(await resetPasswordMock("token", "newPass1")).toEqual({ detail: "Password has been reset" });
	});
});

describe("logoutMock", () => {
	test("resolves to void", async () => {
		await expect(logoutMock()).resolves.toBeUndefined();
	});
});
