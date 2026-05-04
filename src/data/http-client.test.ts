import { afterEach, describe, expect, it, vi } from "vitest";
import {
	AuthError,
	ConflictError,
	HttpError,
	NetworkError,
	NotFoundError,
	TooManyRequestsError,
	ValidationError,
} from "./errors";
import { createHttpClient, installAuthHandlers } from "./http-client";

type FakeFetch = (input: string, init?: RequestInit) => Promise<Response>;

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
	const hasBody = body !== undefined && status !== 204;
	const finalHeaders = { ...(hasBody ? { "content-type": "application/json" } : {}), ...(headers ?? {}) };
	return new Response(hasBody ? JSON.stringify(body) : null, { status, headers: finalHeaders });
}

interface SetupOpts {
	token?: string | null;
	csrf?: string | null;
	refresh?: () => Promise<void>;
	onAuthCleared?: () => void;
}

function setup(fetchImpl: FakeFetch, opts: SetupOpts = {}) {
	return createHttpClient({
		baseUrl: "https://api.test",
		fetch: fetchImpl,
		getToken: () => opts.token ?? null,
		getCsrfToken: () => opts.csrf ?? null,
		refresh: opts.refresh,
		onAuthCleared: opts.onAuthCleared,
	});
}

afterEach(() => {
	vi.restoreAllMocks();
	installAuthHandlers(null);
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

describe("httpClient — credentials and CSRF", () => {
	it("includes credentials on every request so cookies traverse cross-origin", async () => {
		const fetchSpy = vi.fn().mockImplementation(async () => jsonResponse(200, {}));
		const http = setup(fetchSpy);

		await http.get("/foo");
		await http.post("/foo", { body: { x: 1 } });

		for (const call of fetchSpy.mock.calls) {
			expect((call[1] as RequestInit).credentials).toBe("include");
		}
	});

	it("echoes csrftoken cookie as X-CSRFToken on state-changing verbs", async () => {
		const fetchSpy = vi.fn().mockImplementation(async () => jsonResponse(200, {}));
		const http = setup(fetchSpy, { csrf: "csrf-abc" });

		await http.post("/foo", { body: {} });
		await http.patch("/foo", { body: {} });
		await http.delete("/foo");

		for (const call of fetchSpy.mock.calls) {
			expect((call[1] as RequestInit).headers).toBeInstanceOf(Headers);
			expect(((call[1] as RequestInit).headers as Headers).get("X-CSRFToken")).toBe("csrf-abc");
		}
	});

	it("does not attach X-CSRFToken to GET requests", async () => {
		const fetchSpy = vi.fn().mockImplementation(async () => jsonResponse(200, {}));
		const http = setup(fetchSpy, { csrf: "csrf-abc" });

		await http.get("/foo");

		expect(((fetchSpy.mock.calls[0][1] as RequestInit).headers as Headers).has("X-CSRFToken")).toBe(false);
	});

	it("omits X-CSRFToken when no csrftoken cookie is set", async () => {
		const fetchSpy = vi.fn().mockImplementation(async () => jsonResponse(200, {}));
		const http = setup(fetchSpy);

		await http.post("/foo", { body: {} });

		expect(((fetchSpy.mock.calls[0][1] as RequestInit).headers as Headers).has("X-CSRFToken")).toBe(false);
	});
});

describe("httpClient — 429 throttling", () => {
	it("maps 429 with Retry-After to TooManyRequestsError carrying parsed seconds", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(429, { detail: "throttled" }, { "retry-after": "30" }));
		const http = setup(fetchSpy);

		try {
			await http.post("/login", { body: {} });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(TooManyRequestsError);
			expect((err as TooManyRequestsError).retryAfter).toBe(30);
		}
	});

	it("retryAfter is null when Retry-After is absent", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(429, {}));
		const http = setup(fetchSpy);

		try {
			await http.post("/login", { body: {} });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(TooManyRequestsError);
			expect((err as TooManyRequestsError).retryAfter).toBeNull();
		}
	});

	it("retryAfter is null when Retry-After is unparseable (HTTP-date)", async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(jsonResponse(429, {}, { "retry-after": "Wed, 21 Oct 2026 07:28:00 GMT" }));
		const http = setup(fetchSpy);

		try {
			await http.post("/login", { body: {} });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(TooManyRequestsError);
			expect((err as TooManyRequestsError).retryAfter).toBeNull();
		}
	});
});

