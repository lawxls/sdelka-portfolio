import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeItem, makeSupplier } from "@/test-utils";
import { createInMemoryItemsClient } from "../clients/items-in-memory";
import { createInMemoryTendersClient } from "../clients/tenders-in-memory";
import { NotFoundError } from "../errors";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import { fakeItemsClient, fakeSuppliersClient, fakeTendersClient } from "../test-clients-provider";
import type { ProcurementInquiry } from "../types";
import {
	archiveTenderCascade,
	createTenderWithItems,
	selectSupplierForItem,
	setCurrentSupplierFromQuote,
} from "./procurement-operations";

/**
 * Layer A — operation tested in isolation against stub clients. Asserts on the
 * call sequence (read item, read supplier, then write tender) and the exact
 * body of the patched tender. Real adapters are not involved here; their
 * correctness is the contract test's job.
 */

function makeTender(id: string, overrides: Partial<ProcurementInquiry> = {}): ProcurementInquiry {
	return {
		id,
		name: `Tender ${id}`,
		companyId: "company-1",
		folderId: null,
		budget: 0,
		createdAt: "2026-04-01",
		deadline: "2026-05-01",
		...overrides,
	};
}

describe("selectSupplierForItem", () => {
	it("reads the item, then the supplier, then writes the tender — in that order", async () => {
		const calls: string[] = [];
		const item = makeItem("item-1", { tenderId: "T-001" });
		const supplier = makeSupplier("s1", {
			companyName: "Альфа",
			paymentType: "prepayment",
			deferralDays: 0,
			pricePerUnit: 100,
		});
		const itemsGet = vi.fn().mockImplementation(async () => {
			calls.push("items.get");
			return item;
		});
		const get = vi.fn().mockImplementation(async () => {
			calls.push("suppliers.get");
			return supplier;
		});
		const update = vi.fn().mockImplementation(async () => {
			calls.push("tenders.update");
			return makeTender("T-001");
		});

		await selectSupplierForItem("item-1", "s1", {
			items: fakeItemsClient({ get: itemsGet }),
			suppliers: fakeSuppliersClient({ get }),
			tenders: fakeTendersClient({ update }),
		});

		expect(calls).toEqual(["items.get", "suppliers.get", "tenders.update"]);
		expect(get).toHaveBeenCalledWith("item-1", "s1");
		expect(update).toHaveBeenCalledWith("T-001", {
			currentSupplier: {
				companyName: "Альфа",
				paymentType: "prepayment",
				deferralDays: 0,
				pricePerUnit: 100,
			},
		});
	});

	it("throws NotFoundError when the supplier is missing — does not write the tender", async () => {
		const update = vi.fn();
		await expect(
			selectSupplierForItem("item-1", "missing", {
				items: fakeItemsClient({ get: vi.fn().mockResolvedValue(makeItem("item-1", { tenderId: "T-001" })) }),
				suppliers: fakeSuppliersClient({ get: vi.fn().mockResolvedValue(null) }),
				tenders: fakeTendersClient({ update }),
			}),
		).rejects.toBeInstanceOf(NotFoundError);
		expect(update).not.toHaveBeenCalled();
	});

	it("throws NotFoundError when the item has no parent tender", async () => {
		const update = vi.fn();
		await expect(
			selectSupplierForItem("item-1", "s1", {
				items: fakeItemsClient({ get: vi.fn().mockResolvedValue(makeItem("item-1")) }),
				suppliers: fakeSuppliersClient({ get: vi.fn() }),
				tenders: fakeTendersClient({ update }),
			}),
		).rejects.toBeInstanceOf(NotFoundError);
		expect(update).not.toHaveBeenCalled();
	});
});

