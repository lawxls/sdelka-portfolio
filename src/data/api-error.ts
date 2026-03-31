export class ApiError extends Error {
	status: number;
	body: unknown;

	constructor(status: number, body: unknown) {
		super(`API error ${status}`);
		this.name = "ApiError";
		this.status = status;
		this.body = body;
	}

	get detail(): string | undefined {
		return (this.body as { detail?: string } | null)?.detail;
	}
}

export function getErrorDetail(err: unknown): string | undefined {
	return err instanceof ApiError ? err.detail : undefined;
}