describe("httpClient — single-flight 401 refresh", () => {
	it("triggers refresh exactly once when N concurrent requests get 401, then retries each", async () => {
		let refreshCount = 0;
		let unauthed = true;
		const fetchSpy = vi.fn().mockImplementation(async () => {
			if (unauthed) return jsonResponse(401, { detail: "stale" });
			return jsonResponse(200, { ok: true });
		});

		const refresh = vi.fn().mockImplementation(async () => {
			refreshCount += 1;
			unauthed = false;
		});

		const http = setup(fetchSpy, { refresh });

		const results = await Promise.all([http.get("/a"), http.get("/b"), http.get("/c")]);

		expect(refreshCount).toBe(1);
		expect(refresh).toHaveBeenCalledTimes(1);
		expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
		// 3 initial 401s + 3 retries = 6 fetch calls
		expect(fetchSpy).toHaveBeenCalledTimes(6);
	});

	it("propagates original AuthError and calls onAuthCleared once when refresh fails", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(401, { detail: "stale" }));
		const refresh = vi.fn().mockRejectedValue(new AuthError(401));
		const onAuthCleared = vi.fn();

		const http = setup(fetchSpy, { refresh, onAuthCleared });

		await expect(http.get("/a")).rejects.toBeInstanceOf(AuthError);
		expect(refresh).toHaveBeenCalledTimes(1);
		expect(onAuthCleared).toHaveBeenCalledTimes(1);
	});

	it("skipRefresh on a request short-circuits the interceptor", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(401, {}));
		const refresh = vi.fn();

		const http = setup(fetchSpy, { refresh });

		await expect(http.post("/auth/refresh/", { body: {}, skipRefresh: true })).rejects.toBeInstanceOf(AuthError);
		expect(refresh).not.toHaveBeenCalled();
	});

	it("does not retry if no refresh handler is configured", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(401, {}));
		const http = setup(fetchSpy);

		await expect(http.get("/a")).rejects.toBeInstanceOf(AuthError);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it("falls back to default refresh handlers installed via installAuthHandlers", async () => {
		const refresh = vi.fn().mockResolvedValue(undefined);
		const onAuthCleared = vi.fn();
		installAuthHandlers({ refresh, onAuthCleared });

		let unauthed = true;
		const fetchSpy = vi.fn().mockImplementation(async () => {
			if (unauthed) {
				unauthed = false;
				return jsonResponse(401, {});
			}
			return jsonResponse(200, { ok: true });
		});

		const http = createHttpClient({
			baseUrl: "https://api.test",
			fetch: fetchSpy,
			getToken: () => null,
			getCsrfToken: () => null,
		});

		const result = await http.get("/a");

		expect(refresh).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ ok: true });
	});

	it("if a second wave of requests comes after refresh resolves, fires a fresh refresh", async () => {
		let unauthed = true;
		const fetchSpy = vi.fn().mockImplementation(async () => {
			if (unauthed) return jsonResponse(401, {});
			return jsonResponse(200, { ok: true });
		});
		const refresh = vi.fn().mockImplementation(async () => {
			unauthed = false;
		});

		const http = setup(fetchSpy, { refresh });

		await http.get("/a");
		// Now simulate the access becoming stale again.
		unauthed = true;
		await http.get("/a");

		expect(refresh).toHaveBeenCalledTimes(2);
	});
});

describe("httpClient — getBinary", () => {
	it("returns blob and filename from Content-Disposition header", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response("bytes", {
				status: 200,
				headers: {
					"content-type": "application/octet-stream",
					"content-disposition": 'attachment; filename="report.xlsx"',
				},
			}),
		);
		const http = setup(fetchSpy);

		const result = await http.getBinary("/items/export?company=c1");

		expect(result.filename).toBe("report.xlsx");
		expect(await result.blob.text()).toBe("bytes");
	});

	it("decodes RFC 5987 filename* parameter", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response("x", {
				status: 200,
				headers: {
					"content-type": "application/octet-stream",
					"content-disposition": "attachment; filename*=UTF-8''items%20%D1%82%D0%B5%D1%81%D1%82.xlsx",
				},
			}),
		);
		const http = setup(fetchSpy);

		const result = await http.getBinary("/items/export");

		expect(result.filename).toBe("items тест.xlsx");
	});

	it("falls back to fallbackFilename when no Content-Disposition", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response("x", { status: 200 }));
		const http = setup(fetchSpy);

		const result = await http.getBinary("/items/export?a=1", { fallbackFilename: "items.xlsx" });

		expect(result.filename).toBe("items.xlsx");
	});

	it("attaches Bearer token", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response("x", { status: 200 }));
		const http = setup(fetchSpy, { token: "abc" });

		await http.getBinary("/items/export");

		const init = fetchSpy.mock.calls[0][1] as RequestInit;
		expect((init.headers as Headers).get("Authorization")).toBe("Bearer abc");
	});

	it("non-2xx status maps to typed error", async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
		const http = setup(fetchSpy);

		await expect(http.getBinary("/items/export")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("fetch rejection → NetworkError", async () => {
		const fetchSpy = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = setup(fetchSpy);

		await expect(http.getBinary("/items/export")).rejects.toBeInstanceOf(NetworkError);
	});

	it("401 triggers refresh-and-retry just like JSON requests", async () => {
		let unauthed = true;
		const fetchSpy = vi.fn().mockImplementation(async () => {
			if (unauthed) return new Response(null, { status: 401 });
			return new Response("bytes", {
				status: 200,
				headers: { "content-disposition": 'attachment; filename="r.xlsx"' },
			});
		});
		const refresh = vi.fn().mockImplementation(async () => {
			unauthed = false;
		});

		const http = setup(fetchSpy, { refresh });
		const result = await http.getBinary("/items/export");

		expect(refresh).toHaveBeenCalledTimes(1);
		expect(result.filename).toBe("r.xlsx");
		expect(await result.blob.text()).toBe("bytes");
	});
});
