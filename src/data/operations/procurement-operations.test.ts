import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeItem, makeProcurementInquiry as makeProcurementInquiryFixture, makeSupplier } from "@/test-utils";
import { createInMemoryItemsClient } from "../clients/items-in-memory";
import { createInMemoryProcurementInquiriesClient } from "../clients/procurement-inquiries-in-memory";
import { NotFoundError } from "../errors";
import { _setInquiryStateResolver } from "../items-mock-data";
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
		return makeProcurementInquiryFixture(id, { companyId: "company-1", ...overrides });
	}

	beforeEach(() => {
		_setMockDelay(0, 0);
	});

	afterEach(() => {
		_resetMockDelay();
	});

	it("flips the inquiry's isArchived flag via inquiries.archive", async () => {
		const archive = vi.fn().mockResolvedValue(makeProcurementInquiryRecord("T-001", { isArchived: true }));
		const unarchive = vi.fn();
		const result = await archiveProcurementInquiryCascade("T-001", true, {
			procurementInquiries: fakeProcurementInquiriesClient({ archive, unarchive }),
		});
		expect(archive).toHaveBeenCalledWith("T-001");
		expect(unarchive).not.toHaveBeenCalled();
		expect(result.isArchived).toBe(true);
	});

	it("routes isArchived=false to inquiries.unarchive", async () => {
		const archive = vi.fn();
		const unarchive = vi.fn().mockResolvedValue(makeProcurementInquiryRecord("T-001", { isArchived: false }));
		const result = await archiveProcurementInquiryCascade("T-001", false, {
			procurementInquiries: fakeProcurementInquiriesClient({ archive, unarchive }),
		});
		expect(unarchive).toHaveBeenCalledWith("T-001");
		expect(archive).not.toHaveBeenCalled();
		expect(result.isArchived).toBe(false);
	});

	it("cascade hides items belonging to the archived inquiry from non-archive item lists", async () => {
		const procurementInquiries = createInMemoryProcurementInquiriesClient({
			seed: [makeProcurementInquiryRecord("T-100"), makeProcurementInquiryRecord("T-200")],
		});
		// Cross-entity cascade: the in-memory items adapter now reads inquiry
		// state via a registered resolver. We wire it through the procurementInquiries
		// client so flipping isArchived via the cascade shows up in items.list({}).
		_setInquiryStateResolver((id) => {
			const t = inquiryCache.get(id);
			return t ? { folderId: t.folderId, companyId: t.companyId, isArchived: t.isArchived } : null;
		});
		const inquiryCache = new Map<string, { folderId: string | null; companyId: string; isArchived: boolean }>();
		async function refreshInquiryCache(id: string) {
			const t = await procurementInquiries.get(id);
			inquiryCache.set(id, { folderId: t.folderId, companyId: t.companyId, isArchived: t.isArchived });
		}
		await refreshInquiryCache("T-100");
		await refreshInquiryCache("T-200");

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
		await refreshInquiryCache("T-100");

		const after = await items.list({});
		expect(after.items.map((i) => i.id)).toEqual(["i-200-a"]);

		const archiveView = await items.list({ folder: "archive" });
		expect(archiveView.items.map((i) => i.id).sort()).toEqual(["i-100-a", "i-100-b"]);

		await archiveProcurementInquiryCascade("T-100", false, { procurementInquiries });
		await refreshInquiryCache("T-100");

		const restored = await items.list({});
		expect(restored.items.map((i) => i.id).sort()).toEqual(["i-100-a", "i-100-b", "i-200-a"]);

		_setInquiryStateResolver(null);
	});
});

