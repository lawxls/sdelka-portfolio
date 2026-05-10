import { describe, expect, test } from "vitest";
import { validatePassword } from "./password-validation";

describe("validatePassword", () => {
	test("returns error for empty password", () => {
		expect(validatePassword("")).toBe("Пароль должен содержать минимум 10 символов");
	});

	test("returns error for password shorter than 10 characters", () => {
		expect(validatePassword("abc1234")).toBe("Пароль должен содержать минимум 10 символов");
	});

	test("returns error for all-numeric password", () => {
		expect(validatePassword("1234567890")).toBe("Пароль не может состоять только из цифр");
	});

	test("returns null for valid password at min length", () => {
		expect(validatePassword("secure1234")).toBeNull();
	});

	test("returns null for long alphanumeric password", () => {
		expect(validatePassword("mypassword1")).toBeNull();
	});

	test("returns null for exactly 10 character mixed password", () => {
		expect(validatePassword("abcdefg123")).toBeNull();
	});

	test("checks min length before all-numeric", () => {
		expect(validatePassword("123456789")).toBe("Пароль должен содержать минимум 10 символов");
	});
});
