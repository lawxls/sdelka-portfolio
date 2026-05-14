import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeItem, makeSupplier } from "@/test-utils";
import { createInMemoryItemsClient } from "../clients/items-in-memory";
import { createInMemoryProcurementInquiriesClient } from "../clients/procurement-inquiries-in-memory";
import { NotFoundError } from "../errors";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import { fakeItemsClient, fakeProcurementInquiriesClient, fakeSuppliersClient } from "../test-clients-provider";
import type { ProcurementInquiry } from "../types";
import {
	archiveProcurementInquiryCascade,
	createProcurementInquiryWithItems,
	selectSupplierForItem,
	setCurrentSupplierFromQuote,
} from "./procurement-operations";

/**
 * Layer A — operation tested in isolation against stub clients. Asserts on the
 * call sequence (read item, read supplier, then write inquiry) and the exact
 * body of the patched inquiry. Real adapters are not involved here; their
 * correctness is the contract test's job.
 */

describe("selectSupplierForItem", () => {
	it("reads the supplier, then writes the item — in that order", async () => {
		const calls: string[] = [];
		const supplier = makeSupplier("s1", {
			companyName: "Альфа",
			paymentType: "prepayment",
			deferralDays: 0,
			pricePerUnit: 100,
		});
		const itemsGet = vi.fn();
		const get = vi.fn().mockImplementation(async () => {
			calls.push("suppliers.get");
			return supplier;
		});
		const update = vi.fn().mockImplementation(async () => {
			calls.push("items.update");
			return makeItem("item-1");
		});

		await selectSupplierForItem("item-1", "s1", {
			items: fakeItemsClient({ get: itemsGet, update }),
			suppliers: fakeSuppliersClient({ get }),
			procurementInquiries: fakeProcurementInquiriesClient(),
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
				items: fakeItemsClient({
					get: vi.fn().mockResolvedValue(makeItem("item-1", { procurementInquiryId: "T-001" })),
					update,
				}),
				suppliers: fakeSuppliersClient({ get: vi.fn().mockResolvedValue(null) }),
				procurementInquiries: fakeProcurementInquiriesClient(),
			}),
		).rejects.toBeInstanceOf(NotFoundError);
		expect(update).not.toHaveBeenCalled();
	});
});

