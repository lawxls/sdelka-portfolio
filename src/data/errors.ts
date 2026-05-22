import { PERMISSION_LEVELS, PERMISSION_MODULE_KEYS, type PermissionLevel, type PermissionModuleKey } from "./types";

/** Per-field validation messages keyed by field name (matches RFC-7807-ish conventions). */
export type FieldErrors = Record<string, string[]>;

export class HttpError extends Error {
	readonly status: number;
	readonly body: unknown;

	constructor(status: number, message: string, body?: unknown) {
		super(message);
		this.name = "HttpError";
		this.status = status;
		this.body = body;
	}
}

export class NetworkError extends HttpError {
	constructor(cause?: unknown) {
		super(0, "Network request failed", cause);
		this.name = "NetworkError";
	}
}

/** Structured 403 codes the backend emits on the permission surface — each
 * gets its own UI affordance (module-specific toast vs. inline form error). */
type AuthErrorCode = "permission_denied_module" | "cannot_modify_workspace_owner" | "admin_role_required";

export class AuthError extends HttpError {
	readonly code?: AuthErrorCode;
	readonly module?: PermissionModuleKey;
	readonly required?: PermissionLevel;

	constructor(status: 401 | 403, body?: unknown) {
		super(status, status === 401 ? "Unauthorized" : "Forbidden", body);
		this.name = "AuthError";
		const envelope = status === 403 ? readEnvelope(body) : null;
		if (envelope) {
			this.code = envelope.code;
			if (envelope.code === "permission_denied_module") {
				this.module = envelope.module;
				this.required = envelope.required;
			}
		}
	}
}

interface PermissionDeniedEnvelope {
	code: "permission_denied_module";
	module: PermissionModuleKey;
	required: PermissionLevel;
}

interface OtherEnvelope {
	code: "cannot_modify_workspace_owner" | "admin_role_required";
}

const VALID_MODULES: ReadonlySet<string> = new Set(PERMISSION_MODULE_KEYS);
const VALID_LEVELS: ReadonlySet<string> = new Set(PERMISSION_LEVELS);

function readEnvelope(body: unknown): PermissionDeniedEnvelope | OtherEnvelope | null {
	if (!body || typeof body !== "object") return null;
	const code = (body as { code?: unknown }).code;
	if (typeof code !== "string") return null;
	if (code === "permission_denied_module") {
		const module = (body as { module?: unknown }).module;
		const required = (body as { required?: unknown }).required;
		if (
			typeof module === "string" &&
			VALID_MODULES.has(module) &&
			typeof required === "string" &&
			VALID_LEVELS.has(required)
		) {
			return {
				code: "permission_denied_module",
				module: module as PermissionModuleKey,
				required: required as PermissionLevel,
			};
		}
		return null;
	}
	if (code === "cannot_modify_workspace_owner" || code === "admin_role_required") {
		return { code };
	}
	return null;
}

export class NotFoundError extends HttpError {
	constructor(body?: unknown) {
		super(404, "Not found", body);
		this.name = "NotFoundError";
	}
}

export class ConflictError extends HttpError {
	constructor(body?: unknown) {
		super(409, "Conflict", body);
		this.name = "ConflictError";
	}
}

export class ValidationError extends HttpError {
	readonly fieldErrors: FieldErrors;

	constructor(fieldErrors: FieldErrors, body?: unknown) {
		super(400, "Validation failed", body);
		this.name = "ValidationError";
		this.fieldErrors = fieldErrors;
	}
}

/**
 * 429 — backend throttled the request. `retryAfter` is parsed from the
 * `Retry-After` header (seconds). Null when absent or unparseable; UI surfaces
 * a generic "try again later" in that case.
 */
export class TooManyRequestsError extends HttpError {
	readonly retryAfter: number | null;

	constructor(retryAfter: number | null, body?: unknown) {
		super(429, "Too Many Requests", body);
		this.name = "TooManyRequestsError";
		this.retryAfter = retryAfter;
	}
}

/** Stable per-restriction codes mirrored from
 * `sdelka_django.tariffs.choices.TariffRestriction` — drives the SPA's
 * per-feature toast and upgrade prompts. */
type TariffRestriction =
	| "monthly_inquiries"
	| "daily_inquiries"
	| "employees"
	| "companies"
	| "daily_emails"
	| "trial_expired";

/** 402 — caller's workspace hit a tariff-gated cap. The structured body
 * carries `restriction` so the UI can pick a per-feature toast. */
export class TariffLimitExceededError extends HttpError {
	readonly restriction: TariffRestriction | null;

	constructor(body?: unknown) {
		super(402, "Tariff limit exceeded", body);
		this.name = "TariffLimitExceededError";
		this.restriction = readRestriction(body);
	}
}

function readRestriction(body: unknown): TariffRestriction | null {
	if (!body || typeof body !== "object") return null;
	const value = (body as { restriction?: unknown }).restriction;
	return typeof value === "string" ? (value as TariffRestriction) : null;
}
