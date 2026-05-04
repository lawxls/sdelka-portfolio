import { AuthError, TooManyRequestsError, ValidationError } from "./errors";

/**
 * Translator for auth-flow API errors. Pivots on Django error codes (per-field
 * `code` values DRF returns alongside the message) so the UI can surface a
 * stable Russian copy regardless of how the upstream English string evolves.
 *
 * Returns `{ error, fieldErrors }`:
 *  - `error`: a top-of-form banner string (`null` when only field errors apply)
 *  - `fieldErrors`: per-field message keyed by field name; the first message
 *     wins so callers can show a single line under the input
 *
 * Coverage in this slice is intentionally narrow — `invalid_credentials` and
 * the throttling case are the two paths LoginPage exercises. Subsequent slices
 * extend the dictionary as register / reset-password flows migrate.
 */
export interface FormErrors {
	error: string | null;
	fieldErrors: Record<string, string>;
}

const GENERIC_ERROR = "Произошла ошибка. Попробуйте ещё раз.";

const TOP_LEVEL_CODES: Record<string, string> = {
	invalid_credentials: "Неверный пароль или почта",
	email_not_verified: "Подтвердите почту, чтобы войти",
	authentication_failed: "Не удалось войти. Попробуйте ещё раз.",
	invalid_or_expired_link: "Ссылка недействительна или истекла",
};

const FIELD_CODES: Record<string, string> = {
	password_too_common: "Пароль слишком распространён",
	password_too_short: "Пароль слишком короткий",
	password_too_similar: "Пароль слишком похож на ваши данные",
	password_entirely_numeric: "Пароль не может состоять только из цифр",
	passwords_do_not_match: "Пароли не совпадают",
	required: "Обязательное поле",
	blank: "Обязательное поле",
	invalid: "Некорректное значение",
	unique: "Уже занято",
};

export function extractFormErrors(err: unknown): FormErrors {
	if (err instanceof TooManyRequestsError) {
		const seconds = err.retryAfter;
		const suffix = seconds && seconds > 0 ? ` Повторите попытку через ${seconds} с.` : "";
		return { error: `Слишком много попыток.${suffix}`, fieldErrors: {} };
	}

	if (err instanceof ValidationError) {
		return { error: pickTopLevelError(err.body), fieldErrors: pickFieldErrors(err.body, err.fieldErrors) };
	}

	if (err instanceof AuthError) {
		return { error: pickTopLevelError(err.body) ?? GENERIC_ERROR, fieldErrors: {} };
	}

	return { error: GENERIC_ERROR, fieldErrors: {} };
}

function pickTopLevelError(body: unknown): string | null {
	if (!body || typeof body !== "object") return null;
	const code = (body as { code?: unknown }).code;
	if (typeof code === "string" && TOP_LEVEL_CODES[code]) return TOP_LEVEL_CODES[code];
	const detail = (body as { detail?: unknown }).detail;
	if (typeof detail === "string" && TOP_LEVEL_CODES[detail]) return TOP_LEVEL_CODES[detail];
	return null;
}

function pickFieldErrors(body: unknown, fallbackFieldErrors: Record<string, string[]>): Record<string, string> {
	const out: Record<string, string> = {};
	const codes = readFieldCodes(body);

	const fieldNames = new Set([...Object.keys(codes), ...Object.keys(fallbackFieldErrors ?? {})]);
	for (const field of fieldNames) {
		const code = codes[field];
		const russian = code ? FIELD_CODES[code] : undefined;
		if (russian) {
			out[field] = russian;
			continue;
		}
		const fallback = fallbackFieldErrors?.[field]?.[0];
		out[field] = fallback ?? "Некорректное значение";
	}
	return out;
}

interface DrfFieldCodes {
	[field: string]: string;
}

function readFieldCodes(body: unknown): DrfFieldCodes {
	if (!body || typeof body !== "object") return {};
	const obj = body as Record<string, unknown>;
	const out: DrfFieldCodes = {};

	for (const [field, value] of Object.entries(obj)) {
		if (field === "code" || field === "detail" || field === "fieldErrors" || field === "errors") continue;
		const code = pickCodeFromFieldValue(value);
		if (code) out[field] = code;
	}

	const errors = (obj as { errors?: unknown }).errors ?? (obj as { fieldErrors?: unknown }).fieldErrors;
	if (errors && typeof errors === "object") {
		for (const [field, value] of Object.entries(errors as Record<string, unknown>)) {
			const code = pickCodeFromFieldValue(value);
			if (code) out[field] = code;
		}
	}
	return out;
}

function pickCodeFromFieldValue(value: unknown): string | null {
	if (Array.isArray(value)) {
		for (const entry of value) {
			const code = pickCodeFromFieldValue(entry);
			if (code) return code;
		}
		return null;
	}
	if (value && typeof value === "object") {
		const code = (value as { code?: unknown }).code;
		if (typeof code === "string") return code;
	}
	return null;
}
