import { describe, expect, it } from "vitest";
import { type DrfCursorPage, toCursorPage } from "./drf";

/**
 * DRF cursor-pagination shape — the SPA's HTTP adapters route every paginated
 * GET through `toCursorPage` so the FE-canonical `CursorPage<T>` is the only
 * shape callers see. The opaque `?cursor=<token>` is parsed out of `next`.
 */
describe("toCursorPage", () => {
	it("returns null cursor when next is null", () => {
		const page: DrfCursorPage<number> = { next: null, previous: null, results: [1, 2, 3] };
		expect(toCursorPage(page)).toEqual({ items: [1, 2, 3], nextCursor: null });
	});

	it("extracts the cursor token from a next URL", () => {
		const page: DrfCursorPage<string> = {
			next: "https://api.example.com/items/?cursor=cD0yMDI2",
			previous: null,
			results: ["a"],
		};
		expect(toCursorPage(page).nextCursor).toBe("cD0yMDI2");
	});

	it("extracts the cursor even when next carries unrelated query params", () => {
		const page: DrfCursorPage<string> = {
			next: "/api/v1/items/?q=widget&cursor=cD0xMjM&pageSize=50",
			previous: null,
			results: [],
		};
		expect(toCursorPage(page).nextCursor).toBe("cD0xMjM");
	});

	it("returns null cursor when next has no cursor param", () => {
		const page: DrfCursorPage<string> = {
			next: "/api/v1/items/?q=widget",
			previous: null,
			results: ["x"],
		};
		expect(toCursorPage(page).nextCursor).toBeNull();
	});

	it("handles empty result arrays", () => {
		expect(toCursorPage<number>({ next: null, previous: null, results: [] })).toEqual({
			items: [],
			nextCursor: null,
		});
	});

	it("passes results array through untouched", () => {
		const rows = [
			{ id: "a", n: 1 },
			{ id: "b", n: 2 },
		];
		expect(toCursorPage({ next: null, previous: null, results: rows }).items).toBe(rows);
	});
});
