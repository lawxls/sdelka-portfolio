import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError, TooManyRequestsError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { createHttpSupportClient } from "./support-http";

/**
 * Adapter contract test for the support HTTP client. Stubs `fetch` and asserts
 * the message endpoint posts multipart form-data (message + repeated
 * `attachments` keys) and maps the documented error statuses.
 */
function makeFile(name: string, size = 1000): File {
	return new File([new Uint8Array(size)], name, { type: "application/pdf" });
}

function buildClient(respond: () => { status: number; body?: unknown }) {
	const calls: Array<{ method: string; path: string; body: FormData }> = [];
	const fetchStub = vi.fn(async (input: string, init?: RequestInit) => {
		calls.push({
			method: init?.method ?? "GET",
			path: new URL(input, "http://test").pathname,
			body: init?.body as FormData,
		});
		const result = respond();
		const hasBody = result.body !== undefined;
		return new Response(hasBody ? JSON.stringify(result.body) : null, {
			status: result.status,
			headers: hasBody ? { "content-type": "application/json" } : undefined,
		});
	});
	const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => "test-token" });
	return { client: createHttpSupportClient(http), calls };
}

describe("SupportClient HTTP contract", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("posts message and attachments as multipart to /support/messages/", async () => {
		const { client, calls } = buildClient(() => ({ status: 201 }));
		await client.send({
			message: "Не приходят письма",
			attachments: [makeFile("log.pdf"), makeFile("screenshot.pdf")],
		});

		const last = calls.at(-1);
		expect(last?.method).toBe("POST");
		expect(last?.path).toBe("/support/messages/");
		expect(last?.body).toBeInstanceOf(FormData);
		expect(last?.body.get("message")).toBe("Не приходят письма");
		const files = last?.body.getAll("attachments") as File[];
		expect(files.map((f) => f.name)).toEqual(["log.pdf", "screenshot.pdf"]);
	});

	it("omits the attachments key when none are provided", async () => {
		const { client, calls } = buildClient(() => ({ status: 201 }));
		await client.send({ message: "Просто вопрос" });

		const last = calls.at(-1);
		expect(last?.body.getAll("attachments")).toEqual([]);
		expect(last?.body.get("message")).toBe("Просто вопрос");
	});

	it("resolves on a 201 with an empty body", async () => {
		const { client } = buildClient(() => ({ status: 201 }));
		await expect(client.send({ message: "Спасибо" })).resolves.toBeUndefined();
	});

	it("surfaces ValidationError on 400", async () => {
		const { client } = buildClient(() => ({ status: 400, body: { message: ["This field may not be blank."] } }));
		await expect(client.send({ message: "" })).rejects.toBeInstanceOf(ValidationError);
	});

	it("surfaces TooManyRequestsError on 429", async () => {
		const { client } = buildClient(() => ({ status: 429, body: { detail: "Request was throttled." } }));
		await expect(client.send({ message: "spam" })).rejects.toBeInstanceOf(TooManyRequestsError);
	});

	it("surfaces AuthError on 401", async () => {
		const fetchStub = vi.fn(async () => new Response(null, { status: 401 }));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpSupportClient(http);
		await expect(client.send({ message: "hi" })).rejects.toBeInstanceOf(AuthError);
	});
});
