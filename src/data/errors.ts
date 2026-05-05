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

export class AuthError extends HttpError {
	constructor(status: 401 | 403, body?: unknown) {
		super(status, status === 401 ? "Unauthorized" : "Forbidden", body);
		this.name = "AuthError";
	}
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