describe("createProcurementInquiryWithItems", () => {
	beforeEach(() => {
		_setMockDelay(0, 0);
	});

	afterEach(() => {
		_resetMockDelay();
	});

	it("sends items in the inquiry.create payload — single atomic backend call", async () => {
		const created = makeProcurementInquiryFixture("T-001", { name: "Запрос: Pos A", companyId: "company-1" });
		const procurementInquiriesCreate = vi.fn().mockResolvedValue(created);

		const result = await createProcurementInquiryWithItems(
			{
				procurementInquiry: { companyId: "company-1", folderId: null, deadline: "2026-05-01" },
				items: [
					{ name: "Pos A", companyId: "company-1", paymentType: "prepayment" },
					{ name: "Pos B", companyId: "company-1", paymentType: "prepayment" },
				],
			},
			{ procurementInquiries: fakeProcurementInquiriesClient({ create: procurementInquiriesCreate }) },
		);

		expect(procurementInquiriesCreate).toHaveBeenCalledTimes(1);
		const [payload] = procurementInquiriesCreate.mock.calls[0];
		// `name` is server-generated by the inquiry-name LLM seam and must not
		// appear in the create payload — the FE no longer manufactures one.
		expect(payload).not.toHaveProperty("name");
		expect(payload).toMatchObject({
			companyId: "company-1",
			items: [{ name: "Pos A" }, { name: "Pos B" }],
		});
		// Item entries are stripped of FE-only fields (`paymentType` etc.) — the
		// backend nested serializer accepts only the model's writable fields.
		expect(payload.items[0]).not.toHaveProperty("paymentType");
		// No picked positions → no attachItemIds in the payload.
		expect(payload).not.toHaveProperty("attachItemIds");
		expect(result.procurementInquiry.id).toBe("T-001");
	});

	it("rejects a fully empty submission (no typed items and no attached positions)", async () => {
		const procurementInquiriesCreate = vi.fn();

		await expect(
			createProcurementInquiryWithItems(
				{
					procurementInquiry: { companyId: "company-1", folderId: null, deadline: "2026-05-01" },
					items: [],
				},
				{ procurementInquiries: fakeProcurementInquiriesClient({ create: procurementInquiriesCreate }) },
			),
		).rejects.toThrow();
		expect(procurementInquiriesCreate).not.toHaveBeenCalled();
	});

	it("forwards attachItemIds in the create payload and returns the attached items", async () => {
		const created = makeProcurementInquiryFixture("T-002", { companyId: "company-1" });
		created.items = [makeItem("item-a"), makeItem("item-b")];
		const procurementInquiriesCreate = vi.fn().mockResolvedValue(created);

		const result = await createProcurementInquiryWithItems(
			{
				procurementInquiry: { companyId: "company-1", folderId: null, deadline: "2026-05-01" },
				items: [{ name: "New Pos", companyId: "company-1", paymentType: "prepayment" }],
				attachItemIds: ["item-a", "item-b"],
			},
			{ procurementInquiries: fakeProcurementInquiriesClient({ create: procurementInquiriesCreate }) },
		);

		const [payload] = procurementInquiriesCreate.mock.calls[0];
		expect(payload.attachItemIds).toEqual(["item-a", "item-b"]);
		expect(result.items.map((i) => i.id)).toEqual(["item-a", "item-b"]);
	});

	it("attach-at-create end-to-end: a picked standalone item is reassigned + flipped to searching", async () => {
		// Shared items mock store: seed one standalone ready_for_analytics position.
		const items = createInMemoryItemsClient({
			seed: [makeItem("item-x", { status: "ready_for_analytics", companyId: "company-1" })],
		});
		const procurementInquiries = createInMemoryProcurementInquiriesClient({ seed: [] });

		const result = await createProcurementInquiryWithItems(
			{
				procurementInquiry: { companyId: "company-1", folderId: null, deadline: "2026-06-15" },
				items: [],
				attachItemIds: ["item-x"],
			},
			{ procurementInquiries },
		);

		expect(result.items.map((i) => i.id)).toEqual(["item-x"]);
		const attached = await items.get("item-x");
		expect(attached.procurementInquiryId).toBe(result.procurementInquiry.id);
		expect(attached.status).toBe("searching");
		const stored = await procurementInquiries.list({});
		expect(stored.items.find((t) => t.id === result.procurementInquiry.id)).toBeDefined();
	});
});
