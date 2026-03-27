import { describe, expect, test } from "vitest";
import { validatePassword } from "./password-validation";

describe("validatePassword", () => {
	test("returns error for empty password", () => {
		expect(validatePassword("")).toBe("Пароль должен содержать минимум 8 символов");
	});

	test("returns error for password shorter than 8 characters", () => {
		expect(validatePassword("abc1234")).toBe("Пароль должен содержать минимум 8 символов");
	});

	test("returns error for all-numeric password", () => {
		expect(validatePassword("12345678")).toBe("Пароль не может состоять только из цифр");
	});

	test("returns null for valid password", () => {
		expect(validatePassword("secure123")).toBeNull();
	});

	test("returns null for long alphanumeric password", () => {
		expect(validatePassword("mypassword")).toBeNull();
	});

	test("returns null for exactly 8 character mixed password", () => {
		expect(validatePassword("abcdefg1")).toBeNull();
	});

	test("checks min length before all-numeric", () => {
		expect(validatePassword("1234567")).toBe("Пароль должен содержать минимум 8 символов");
	});
});
