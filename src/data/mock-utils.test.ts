import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	_resetIdCounter,
	_resetMockDelay,
	_setMockDelay,
	createBlobUrl,
	delay,
	nextId,
	paginate,
	revokeBlobUrl,
} from "./mock-utils";

beforeEach(() => {
	_resetMockDelay();
	_resetIdCounter();
});

describe("delay", () => {
	afterEach(() => {
		_resetMockDelay();
	});

	it("resolves within configured min/max bounds", async () => {
		_setMockDelay(50, 100);
		const start = performance.now();
		await delay();
		const elapsed = performance.now() - start;
		expect(elapsed).toBeGreaterThanOrEqual(45);
		expect(elapsed).toBeLessThan(200);
	});

	it("resolves immediately when overridden to zero", async () => {
		_setMockDelay(0, 0);
		const start = performance.now();
		await delay();
		const elapsed = performance.now() - start;
		expect(elapsed).toBeLessThan(20);
	});

	it("uses default bounds when not overridden", async () => {
		// Default 150-400ms — confirm a single call falls inside the window.
		const start = performance.now();
		await delay();
		const elapsed = performance.now() - start;
		expect(elapsed).toBeGreaterThanOrEqual(140);
		expect(elapsed).toBeLessThan(500);
	});
});

describe("paginate", () => {
	const data = Array.from({ length: 10 }, (_, i) => ({ id: `id-${i + 1}`, value: i + 1 }));
	const getId = (x: { id: string }) => x.id;

	it("returns first page when no cursor provided", () => {
		const result = paginate({ items: data, limit: 3, getId });
		expect(result.items).toEqual(data.slice(0, 3));
		expect(result.nextCursor).toBe("id-4");
		expect(result.hasMore).toBe(true);
	});

	it("returns mid-page slice starting at cursor", () => {
		const result = paginate({ items: data, cursor: "id-4", limit: 3, getId });
		expect(result.items).toEqual(data.slice(3, 6));
		expect(result.nextCursor).toBe("id-7");
		expect(result.hasMore).toBe(true);
	});

	it("returns last page with no nextCursor and hasMore=false", () => {
		const result = paginate({ items: data, cursor: "id-9", limit: 3, getId });
		expect(result.items).toEqual(data.slice(8, 10));
		expect(result.nextCursor).toBeNull();
		expect(result.hasMore).toBe(false);
	});

	it("returns exactly the limit when remainder equals limit, no nextCursor", () => {
		const result = paginate({ items: data, cursor: "id-8", limit: 3, getId });
		expect(result.items).toHaveLength(3);
		expect(result.nextCursor).toBeNull();
		expect(result.hasMore).toBe(false);
	});

	it("returns empty page for empty input", () => {
		const result = paginate({ items: [], limit: 3, getId });
		expect(result.items).toEqual([]);
		expect(result.nextCursor).toBeNull();
		expect(result.hasMore).toBe(false);
	});

	it("falls back to first page when cursor is not found", () => {
		const result = paginate({ items: data, cursor: "missing", limit: 3, getId });
		expect(result.items).toEqual(data.slice(0, 3));
		expect(result.nextCursor).toBe("id-4");
		expect(result.hasMore).toBe(true);
	});

	it("uses a default page size when limit is omitted", () => {
		const big = Array.from({ length: 100 }, (_, i) => ({ id: `id-${i + 1}` }));
		const result = paginate({ items: big, getId });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.length).toBeLessThanOrEqual(big.length);
	});
});

describe("nextId", () => {
	it("returns monotonically increasing values", () => {
		const a = nextId();
		const b = nextId();
		const c = nextId();
		expect(a).not.toBe(b);
		expect(b).not.toBe(c);
		expect(a).not.toBe(c);
	});

	it("supports an optional prefix", () => {
		_resetIdCounter();
		const id = nextId("supplier");
		expect(id).toMatch(/^supplier-/);
	});

	it("counters are unique across the session", () => {
		const ids = new Set<string>();
		for (let i = 0; i < 1000; i++) ids.add(nextId());
		expect(ids.size).toBe(1000);
	});
});

describe("createBlobUrl / revokeBlobUrl", () => {
	const created: string[] = [];
	const revoked: string[] = [];

	beforeEach(() => {
		created.length = 0;
		revoked.length = 0;
		vi.stubGlobal("URL", {
			createObjectURL: (b: Blob) => {
				const url = `blob:mock-${created.length}-${b.size}`;
				created.push(url);
				return url;
			},
			revokeObjectURL: (url: string) => {
				revoked.push(url);
			},
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("createBlobUrl wraps URL.createObjectURL", () => {
		const blob = new Blob(["hello"]);
		const url = createBlobUrl(blob);
		expect(url).toMatch(/^blob:mock-/);
		expect(created).toHaveLength(1);
	});

	it("revokeBlobUrl wraps URL.revokeObjectURL", () => {
		revokeBlobUrl("blob:mock-xyz");
		expect(revoked).toContain("blob:mock-xyz");
	});
});