describe("setCurrentSupplierFromQuote", () => {
	it("looks up by INN, writes the tender, and snaps the item's currentPrice to the supplier's TCO", async () => {
		const supplier = makeSupplier("s1", {
			inn: "7700000001",
			companyName: "Альфа",
			paymentType: "deferred",
			deferralDays: 14,
			prepaymentPercent: 50,
			pricePerUnit: 100,
			tco: 95,
		});
		const itemsGet = vi.fn().mockResolvedValue(makeItem("item-1", { tenderId: "T-001", currentPrice: 100 }));
		const listForItem = vi.fn().mockResolvedValue({ suppliers: [supplier] });
		const itemsUpdate = vi.fn().mockResolvedValue(makeItem("item-1"));
		const tendersUpdate = vi.fn().mockResolvedValue(makeTender("T-001"));

		await setCurrentSupplierFromQuote("item-1", "7700000001", {
			items: fakeItemsClient({ get: itemsGet, update: itemsUpdate }),
			suppliers: fakeSuppliersClient({ listForItem }),
			tenders: fakeTendersClient({ update: tendersUpdate }),
		});

		expect(listForItem).toHaveBeenCalledWith("item-1");
		expect(tendersUpdate).toHaveBeenCalledWith("T-001", {
			currentSupplier: {
				companyName: "Альфа",
				inn: "7700000001",
				paymentType: "deferred",
				deferralDays: 14,
				prepaymentPercent: 50,
				pricePerUnit: 100,
			},
		});
		expect(itemsUpdate).toHaveBeenCalledWith("item-1", { currentPrice: 95 });
	});

	it("falls back to pricePerUnit when tco is null", async () => {
		const supplier = makeSupplier("s1", { inn: "INN", pricePerUnit: 200, tco: null });
		const itemsUpdate = vi.fn().mockResolvedValue(makeItem("item-1"));

		await setCurrentSupplierFromQuote("item-1", "INN", {
			items: fakeItemsClient({
				get: vi.fn().mockResolvedValue(makeItem("item-1", { tenderId: "T-001", currentPrice: 100 })),
				update: itemsUpdate,
			}),
			suppliers: fakeSuppliersClient({ listForItem: vi.fn().mockResolvedValue({ suppliers: [supplier] }) }),
			tenders: fakeTendersClient({ update: vi.fn().mockResolvedValue(makeTender("T-001")) }),
		});

		expect(itemsUpdate).toHaveBeenCalledWith("item-1", { currentPrice: 200 });
	});

	it("does not update the item when both tco and pricePerUnit are null", async () => {
		const supplier = makeSupplier("s1", { inn: "INN", pricePerUnit: null, tco: null });
		const itemsUpdate = vi.fn().mockResolvedValue(makeItem("item-1"));

		await setCurrentSupplierFromQuote("item-1", "INN", {
			items: fakeItemsClient({
				get: vi.fn().mockResolvedValue(makeItem("item-1", { tenderId: "T-001" })),
				update: itemsUpdate,
			}),
			suppliers: fakeSuppliersClient({ listForItem: vi.fn().mockResolvedValue({ suppliers: [supplier] }) }),
			tenders: fakeTendersClient({ update: vi.fn().mockResolvedValue(makeTender("T-001")) }),
		});

		expect(itemsUpdate).not.toHaveBeenCalled();
	});

	it("throws NotFoundError when no supplier matches the INN — archived rows are skipped", async () => {
		const archived = makeSupplier("s1", { inn: "INN", archived: true });
		await expect(
			setCurrentSupplierFromQuote("item-1", "INN", {
				items: fakeItemsClient({ get: vi.fn().mockResolvedValue(makeItem("item-1", { tenderId: "T-001" })) }),
				suppliers: fakeSuppliersClient({
					listForItem: vi.fn().mockResolvedValue({ suppliers: [archived] }),
				}),
				tenders: fakeTendersClient({ update: vi.fn() }),
			}),
		).rejects.toBeInstanceOf(NotFoundError);
	});
});

describe("archiveTenderCascade", () => {
	function makeTenderRecord(id: string, overrides: Partial<ProcurementInquiry> = {}): ProcurementInquiry {
		return {
			id,
			name: `Tender ${id}`,
			companyId: "company-1",
			folderId: null,
			budget: 0,
			createdAt: "2026-04-01",
			deadline: "2026-05-01",
			...overrides,
		};
	}

	beforeEach(() => {
		_setMockDelay(0, 0);
	});

	afterEach(() => {
		_resetMockDelay();
	});

	it("flips the tender's isArchived flag via tenders.archive", async () => {
		const archive = vi.fn().mockResolvedValue(makeTenderRecord("T-001", { isArchived: true }));
		const result = await archiveTenderCascade("T-001", true, {
			tenders: fakeTendersClient({ archive }),
		});
		expect(archive).toHaveBeenCalledWith("T-001", true);
		expect(result.isArchived).toBe(true);
	});

	it("cascade hides items belonging to the archived tender from non-archive item lists", async () => {
		const tenders = createInMemoryTendersClient({
			seed: [makeTenderRecord("T-100"), makeTenderRecord("T-200")],
		});
		const items = createInMemoryItemsClient({
			seed: [
				makeItem("i-100-a", { tenderId: "T-100" }),
				makeItem("i-100-b", { tenderId: "T-100" }),
				makeItem("i-200-a", { tenderId: "T-200" }),
			],
		});

		const before = await items.list({});
		expect(before.items.map((i) => i.id).sort()).toEqual(["i-100-a", "i-100-b", "i-200-a"]);

		await archiveTenderCascade("T-100", true, { tenders });

		const after = await items.list({});
		expect(after.items.map((i) => i.id)).toEqual(["i-200-a"]);

		const archiveView = await items.list({ folder: "archive" });
		expect(archiveView.items.map((i) => i.id).sort()).toEqual(["i-100-a", "i-100-b"]);

		await archiveTenderCascade("T-100", false, { tenders });

		const restored = await items.list({});
		expect(restored.items.map((i) => i.id).sort()).toEqual(["i-100-a", "i-100-b", "i-200-a"]);
	});
});

