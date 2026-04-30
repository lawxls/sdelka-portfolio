import { describe, expect, it, vi } from "vitest";
import { makeItem, makeSupplier } from "@/test-utils";
import { NotFoundError } from "../errors";
import { fakeItemsClient, fakeSuppliersClient, fakeTendersClient } from "../test-clients-provider";
import type { ProcurementInquiry } from "../types";
import { selectSupplierForItem, setCurrentSupplierFromQuote } from "./procurement-operations";

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
