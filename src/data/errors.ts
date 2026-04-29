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