describe("createTenderWithItems", () => {
	beforeEach(() => {
		_setMockDelay(0, 0);
	});

	afterEach(() => {
		_resetMockDelay();
	});

	it("creates the tender then the items, stamping the new tender id onto each item", async () => {
		const calls: string[] = [];
		const createdTender: ProcurementInquiry = {
			id: "T-001",
			name: "T",
			companyId: "company-1",
			folderId: null,
			budget: 0,
			createdAt: "2026-04-01",
			deadline: "2026-05-01",
		};
		const tendersCreate = vi.fn().mockImplementation(async () => {
			calls.push("tenders.create");
			return createdTender;
		});
		const itemsCreate = vi.fn().mockImplementation(async (inputs: { tenderId?: string }[]) => {
			calls.push("items.create");
			return { items: inputs.map((_, i) => makeItem(`i-${i}`, { tenderId: "T-001" })), isAsync: false };
		});

		const result = await createTenderWithItems(
			{
				tender: { name: "T", companyId: "company-1", folderId: null, budget: 0, deadline: "2026-05-01" },
				items: [
					{ name: "Pos A", paymentType: "prepayment" },
					{ name: "Pos B", paymentType: "prepayment" },
				],
			},
			{
				items: fakeItemsClient({ create: itemsCreate }),
				tenders: fakeTendersClient({ create: tendersCreate, delete: vi.fn() }),
			},
		);

		expect(calls).toEqual(["tenders.create", "items.create"]);
		expect(itemsCreate).toHaveBeenCalledWith([
			{ name: "Pos A", paymentType: "prepayment", tenderId: "T-001" },
			{ name: "Pos B", paymentType: "prepayment", tenderId: "T-001" },
		]);
		expect(result.tender.id).toBe("T-001");
		expect(result.items).toHaveLength(2);
	});

	it("rolls back the tender via tenders.delete if items.create fails — neither half persists", async () => {
		const tenders = createInMemoryTendersClient({ seed: [] });
		const itemsCreate = vi.fn().mockRejectedValue(new Error("items create failed"));
		const items = fakeItemsClient({ create: itemsCreate });

		await expect(
			createTenderWithItems(
				{
					tender: {
						name: "Will roll back",
						companyId: "company-1",
						folderId: null,
						budget: 0,
						deadline: "2026-05-01",
					},
					items: [{ name: "Pos A", paymentType: "prepayment" }],
				},
				{ items, tenders },
			),
		).rejects.toThrow("items create failed");

		const after = await tenders.list({});
		expect(after.items.find((t) => t.name === "Will roll back")).toBeUndefined();
	});

	it("end-to-end: tender + items both land in their stores against in-memory adapters", async () => {
		const tenders = createInMemoryTendersClient({ seed: [] });
		const items = createInMemoryItemsClient({ seed: [] });

		const result = await createTenderWithItems(
			{
				tender: {
					name: "Закупка металлопроката",
					companyId: "company-1",
					folderId: "folder-1",
					budget: 1500000,
					deadline: "2026-06-15",
				},
				items: [
					{ name: "Арматура", paymentType: "prepayment" },
					{ name: "Цемент", paymentType: "prepayment" },
				],
			},
			{ items, tenders },
		);

		const stored = await tenders.list({});
		expect(stored.items.find((t) => t.id === result.tender.id)).toBeDefined();
		const list = await items.list({});
		const created = list.items.filter((i) => i.tenderId === result.tender.id);
		expect(created).toHaveLength(2);
		expect(created.map((i) => i.name).sort()).toEqual(["Арматура", "Цемент"]);
	});
});
