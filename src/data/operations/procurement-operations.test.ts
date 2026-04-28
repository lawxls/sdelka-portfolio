import { describe, expect, it, vi } from "vitest";
import { makeItem, makeSupplier } from "@/test-utils";
import { NotFoundError } from "../errors";
import { fakeItemsClient, fakeSuppliersClient } from "../test-clients-provider";
import { selectSupplierForItem, setCurrentSupplierFromQuote } from "./procurement-operations";

/**
 * Layer A — operation tested in isolation against stub clients. Asserts on the
 * call sequence (read supplier first, then write item) and the exact body of
 * the patched item. Real adapters are not involved here; their correctness is
 * the contract test's job.
 */

describe("selectSupplierForItem", () => {
	it("reads the supplier then writes the item — in that order", async () => {
		const calls: string[] = [];
		const supplier = makeSupplier("s1", {
			companyName: "Альфа",
			paymentType: "prepayment",
			deferralDays: 0,
			pricePerUnit: 100,
		});
		const get = vi.fn().mockImplementation(async () => {
			calls.push("suppliers.get");
			return supplier;
		});
		const update = vi.fn().mockImplementation(async () => {
			calls.push("items.update");
			return makeItem("item-1");
		});

		await selectSupplierForItem("item-1", "s1", {
			suppliers: fakeSuppliersClient({ get }),
			items: fakeItemsClient({ update }),
		});

		expect(calls).toEqual(["suppliers.get", "items.update"]);
		expect(get).toHaveBeenCalledWith("item-1", "s1");
		expect(update).toHaveBeenCalledWith("item-1", {
			currentSupplier: {
				companyName: "Альфа",
				paymentType: "prepayment",
				deferralDays: 0,
				pricePerUnit: 100,
			},
		});
	});

	it("throws NotFoundError when the supplier is missing — does not write the item", async () => {
		const update = vi.fn();
		await expect(
			selectSupplierForItem("item-1", "missing", {
				suppliers: fakeSuppliersClient({ get: vi.fn().mockResolvedValue(null) }),
				items: fakeItemsClient({ update }),
			}),
		).rejects.toBeInstanceOf(NotFoundError);
		expect(update).not.toHaveBeenCalled();
	});
});

describe("setCurrentSupplierFromQuote", () => {
	it("looks up by INN, snaps currentPrice to the supplier's TCO", async () => {
		const supplier = makeSupplier("s1", {
			inn: "7700000001",
			companyName: "Альфа",
			paymentType: "deferred",
			deferralDays: 14,
			prepaymentPercent: 50,
			pricePerUnit: 100,
			tco: 95,
		});
		const listForItem = vi.fn().mockResolvedValue({ suppliers: [supplier] });
		const update = vi.fn().mockResolvedValue(makeItem("item-1"));

		await setCurrentSupplierFromQuote("item-1", "7700000001", {
			suppliers: fakeSuppliersClient({ listForItem }),
			items: fakeItemsClient({ update }),
		});

		expect(listForItem).toHaveBeenCalledWith("item-1");
		expect(update).toHaveBeenCalledWith("item-1", {
			currentSupplier: {
				companyName: "Альфа",
				inn: "7700000001",
				paymentType: "deferred",
				deferralDays: 14,
				prepaymentPercent: 50,
				pricePerUnit: 100,
			},
			currentPrice: 95,
		});
	});

	it("falls back to pricePerUnit when tco is null", async () => {
		const supplier = makeSupplier("s1", { inn: "INN", pricePerUnit: 200, tco: null });
		const update = vi.fn().mockResolvedValue(makeItem("item-1"));

		await setCurrentSupplierFromQuote("item-1", "INN", {
			suppliers: fakeSuppliersClient({ listForItem: vi.fn().mockResolvedValue({ suppliers: [supplier] }) }),
			items: fakeItemsClient({ update }),
		});

		const patch = update.mock.calls[0][1] as { currentPrice: number };
		expect(patch.currentPrice).toBe(200);
	});

	it("omits currentPrice when both tco and pricePerUnit are null", async () => {
		const supplier = makeSupplier("s1", { inn: "INN", pricePerUnit: null, tco: null });
		const update = vi.fn().mockResolvedValue(makeItem("item-1"));

		await setCurrentSupplierFromQuote("item-1", "INN", {
			suppliers: fakeSuppliersClient({ listForItem: vi.fn().mockResolvedValue({ suppliers: [supplier] }) }),
			items: fakeItemsClient({ update }),
		});

		expect(update.mock.calls[0][1]).not.toHaveProperty("currentPrice");
	});

	it("throws NotFoundError when no supplier matches the INN — archived rows are skipped", async () => {
		const archived = makeSupplier("s1", { inn: "INN", archived: true });
		await expect(
			setCurrentSupplierFromQuote("item-1", "INN", {
				suppliers: fakeSuppliersClient({
					listForItem: vi.fn().mockResolvedValue({ suppliers: [archived] }),
				}),
				items: fakeItemsClient({ update: vi.fn() }),
			}),
		).rejects.toBeInstanceOf(NotFoundError);
	});
});