describe("setCurrentSupplierFromQuote", () => {
	it("looks up by INN, writes the item's currentSupplier, and snaps currentPrice to the supplier's TCO", async () => {
		const supplier = makeSupplier("s1", {
			inn: "7700000001",
			companyName: "Альфа",
			paymentType: "deferred",
			deferralDays: 14,
			prepaymentPercent: 50,
			pricePerUnit: 100,
			tco: 95,
		});
		const itemsGet = vi
			.fn()
			.mockResolvedValue(makeItem("item-1", { procurementInquiryId: "T-001", currentPrice: 100 }));
		const listForItem = vi.fn().mockResolvedValue({ suppliers: [supplier] });
		const itemsUpdate = vi.fn().mockResolvedValue(makeItem("item-1"));

		await setCurrentSupplierFromQuote("item-1", "7700000001", {
			items: fakeItemsClient({ get: itemsGet, update: itemsUpdate }),
			suppliers: fakeSuppliersClient({ listForItem }),
			procurementInquiries: fakeProcurementInquiriesClient(),
		});

		expect(listForItem).toHaveBeenCalledWith("item-1");
		expect(itemsUpdate).toHaveBeenCalledWith("item-1", {
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
		const itemsUpdate = vi.fn().mockResolvedValue(makeItem("item-1"));

		await setCurrentSupplierFromQuote("item-1", "INN", {
			items: fakeItemsClient({
				get: vi.fn().mockResolvedValue(makeItem("item-1", { procurementInquiryId: "T-001", currentPrice: 100 })),
				update: itemsUpdate,
			}),
			suppliers: fakeSuppliersClient({ listForItem: vi.fn().mockResolvedValue({ suppliers: [supplier] }) }),
			procurementInquiries: fakeProcurementInquiriesClient(),
		});

		expect(itemsUpdate).toHaveBeenCalledWith(
			"item-1",
			expect.objectContaining({ currentPrice: 200, currentSupplier: expect.objectContaining({ inn: "INN" }) }),
		);
	});

	it("writes the currentSupplier without snapping price when both tco and pricePerUnit are null", async () => {
		const supplier = makeSupplier("s1", { inn: "INN", pricePerUnit: null, tco: null });
		const itemsUpdate = vi.fn().mockResolvedValue(makeItem("item-1"));

		await setCurrentSupplierFromQuote("item-1", "INN", {
			items: fakeItemsClient({
				get: vi.fn().mockResolvedValue(makeItem("item-1", { procurementInquiryId: "T-001" })),
				update: itemsUpdate,
			}),
			suppliers: fakeSuppliersClient({ listForItem: vi.fn().mockResolvedValue({ suppliers: [supplier] }) }),
			procurementInquiries: fakeProcurementInquiriesClient(),
		});

		expect(itemsUpdate).toHaveBeenCalledWith(
			"item-1",
			expect.not.objectContaining({ currentPrice: expect.anything() }),
		);
	});

	it("throws NotFoundError when no supplier matches the INN — archived rows are skipped", async () => {
		const archived = makeSupplier("s1", { inn: "INN", archived: true });
		await expect(
			setCurrentSupplierFromQuote("item-1", "INN", {
				items: fakeItemsClient({
					get: vi.fn().mockResolvedValue(makeItem("item-1", { procurementInquiryId: "T-001" })),
				}),
				suppliers: fakeSuppliersClient({
					listForItem: vi.fn().mockResolvedValue({ suppliers: [archived] }),
				}),
				procurementInquiries: fakeProcurementInquiriesClient({ update: vi.fn() }),
			}),
		).rejects.toBeInstanceOf(NotFoundError);
	});
});

describe("archiveProcurementInquiryCascade", () => {
	function makeProcurementInquiryRecord(id: string, overrides: Partial<ProcurementInquiry> = {}): ProcurementInquiry {
		return {
			id,
			name: `ProcurementInquiry ${id}`,
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

	it("flips the inquiry's isArchived flag via inquiries.archive", async () => {
		const archive = vi.fn().mockResolvedValue(makeProcurementInquiryRecord("T-001", { isArchived: true }));
		const result = await archiveProcurementInquiryCascade("T-001", true, {
			procurementInquiries: fakeProcurementInquiriesClient({ archive }),
		});
		expect(archive).toHaveBeenCalledWith("T-001", true);
		expect(result.isArchived).toBe(true);
	});

	it("cascade hides items belonging to the archived inquiry from non-archive item lists", async () => {
		const procurementInquiries = createInMemoryProcurementInquiriesClient({
			seed: [makeProcurementInquiryRecord("T-100"), makeProcurementInquiryRecord("T-200")],
		});
		const items = createInMemoryItemsClient({
			seed: [
				makeItem("i-100-a", { procurementInquiryId: "T-100" }),
				makeItem("i-100-b", { procurementInquiryId: "T-100" }),
				makeItem("i-200-a", { procurementInquiryId: "T-200" }),
			],
		});

		const before = await items.list({});
		expect(before.items.map((i) => i.id).sort()).toEqual(["i-100-a", "i-100-b", "i-200-a"]);

		await archiveProcurementInquiryCascade("T-100", true, { procurementInquiries });

		const after = await items.list({});
		expect(after.items.map((i) => i.id)).toEqual(["i-200-a"]);

		const archiveView = await items.list({ folder: "archive" });
		expect(archiveView.items.map((i) => i.id).sort()).toEqual(["i-100-a", "i-100-b"]);

		await archiveProcurementInquiryCascade("T-100", false, { procurementInquiries });

		const restored = await items.list({});
		expect(restored.items.map((i) => i.id).sort()).toEqual(["i-100-a", "i-100-b", "i-200-a"]);
	});
});

describe("createProcurementInquiryWithItems", () => {
	beforeEach(() => {
		_setMockDelay(0, 0);
	});

	afterEach(() => {
		_resetMockDelay();
	});

	it("creates the inquiry then the items, stamping the new inquiry id onto each item", async () => {
		const calls: string[] = [];
		const createdProcurementInquiry: ProcurementInquiry = {
			id: "T-001",
			name: "T",
			companyId: "company-1",
			folderId: null,
			budget: 0,
			createdAt: "2026-04-01",
			deadline: "2026-05-01",
		};
		const procurementInquiriesCreate = vi.fn().mockImplementation(async () => {
			calls.push("procurementInquiries.create");
			return createdProcurementInquiry;
		});
		const itemsCreate = vi.fn().mockImplementation(async (inputs: { procurementInquiryId?: string }[]) => {
			calls.push("items.create");
			return { items: inputs.map((_, i) => makeItem(`i-${i}`, { procurementInquiryId: "T-001" })), isAsync: false };
		});

		const result = await createProcurementInquiryWithItems(
			{
				procurementInquiry: { name: "T", companyId: "company-1", folderId: null, budget: 0, deadline: "2026-05-01" },
				items: [
					{ name: "Pos A", paymentType: "prepayment" },
					{ name: "Pos B", paymentType: "prepayment" },
				],
			},
			{
				items: fakeItemsClient({ create: itemsCreate }),
				procurementInquiries: fakeProcurementInquiriesClient({ create: procurementInquiriesCreate, delete: vi.fn() }),
			},
		);

		expect(calls).toEqual(["procurementInquiries.create", "items.create"]);
		expect(itemsCreate).toHaveBeenCalledWith([
			{ name: "Pos A", paymentType: "prepayment", procurementInquiryId: "T-001" },
			{ name: "Pos B", paymentType: "prepayment", procurementInquiryId: "T-001" },
		]);
		expect(result.procurementInquiry.id).toBe("T-001");
		expect(result.items).toHaveLength(2);
	});

	it("rolls back the inquiry via inquiries.delete if items.create fails — neither half persists", async () => {
		const procurementInquiries = createInMemoryProcurementInquiriesClient({ seed: [] });
		const itemsCreate = vi.fn().mockRejectedValue(new Error("items create failed"));
		const items = fakeItemsClient({ create: itemsCreate });

		await expect(
			createProcurementInquiryWithItems(
				{
					procurementInquiry: {
						name: "Will roll back",
						companyId: "company-1",
						folderId: null,
						budget: 0,
						deadline: "2026-05-01",
					},
					items: [{ name: "Pos A", paymentType: "prepayment" }],
				},
				{ items, procurementInquiries },
			),
		).rejects.toThrow("items create failed");

		const after = await procurementInquiries.list({});
		expect(after.items.find((t) => t.name === "Will roll back")).toBeUndefined();
	});

	it("end-to-end: procurementInquiry + items both land in their stores against in-memory adapters", async () => {
		const procurementInquiries = createInMemoryProcurementInquiriesClient({ seed: [] });
		const items = createInMemoryItemsClient({ seed: [] });

		const result = await createProcurementInquiryWithItems(
			{
				procurementInquiry: {
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
			{ items, procurementInquiries },
		);

		const stored = await procurementInquiries.list({});
		expect(stored.items.find((t) => t.id === result.procurementInquiry.id)).toBeDefined();
		const list = await items.list({});
		const created = list.items.filter((i) => i.procurementInquiryId === result.procurementInquiry.id);
		expect(created).toHaveLength(2);
		expect(created.map((i) => i.name).sort()).toEqual(["Арматура", "Цемент"]);
	});
});
