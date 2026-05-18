import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _resetItemDetailStore, getItemDetail, updateItemDetail } from "./item-detail-mock-data";
import {
	_getAllItems,
	_isArchived,
	_resetItemsStore,
	_setInquiryStateResolver,
	_setItems,
	createItemsBatchMock,
	deleteItemMock,
	exportItemsMock,
	fetchItemsMock,
	fetchTotalsMock,
	updateItemMock,
} from "./items-mock-data";
import type { ProcurementItem } from "./types";

interface InquirySeed {
	id: string;
	folderId: string | null;
	companyId?: string;
	isArchived?: boolean;
}

function makeItem(id: string, overrides: Partial<ProcurementItem> = {}): ProcurementItem {
	return {
		id,
		name: `Item ${id}`,
		status: "searching",
		annualQuantity: 100,
		currentPrice: 50,
		bestPrice: 40,
		averagePrice: 45,
		...overrides,
	};
}

let inquiries: InquirySeed[] = [];

function setInquiries(next: InquirySeed[]): void {
	inquiries = next.map((t) => ({ ...t }));
}

function inquiryResolver(id: string) {
	const t = inquiries.find((i) => i.id === id);
	if (!t) return null;
	return { folderId: t.folderId, companyId: t.companyId ?? "c1", isArchived: t.isArchived ?? false };
}

beforeEach(() => {
	_resetItemsStore();
	_resetItemDetailStore();
	inquiries = [];
	_setInquiryStateResolver(inquiryResolver);
});

afterEach(() => {
	_setInquiryStateResolver(null);
});

