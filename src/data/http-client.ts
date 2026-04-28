import { getAccessToken } from "./auth";
import {
	AuthError,
	ConflictError,
	type FieldErrors,
	HttpError,
	NetworkError,
	NotFoundError,
	ValidationError,
} from "./errors";

/** Build-time API base URL. Empty in tests / dev when absent. */
const BASE_URL = (import.meta.env?.VITE_API_BASE_URL ?? "") as string;

interface RequestOptions {
	signal?: AbortSignal;
}

interface BodyOptions extends RequestOptions {
	body?: unknown;
}

export interface HttpClient {
	get<T>(path: string, opts?: RequestOptions): Promise<T>;
	post<T>(path: string, opts?: BodyOptions): Promise<T>;
	patch<T>(path: string, opts?: BodyOptions): Promise<T>;
	delete<T>(path: string, opts?: RequestOptions): Promise<T>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface CreateOptions {
	baseUrl?: string;
	fetch?: FetchLike;
	getToken?: () => string | null;
}

export function createHttpClient(options: CreateOptions = {}): HttpClient {
	const baseUrl = options.baseUrl ?? BASE_URL;
	const fetchImpl: FetchLike = options.fetch ?? ((input, init) => fetch(input, init));
	const tokenSource = options.getToken ?? getAccessToken;

	async function request<T>(method: string, path: string, opts: BodyOptions = {}): Promise<T> {
		const url = baseUrl ? `${baseUrl}${path}` : path;
		const headers = new Headers();
		const token = tokenSource();
		if (token) headers.set("Authorization", `Bearer ${token}`);
		let body: BodyInit | undefined;
		if (opts.body !== undefined) {
			headers.set("Content-Type", "application/json");
			body = JSON.stringify(opts.body);
		}

		let res: Response;
		try {
			res = await fetchImpl(url, { method, headers, body, signal: opts.signal });
		} catch (cause) {
			throw new NetworkError(cause);
		}

		if (res.ok) return parseBody<T>(res);
		throw await mapStatusToError(res);
	}

	return {
		get: (path, opts) => request("GET", path, opts),
		post: (path, opts) => request("POST", path, opts),
		patch: (path, opts) => request("PATCH", path, opts),
		delete: (path, opts) => request("DELETE", path, opts),
	};
}

async function parseBody<T>(res: Response): Promise<T> {
	if (res.status === 204) return undefined as T;
	const contentType = res.headers.get("content-type") ?? "";
	if (!contentType.includes("application/json")) return undefined as T;
	const text = await res.text();
	if (!text) return undefined as T;
	return JSON.parse(text) as T;
}

async function mapStatusToError(res: Response): Promise<HttpError> {
	const body = await safeJson(res);
	if (res.status === 400) return new ValidationError(extractFieldErrors(body), body);
	if (res.status === 401) return new AuthError(401, body);
	if (res.status === 403) return new AuthError(403, body);
	if (res.status === 404) return new NotFoundError(body);
	if (res.status === 409) return new ConflictError(body);
	return new HttpError(res.status, `HTTP ${res.status}`, body);
}

async function safeJson(res: Response): Promise<unknown> {
	try {
		const text = await res.text();
		return text ? JSON.parse(text) : undefined;
	} catch {
		return undefined;
	}
}

function extractFieldErrors(body: unknown): FieldErrors {
	if (!body || typeof body !== "object") return {};
	const candidate =
		(body as { fieldErrors?: unknown; errors?: unknown }).fieldErrors ?? (body as { errors?: unknown }).errors;
	if (!candidate || typeof candidate !== "object") return {};
	const out: FieldErrors = {};
	for (const [field, value] of Object.entries(candidate as Record<string, unknown>)) {
		if (Array.isArray(value)) out[field] = value.map(String);
		else if (typeof value === "string") out[field] = [value];
	}
	return out;
}

/** Default singleton used by HTTP adapters in the production composition root. */
export const httpClient = createHttpClient();
