import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthError, ConflictError, HttpError, NetworkError, NotFoundError, ValidationError } from "./errors";
import { createHttpClient } from "./http-client";

type FakeFetch = (input: string, init?: RequestInit) => Promise<Response>;

function jsonResponse(status: number, body: unknown): Response {
	const hasBody = body !== undefined && status !== 204;
	return new Response(hasBody ? JSON.stringify(body) : null, {
		status,
		headers: hasBody ? { "content-type": "application/json" } : undefined,
	});
}

function setup(fetchImpl: FakeFetch, opts: { token?: string | null } = {}) {
	return createHttpClient({
		baseUrl: "https://api.test",
		fetch: fetchImpl,
		getToken: () => opts.token ?? null,
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("httpClient — request construction", () => {
	it("attaches Bearer token from getToken", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
		const http = setup(fetchSpy, { token: "abc-123" });

		await http.get("/foo");

		const init = fetchSpy.mock.calls[0][1] as RequestInit;
		expect((init.headers as Headers).get("Authorization")).toBe("Bearer abc-123");
	});

	it("omits Authorization header when no token", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
		const http = setup(fetchSpy);

		await http.get("/foo");

		const init = fetchSpy.mock.calls[0][1] as RequestInit;
		expect((init.headers as Headers).has("Authorization")).toBe(false);
	});

	it("prepends baseUrl to the path", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, {}));
		const http = setup(fetchSpy);

		await http.get("/foo");

		expect(fetchSpy.mock.calls[0][0]).toBe("https://api.test/foo");
	});

	it("serializes JSON body and sets content-type for POST/PATCH", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, {}));
		const http = setup(fetchSpy);

		await http.post("/foo", { body: { name: "x" } });

		const init = fetchSpy.mock.calls[0][1] as RequestInit;
		expect(init.method).toBe("POST");
		expect(init.body).toBe(JSON.stringify({ name: "x" }));
		expect((init.headers as Headers).get("Content-Type")).toBe("application/json");
	});

	it("uses correct HTTP method per verb", async () => {
		const fetchSpy = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(200, {})));
		const http = setup(fetchSpy);

		await http.get("/a");
		await http.post("/a");
		await http.patch("/a");
		await http.delete("/a");

		expect(fetchSpy.mock.calls.map((c) => (c[1] as RequestInit).method)).toEqual(["GET", "POST", "PATCH", "DELETE"]);
	});
});

describe("httpClient — body parsing", () => {
	it("parses JSON response body", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, { id: "1", name: "x" }));
		const http = setup(fetchSpy);

		const result = await http.get<{ id: string; name: string }>("/foo");

		expect(result).toEqual({ id: "1", name: "x" });
	});

	it("returns undefined for 204 No Content", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		const http = setup(fetchSpy);

		const result = await http.delete<void>("/foo");

		expect(result).toBeUndefined();
	});

	it("returns undefined when content-type is not JSON", async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response("hello", { status: 200, headers: { "content-type": "text/plain" } }));
		const http = setup(fetchSpy);

		const result = await http.get<unknown>("/foo");

		expect(result).toBeUndefined();
	});
});

describe("httpClient — status-code-to-error mapping", () => {
	it("400 with fieldErrors → ValidationError", async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(jsonResponse(400, { fieldErrors: { name: ["required"], email: "invalid" } }));
		const http = setup(fetchSpy);

		try {
			await http.post("/foo", { body: {} });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ name: ["required"], email: ["invalid"] });
		}
	});

	it("401 → AuthError", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(401, {}));
		const http = setup(fetchSpy);

		await expect(http.get("/foo")).rejects.toBeInstanceOf(AuthError);
	});

	it("403 → AuthError", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(403, {}));
		const http = setup(fetchSpy);

		await expect(http.get("/foo")).rejects.toBeInstanceOf(AuthError);
	});

	it("404 → NotFoundError", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(404, {}));
		const http = setup(fetchSpy);

		await expect(http.get("/foo")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("409 → ConflictError", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(409, {}));
		const http = setup(fetchSpy);

		await expect(http.get("/foo")).rejects.toBeInstanceOf(ConflictError);
	});

	it("500 → generic HttpError with status", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(500, {}));
		const http = setup(fetchSpy);

		try {
			await http.get("/foo");
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(HttpError);
			expect((err as HttpError).status).toBe(500);
		}
	});
});

describe("httpClient — network failures", () => {
	it("fetch rejection → NetworkError", async () => {
		const fetchSpy = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = setup(fetchSpy);

		await expect(http.get("/foo")).rejects.toBeInstanceOf(NetworkError);
	});

	it("non-JSON 4xx body still maps to typed error", async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response("Not Found", { status: 404, headers: { "content-type": "text/plain" } }));
		const http = setup(fetchSpy);

		await expect(http.get("/foo")).rejects.toBeInstanceOf(NotFoundError);
	});
});