describe("fetchItemsMock", () => {
	it("returns seeded items on default params", async () => {
		const result = await fetchItemsMock({});
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((i) => !_isArchived(i.id))).toBe(true);
	});

	it("filters by folder id (joined via parent inquiry)", async () => {
		setInquiries([
			{ id: "T-A", folderId: "f1" },
			{ id: "T-B", folderId: "f2" },
			{ id: "T-C", folderId: null },
		]);
		_setItems([
			makeItem("a", { procurementInquiryId: "T-A" }),
			makeItem("b", { procurementInquiryId: "T-B" }),
			makeItem("c", { procurementInquiryId: "T-C" }),
		]);
		const result = await fetchItemsMock({ folder: "f1" });
		expect(result.items.map((i) => i.id)).toEqual(["a"]);
	});

	it("filter folder=none returns items whose inquiry has no folder", async () => {
		setInquiries([
			{ id: "T-A", folderId: null },
			{ id: "T-B", folderId: "f1" },
		]);
		_setItems([makeItem("a", { procurementInquiryId: "T-A" }), makeItem("b", { procurementInquiryId: "T-B" })]);
		const result = await fetchItemsMock({ folder: "none" });
		expect(result.items.map((i) => i.id)).toEqual(["a"]);
	});

	it("filter folder=archive returns archived items only", async () => {
		_setItems([makeItem("a"), makeItem("b")], ["b"]);
		const result = await fetchItemsMock({ folder: "archive" });
		expect(result.items.map((i) => i.id)).toEqual(["b"]);
	});

	it("excludes archived items when folder is undefined", async () => {
		_setItems([makeItem("a"), makeItem("b")], ["b"]);
		const result = await fetchItemsMock({});
		expect(result.items.map((i) => i.id)).toEqual(["a"]);
	});

	it("filters by status", async () => {
		_setItems([makeItem("a", { status: "searching" }), makeItem("b", { status: "completed" })]);
		const result = await fetchItemsMock({ status: "completed" });
		expect(result.items.map((i) => i.id)).toEqual(["b"]);
	});

	it("deviation=overpaying filters to current > best", async () => {
		_setItems([
			makeItem("over", { currentPrice: 100, bestPrice: 80 }),
			makeItem("save", { currentPrice: 80, bestPrice: 100 }),
			makeItem("same", { currentPrice: 50, bestPrice: 50 }),
			makeItem("nomkt", { bestPrice: null }),
		]);
		const result = await fetchItemsMock({ deviation: "overpaying" });
		expect(result.items.map((i) => i.id)).toEqual(["over"]);
	});

	it("deviation=saving filters to current < best", async () => {
		_setItems([
			makeItem("over", { currentPrice: 100, bestPrice: 80 }),
			makeItem("save", { currentPrice: 80, bestPrice: 100 }),
		]);
		const result = await fetchItemsMock({ deviation: "saving" });
		expect(result.items.map((i) => i.id)).toEqual(["save"]);
	});

	it("searches by name (case-insensitive substring)", async () => {
		_setItems([makeItem("a", { name: "Арматура А500С" }), makeItem("b", { name: "Цемент М500" })]);
		const result = await fetchItemsMock({ q: "арма" });
		expect(result.items.map((i) => i.id)).toEqual(["a"]);
	});

	it("filters by company (joined via parent inquiry)", async () => {
		setInquiries([
			{ id: "T-A", folderId: null, companyId: "c1" },
			{ id: "T-B", folderId: null, companyId: "c2" },
		]);
		_setItems([makeItem("a", { procurementInquiryId: "T-A" }), makeItem("b", { procurementInquiryId: "T-B" })]);
		const result = await fetchItemsMock({ company: "c2" });
		expect(result.items.map((i) => i.id)).toEqual(["b"]);
	});

	it("sorts by currentPrice asc", async () => {
		_setItems([makeItem("a", { currentPrice: 30 }), makeItem("b", { currentPrice: 10 })]);
		const result = await fetchItemsMock({ sort: "currentPrice", dir: "asc" });
		expect(result.items.map((i) => i.id)).toEqual(["b", "a"]);
	});

	it("sorts nulls last for bestPrice", async () => {
		_setItems([makeItem("a", { bestPrice: null }), makeItem("b", { bestPrice: 10 }), makeItem("c", { bestPrice: 5 })]);
		const result = await fetchItemsMock({ sort: "bestPrice", dir: "asc" });
		expect(result.items.map((i) => i.id)).toEqual(["c", "b", "a"]);
	});

	it("paginates using cursor", async () => {
		_setItems([makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d")]);
		const first = await fetchItemsMock({ limit: 2 });
		expect(first.items.map((i) => i.id)).toEqual(["a", "b"]);
		expect(first.nextCursor).toBe("c");
		const second = await fetchItemsMock({ limit: 2, cursor: first.nextCursor ?? undefined });
		expect(second.items.map((i) => i.id)).toEqual(["c", "d"]);
		expect(second.nextCursor).toBeNull();
	});
});

describe("fetchTotalsMock", () => {
	it("computes totals from filtered items", async () => {
		_setItems([
			makeItem("a", { annualQuantity: 10, currentPrice: 100, bestPrice: 80 }),
			makeItem("b", { annualQuantity: 5, currentPrice: 50, bestPrice: 60 }),
		]);
		const totals = await fetchTotalsMock({});
		expect(totals.itemCount).toBe(2);
		expect(totals.totalOverpayment).toBe(200);
		expect(totals.totalSavings).toBe(50);
	});

	it("skips items with null bestPrice", async () => {
		_setItems([makeItem("a", { bestPrice: null, annualQuantity: 10, currentPrice: 100 })]);
		const totals = await fetchTotalsMock({});
		expect(totals.itemCount).toBe(1);
		expect(totals.totalOverpayment).toBe(0);
		expect(totals.totalSavings).toBe(0);
		expect(totals.totalDeviation).toBe(0);
	});
});

describe("updateItemMock", () => {
	it("updates an existing item", async () => {
		_setItems([makeItem("a", { name: "Old" })]);
		const updated = await updateItemMock("a", { name: "New" });
		expect(updated.name).toBe("New");
		expect(_getAllItems().find((i) => i.id === "a")?.name).toBe("New");
	});

	it("archives and unarchives", async () => {
		_setItems([makeItem("a")]);
		await updateItemMock("a", { isArchived: true });
		expect(_isArchived("a")).toBe(true);
		await updateItemMock("a", { isArchived: false });
		expect(_isArchived("a")).toBe(false);
	});

	it("propagates updates to item-detail store", async () => {
		_setItems([makeItem("a", { name: "Old" })]);
		await updateItemMock("a", { name: "Fresh" });
		const detail = await getItemDetail("a");
		expect(detail?.name).toBe("Fresh");
	});

	it("throws when item does not exist", async () => {
		_setItems([]);
		await expect(updateItemMock("missing", { name: "x" })).rejects.toThrow();
	});
});

describe("deleteItemMock", () => {
	it("removes item from store", async () => {
		_setItems([makeItem("a"), makeItem("b")]);
		await deleteItemMock("a");
		expect(_getAllItems().map((i) => i.id)).toEqual(["b"]);
	});

	it("removes archive marker too", async () => {
		_setItems([makeItem("a")], ["a"]);
		await deleteItemMock("a");
		expect(_isArchived("a")).toBe(false);
	});
});

describe("createItemsBatchMock", () => {
	it("creates items with generated ids and prepends to store", async () => {
		_setItems([makeItem("existing")]);
		const result = await createItemsBatchMock([
			{ name: "W1", companyId: "company-1" },
			{ name: "W2", companyId: "company-1" },
		]);
		expect(result.isAsync).toBe(false);
		expect(result.items).toHaveLength(2);
		expect(result.items?.[0].name).toBe("W1");
		expect(result.items?.[0].status).toBe("searching");
		expect(
			_getAllItems()
				.map((i) => i.id)
				.slice(0, 2),
		).toEqual([result.items?.[0].id, result.items?.[1].id]);
	});
});

describe("exportItemsMock", () => {
	it("returns a blob with xlsx filename", async () => {
		const result = await exportItemsMock();
		expect(result.blob).toBeInstanceOf(Blob);
		expect(result.filename).toBe("items.xlsx");
	});

	it("scopes the export to the provided filters (joined via inquiry's company)", async () => {
		setInquiries([
			{ id: "T-A", folderId: null, companyId: "c1" },
			{ id: "T-B", folderId: null, companyId: "c2" },
		]);
		_setItems([
			makeItem("x", { name: "Keep", procurementInquiryId: "T-A" }),
			makeItem("y", { name: "Drop", procurementInquiryId: "T-B" }),
		]);
		const result = await exportItemsMock({ company: "c1" });
		const text = await result.blob.text();
		expect(text).toContain("Keep");
		expect(text).not.toContain("Drop");
	});
});

describe("shared store between items and item-detail", () => {
	it("updating via item-detail-mock-data propagates back to list store", async () => {
		_setItems([makeItem("a", { name: "Original" })]);
		await updateItemDetail("a", { name: "FromDrawer" });
		expect(_getAllItems().find((i) => i.id === "a")?.name).toBe("FromDrawer");
	});

	it("updating via items-mock-data reflects in item-detail", async () => {
		_setItems([makeItem("a", { name: "Original" })]);
		await updateItemMock("a", { name: "FromList" });
		const detail = await getItemDetail("a");
		expect(detail?.name).toBe("FromList");
	});
});
