import type { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestQueryClient } from "@/test-utils";
import { applyOptimistic, applyToCache, rollbackOptimistic } from "./optimistic";

let qc: QueryClient;

beforeEach(() => {
	qc = createTestQueryClient();
});

describe("applyOptimistic — single-key target", () => {
	it("snapshots the current cache then applies the updater", async () => {
		qc.setQueryData(["item", "i1"], { id: "i1", name: "Old" });

		const ctx = await applyOptimistic(qc, [
			{
				queryKey: ["item", "i1"],
				update: (data: { id: string; name: string }) => ({ ...data, name: "New" }),
			},
		]);

		expect(qc.getQueryData(["item", "i1"])).toEqual({ id: "i1", name: "New" });
		expect(ctx.snapshots).toEqual([{ key: ["item", "i1"], data: { id: "i1", name: "Old" } }]);
	});

	it("skips a target whose cache is undefined", async () => {
		const ctx = await applyOptimistic(qc, [
			{
				queryKey: ["item", "missing"],
				update: () => "should not run",
			},
		]);

		expect(ctx.snapshots).toHaveLength(0);
		expect(qc.getQueryData(["item", "missing"])).toBeUndefined();
	});
});

describe("applyOptimistic — prefix target", () => {
	it("walks every cache whose key matches the prefix", async () => {
		qc.setQueryData(["items", { folder: "a" }], { count: 1 });
		qc.setQueryData(["items", { folder: "b" }], { count: 2 });
		qc.setQueryData(["items", { folder: "c" }], { count: 3 });
		qc.setQueryData(["totals"], { sum: 99 });

		await applyOptimistic(qc, [
			{
				queryKey: ["items"],
				prefix: true,
				update: (data: { count: number }) => ({ count: data.count * 10 }),
			},
		]);

		expect(qc.getQueryData(["items", { folder: "a" }])).toEqual({ count: 10 });
		expect(qc.getQueryData(["items", { folder: "b" }])).toEqual({ count: 20 });
		expect(qc.getQueryData(["items", { folder: "c" }])).toEqual({ count: 30 });
		expect(qc.getQueryData(["totals"])).toEqual({ sum: 99 });
	});

	it("threads the matched key into the updater", async () => {
		qc.setQueryData(["items", { folder: "a" }], { id: "i1" });
		qc.setQueryData(["items", { folder: "b" }], { id: "i1" });

		await applyOptimistic(qc, [
			{
				queryKey: ["items"],
				prefix: true,
				update: (data: { id: string }, key) => {
					const folder = (key[1] as { folder: string }).folder;
					return { ...data, folder };
				},
			},
		]);

		expect(qc.getQueryData(["items", { folder: "a" }])).toEqual({ id: "i1", folder: "a" });
		expect(qc.getQueryData(["items", { folder: "b" }])).toEqual({ id: "i1", folder: "b" });
	});
});

describe("applyOptimistic — multi-target", () => {
	it("snapshots and updates every target atomically", async () => {
		qc.setQueryData(["item", "i1"], { id: "i1", name: "Old" });
		qc.setQueryData(["items"], { items: [{ id: "i1", name: "Old" }] });
		qc.setQueryData(["totals"], { count: 5 });

		const ctx = await applyOptimistic(qc, [
			{ queryKey: ["item", "i1"], update: (d: { name: string }) => ({ ...d, name: "New" }) },
			{
				queryKey: ["items"],
				update: (d: { items: Array<{ id: string; name: string }> }) => ({
					items: d.items.map((i) => ({ ...i, name: "New" })),
				}),
			},
			{ queryKey: ["totals"], update: (d: { count: number }) => ({ count: d.count + 1 }) },
		]);

		expect(qc.getQueryData(["item", "i1"])).toEqual({ id: "i1", name: "New" });
		expect(qc.getQueryData(["items"])).toEqual({ items: [{ id: "i1", name: "New" }] });
		expect(qc.getQueryData(["totals"])).toEqual({ count: 6 });
		expect(ctx.snapshots).toHaveLength(3);
	});
});

describe("rollbackOptimistic", () => {
	it("restores every snapshot atomically", async () => {
		qc.setQueryData(["a"], { v: "a" });
		qc.setQueryData(["b"], { v: "b" });
		qc.setQueryData(["c"], { v: "c" });

		const ctx = await applyOptimistic(qc, [
			{ queryKey: ["a"], update: () => ({ v: "A" }) },
			{ queryKey: ["b"], update: () => ({ v: "B" }) },
			{ queryKey: ["c"], update: () => ({ v: "C" }) },
		]);

		expect(qc.getQueryData(["a"])).toEqual({ v: "A" });

		rollbackOptimistic(qc, ctx);

		expect(qc.getQueryData(["a"])).toEqual({ v: "a" });
		expect(qc.getQueryData(["b"])).toEqual({ v: "b" });
		expect(qc.getQueryData(["c"])).toEqual({ v: "c" });
	});

	it("is a no-op when given an undefined context", () => {
		qc.setQueryData(["a"], { v: "a" });
		expect(() => rollbackOptimistic(qc, undefined)).not.toThrow();
		expect(qc.getQueryData(["a"])).toEqual({ v: "a" });
	});

	it("rolls back every cache touched by a prefix-match target", async () => {
		qc.setQueryData(["items", { folder: "a" }], { count: 1 });
		qc.setQueryData(["items", { folder: "b" }], { count: 2 });

		const ctx = await applyOptimistic(qc, [
			{
				queryKey: ["items"],
				prefix: true,
				update: (data: { count: number }) => ({ count: data.count * 10 }),
			},
		]);

		expect(qc.getQueryData(["items", { folder: "a" }])).toEqual({ count: 10 });
		expect(qc.getQueryData(["items", { folder: "b" }])).toEqual({ count: 20 });

		rollbackOptimistic(qc, ctx);

		expect(qc.getQueryData(["items", { folder: "a" }])).toEqual({ count: 1 });
		expect(qc.getQueryData(["items", { folder: "b" }])).toEqual({ count: 2 });
	});
});

describe("applyToCache", () => {
	it("applies updates without snapshotting or cancelling", () => {
		qc.setQueryData(["item", "i1"], { id: "i1", name: "Old" });

		applyToCache(qc, [
			{
				queryKey: ["item", "i1"],
				update: (data: { name: string }) => ({ ...data, name: "New" }),
			},
		]);

		expect(qc.getQueryData(["item", "i1"])).toEqual({ id: "i1", name: "New" });
	});

	it("supports prefix matching", () => {
		qc.setQueryData(["items", { f: 1 }], { v: 1 });
		qc.setQueryData(["items", { f: 2 }], { v: 2 });

		applyToCache(qc, [
			{
				queryKey: ["items"],
				prefix: true,
				update: (data: { v: number }) => ({ v: data.v + 100 }),
			},
		]);

		expect(qc.getQueryData(["items", { f: 1 }])).toEqual({ v: 101 });
		expect(qc.getQueryData(["items", { f: 2 }])).toEqual({ v: 102 });
	});
});
