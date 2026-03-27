export class ApiError extends Error {
	status: number;
	body: unknown;

	constructor(status: number, body: unknown) {
		super(`API error ${status}`);
		this.name = "ApiError";
		this.status = status;
		this.body = body;
	}
}
