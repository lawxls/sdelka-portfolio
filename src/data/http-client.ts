import { getAccessToken, readCsrfToken } from "./auth";
import {
	AuthError,
	ConflictError,
	type FieldErrors,
	HttpError,
	NetworkError,
	NotFoundError,
	TooManyRequestsError,
	ValidationError,
} from "./errors";

/** Build-time API base URL. Defaults to `/api/v1` so all adapter paths join
 * onto the Django v1 namespace; override with `VITE_API_BASE_URL` (e.g. an
 * absolute URL when the SPA is served from a different origin). */
const BASE_URL = (import.meta.env?.VITE_API_BASE_URL ?? "/api/v1") as string;

const STATE_CHANGING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

interface RequestOptions {
	signal?: AbortSignal;
}

interface BodyOptions extends RequestOptions {
	body?: unknown;
	/** Internal: when true, a 401 response throws AuthError directly instead of
	 * triggering the refresh-and-retry interceptor. The `/auth/refresh/` and
	 * `/auth/login/` endpoints use this to avoid infinite recursion. */
	skipRefresh?: boolean;
}

export interface BinaryDownload {
	blob: Blob;
	filename: string;
}

export interface HttpClient {
	get<T>(path: string, opts?: RequestOptions): Promise<T>;
	post<T>(path: string, opts?: BodyOptions): Promise<T>;
	patch<T>(path: string, opts?: BodyOptions): Promise<T>;
	delete<T>(path: string, opts?: RequestOptions): Promise<T>;
	/** GET a binary payload (e.g. xlsx export). Filename is taken from the
	 * `Content-Disposition` header when present, otherwise the URL path tail. */
	getBinary(path: string, opts?: RequestOptions & { fallbackFilename?: string }): Promise<BinaryDownload>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface CreateOptions {
	baseUrl?: string;
	fetch?: FetchLike;
	getToken?: () => string | null;
	getCsrfToken?: () => string | null;
	/** Called when a request gets 401: the http-client awaits this once across
	 * concurrent failing requests, then retries the original on success. */
	refresh?: () => Promise<void>;
	/** Called when refresh itself fails. The default singleton wires this to
	 * `clearTokens()` which dispatches `AUTH_CLEARED_EVENT`. */
	onAuthCleared?: () => void;
}

let defaultRefresh: (() => Promise<void>) | null = null;
let defaultOnAuthCleared: (() => void) | null = null;

/** Boot-time injection point for the singleton http-client. The composition
 * root calls this once after constructing the SessionClient so the 401-refresh
 * interceptor knows how to recover. */
export function installAuthHandlers(
	handlers: { refresh?: () => Promise<void>; onAuthCleared?: () => void } | null,
): void {
	defaultRefresh = handlers?.refresh ?? null;
	defaultOnAuthCleared = handlers?.onAuthCleared ?? null;
}

export function createHttpClient(options: CreateOptions = {}): HttpClient {
	const baseUrl = options.baseUrl ?? BASE_URL;
	const fetchImpl: FetchLike = options.fetch ?? ((input, init) => fetch(input, init));
	const tokenSource = options.getToken ?? getAccessToken;
	const csrfSource = options.getCsrfToken ?? readCsrfToken;
	let inflightRefresh: Promise<void> | null = null;

	function buildHeaders(method: string, hasBody: boolean): Headers {
		const headers = new Headers();
		const token = tokenSource();
		if (token) headers.set("Authorization", `Bearer ${token}`);
		if (hasBody) headers.set("Content-Type", "application/json");
		if (STATE_CHANGING_METHODS.has(method)) {
			const csrf = csrfSource();
			if (csrf) headers.set("X-CSRFToken", csrf);
		}
		return headers;
	}

	async function rawRequest<T>(method: string, path: string, opts: BodyOptions = {}): Promise<T> {
		const url = baseUrl ? `${baseUrl}${path}` : path;
		const hasBody = opts.body !== undefined;
		const headers = buildHeaders(method, hasBody);
		const body: BodyInit | undefined = hasBody ? JSON.stringify(opts.body) : undefined;

		let res: Response;
		try {
			res = await fetchImpl(url, { method, headers, body, signal: opts.signal, credentials: "include" });
		} catch (cause) {
			throw new NetworkError(cause);
		}

		if (res.ok) return parseBody<T>(res);
		throw await mapStatusToError(res);
	}

	async function withRefreshOnAuth<T>(exec: () => Promise<T>, skipRefresh?: boolean): Promise<T> {
		try {
			return await exec();
		} catch (err) {
			if (skipRefresh) throw err;
			if (!(err instanceof AuthError) || err.status !== 401) throw err;
			const refresh = options.refresh ?? defaultRefresh;
			if (!refresh) throw err;

			if (!inflightRefresh) {
				inflightRefresh = refresh().finally(() => {
					inflightRefresh = null;
				});
			}

			try {
				await inflightRefresh;
			} catch {
				const onCleared = options.onAuthCleared ?? defaultOnAuthCleared;
				onCleared?.();
				throw err;
			}

			return await exec();
		}
	}

	function request<T>(method: string, path: string, opts: BodyOptions = {}): Promise<T> {
		return withRefreshOnAuth(() => rawRequest<T>(method, path, opts), opts.skipRefresh);
	}

	async function rawBinary(
		path: string,
		opts: RequestOptions & { fallbackFilename?: string },
	): Promise<BinaryDownload> {
		const url = baseUrl ? `${baseUrl}${path}` : path;
		const headers = buildHeaders("GET", false);

		let res: Response;
		try {
			res = await fetchImpl(url, { method: "GET", headers, signal: opts.signal, credentials: "include" });
		} catch (cause) {
			throw new NetworkError(cause);
		}

		if (!res.ok) throw await mapStatusToError(res);
		const blob = await res.blob();
		const filename = filenameFrom(res.headers.get("content-disposition"), path, opts.fallbackFilename);
		return { blob, filename };
	}

	function requestBinary(
		path: string,
		opts: RequestOptions & { fallbackFilename?: string } = {},
	): Promise<BinaryDownload> {
		return withRefreshOnAuth(() => rawBinary(path, opts));
	}

	return {
		get: (path, opts) => request("GET", path, opts),
		post: (path, opts) => request("POST", path, opts),
		patch: (path, opts) => request("PATCH", path, opts),
		delete: (path, opts) => request("DELETE", path, opts),
		getBinary: (path, opts) => requestBinary(path, opts),
	};
}

function filenameFrom(contentDisposition: string | null, path: string, fallback?: string): string {
	if (contentDisposition) {
		const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
		if (utf8) return decodeURIComponent(utf8[1].trim());
		const quoted = /filename\s*=\s*"([^"]+)"/i.exec(contentDisposition);
		if (quoted) return quoted[1];
		const bare = /filename\s*=\s*([^;]+)/i.exec(contentDisposition);
		if (bare) return bare[1].trim();
	}
	if (fallback) return fallback;
	const tail = path.split("?")[0].split("/").filter(Boolean).pop();
	return tail || "download";
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
	if (res.status === 429) return new TooManyRequestsError(parseRetryAfter(res.headers.get("retry-after")), body);
	return new HttpError(res.status, `HTTP ${res.status}`, body);
}

function parseRetryAfter(header: string | null): number | null {
	if (!header) return null;
	const seconds = Number(header);
	if (Number.isFinite(seconds) && seconds >= 0) return seconds;
	return null;
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
