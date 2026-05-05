import { describe, expect, test } from "vitest";
import { extractFormErrors } from "./auth-errors";
import { AuthError, NetworkError, TooManyRequestsError, ValidationError } from "./errors";

describe("extractFormErrors — top-level codes", () => {
	test("invalid_credentials → Неверный пароль или почта", () => {
		const err = new AuthError(401, { code: "invalid_credentials" });
		expect(extractFormErrors(err)).toEqual({
			error: "Неверный пароль или почта",
			fieldErrors: {},
		});
	});

	test("email_not_verified surfaces a Russian message", () => {
		const err = new AuthError(403, { code: "email_not_verified" });
		expect(extractFormErrors(err).error).toBe("Подтвердите почту, чтобы войти");
	});

	test("invalid_or_expired_link on confirm-email/reset-password failures", () => {
		const err = new ValidationError({}, { code: "invalid_or_expired_link" });
		expect(extractFormErrors(err).error).toBe("Ссылка недействительна или истекла");
	});

	test("AuthError with unknown code falls back to a generic Russian banner", () => {
		const err = new AuthError(401, { code: "weird_unknown_code" });
		expect(extractFormErrors(err).error).toBe("Произошла ошибка. Попробуйте ещё раз.");
	});

	test("AuthError with no body falls back to a generic Russian banner", () => {
		const err = new AuthError(401, undefined);
		expect(extractFormErrors(err).error).toBe("Произошла ошибка. Попробуйте ещё раз.");
	});

	test("non-HttpError input falls back to a generic Russian banner", () => {
		expect(extractFormErrors(new Error("oops")).error).toBe("Произошла ошибка. Попробуйте ещё раз.");
	});

	test("NetworkError falls back to the generic banner (UI doesn't pretend to know the cause)", () => {
		const err = new NetworkError(new TypeError("fetch failed"));
		expect(extractFormErrors(err).error).toBe("Произошла ошибка. Попробуйте ещё раз.");
	});
});

describe("extractFormErrors — throttling", () => {
	test("TooManyRequestsError with retryAfter surfaces a countdown banner", () => {
		const err = new TooManyRequestsError(45);
		const result = extractFormErrors(err);
		expect(result.error).toContain("45");
		expect(result.error).toMatch(/слишком много/i);
	});

	test("TooManyRequestsError without retryAfter still banners a throttle message", () => {
		const err = new TooManyRequestsError(null);
		expect(extractFormErrors(err).error).toMatch(/слишком много/i);
	});
});

describe("extractFormErrors — DRF field codes", () => {
	test("password_too_common code maps to Russian copy", () => {
		const err = new ValidationError(
			{ password: ["This password is too common."] },
			{ password: [{ message: "This password is too common.", code: "password_too_common" }] },
		);
		expect(extractFormErrors(err).fieldErrors).toEqual({ password: "Пароль слишком распространён" });
	});

	test("password_too_short code maps to Russian copy", () => {
		const err = new ValidationError(
			{ password: ["Too short"] },
			{ password: [{ message: "Too short", code: "password_too_short" }] },
		);
		expect(extractFormErrors(err).fieldErrors).toEqual({ password: "Пароль слишком короткий" });
	});

	test("passwords_do_not_match on password_confirm field", () => {
		const err = new ValidationError(
			{ password_confirm: ["Mismatch"] },
			{ password_confirm: [{ message: "Mismatch", code: "passwords_do_not_match" }] },
		);
		expect(extractFormErrors(err).fieldErrors).toEqual({ password_confirm: "Пароли не совпадают" });
	});

	test("unknown field code falls through to the original DRF message", () => {
		const err = new ValidationError(
			{ phone: ["Custom error"] },
			{ phone: [{ message: "Custom error", code: "weird_phone_code" }] },
		);
		expect(extractFormErrors(err).fieldErrors).toEqual({ phone: "Custom error" });
	});

	test("multiple fields each map independently", () => {
		const err = new ValidationError(
			{ email: ["taken"], password: ["too common"] },
			{
				email: [{ message: "taken", code: "unique" }],
				password: [{ message: "too common", code: "password_too_common" }],
			},
		);
		expect(extractFormErrors(err).fieldErrors).toEqual({
			email: "Уже занято",
			password: "Пароль слишком распространён",
		});
	});
});
