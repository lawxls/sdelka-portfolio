import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _resetItemsStore } from "./items-mock-data";
import {
	_resetSupplierStore,
	_setSendShouldFail,
	_setSupplierMockDelay,
	deleteSuppliers,
	getSupplier,
	getSuppliers,
	sendSupplierMessage,
} from "./supplier-mock-data";
import { SUPPLIER_STATUSES } from "./supplier-types";
import { ORMATEK_SUPPLIERS } from "./suppliers-ormatek";

beforeEach(() => {
	_resetSupplierStore();
	_resetItemsStore();
	_setSupplierMockDelay(0, 0);
});

afterEach(() => {
	_resetSupplierStore();
	_resetItemsStore();
});

const ALL = { limit: Number.POSITIVE_INFINITY };
const ITEM_1_COUNT = ORMATEK_SUPPLIERS.length;
const ITEM_1_KP_COUNT = ORMATEK_SUPPLIERS.filter((s) => s.status === "получено_кп").length;

describe("supplier mock store", () => {
	it("has the full seeded list of suppliers for item-1", async () => {
		const { suppliers } = await getSuppliers("item-1", ALL);
		expect(suppliers.length).toBe(ITEM_1_COUNT);
	});

	it("returns empty array for unknown itemId", async () => {
		const { suppliers } = await getSuppliers("item-unknown", ALL);
		expect(suppliers).toHaveLength(0);
	});

	it("all suppliers belong to the requested item", async () => {
		const { suppliers } = await getSuppliers("item-1", ALL);
		for (const s of suppliers) {
			expect(s.itemId).toBe("item-1");
		}
	});

	it("spreads suppliers across all statuses", async () => {
		const { suppliers } = await getSuppliers("item-1", ALL);
		const statuses = new Set(suppliers.map((s) => s.status));
		expect(statuses.size).toBe(SUPPLIER_STATUSES.length);
		for (const status of SUPPLIER_STATUSES) {
			expect(statuses.has(status)).toBe(true);
		}
	});

	it("has получено_кп suppliers for item-1", async () => {
		const { suppliers } = await getSuppliers("item-1", ALL);
		const kpCount = suppliers.filter((s) => s.status === "получено_кп").length;
		expect(kpCount).toBe(ITEM_1_KP_COUNT);
	});

	it("получено_кп suppliers have non-null price, tco, and rating", async () => {
		const { suppliers } = await getSuppliers("item-1", ALL);
		const kpSuppliers = suppliers.filter((s) => s.status === "получено_кп");
		for (const s of kpSuppliers) {
			expect(s.pricePerUnit).toBeTypeOf("number");
			expect(s.tco).toBeTypeOf("number");
			expect(s.rating).toBeTypeOf("number");
			expect(s.rating).toBeGreaterThanOrEqual(0);
			expect(s.rating).toBeLessThanOrEqual(100);
		}
	});

	it("non-КП suppliers have null price, tco, and rating", async () => {
		const { suppliers } = await getSuppliers("item-1", ALL);
		const nonKp = suppliers.filter((s) => s.status !== "получено_кп");
		expect(nonKp.length).toBeGreaterThan(0);
		for (const s of nonKp) {
			expect(s.pricePerUnit).toBeNull();
			expect(s.tco).toBeNull();
			expect(s.rating).toBeNull();
		}
	});

	it("tco equals pricePerUnit + round(deliveryCost / 100) for КП suppliers", async () => {
		const { suppliers } = await getSuppliers("item-1", ALL);
		const kpSuppliers = suppliers.filter((s) => s.status === "получено_кп");
		for (const s of kpSuppliers) {
			expect(s.tco).toBe(Math.round((s.pricePerUnit ?? 0) + (s.deliveryCost ?? 0) / 100));
		}
	});

	it("suppliers have non-empty company names and plausible emails", async () => {
		const { suppliers } = await getSuppliers("item-1", ALL);
		const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		for (const s of suppliers) {
			expect(typeof s.companyName).toBe("string");
			expect(s.companyName.length).toBeGreaterThan(0);
			// emails may be empty strings in the seed; when present they should be plausible
			if (s.email) expect(s.email).toMatch(emailLike);
		}
	});

	it("generates different suppliers for different item IDs", async () => {
		const { suppliers: s1 } = await getSuppliers("item-1", ALL);
		const { suppliers: s2 } = await getSuppliers("item-2", ALL);
		const { suppliers: sUnknown } = await getSuppliers("item-does-not-exist", ALL);
		expect(s1.length).toBeGreaterThan(0);
		expect(s2.length).toBeGreaterThan(0);
		expect(s1[0].id).not.toBe(s2[0].id);
		expect(sUnknown).toHaveLength(0);
	});
});

describe("getSuppliers search", () => {
	it("filters by company name (case-insensitive)", async () => {
		const { suppliers: all } = await getSuppliers("item-1");
		const target = all[0].companyName;
		// Search by a substring of the first company name
		const word = target.split(" ")[0];
		const { suppliers } = await getSuppliers("item-1", { search: word });
		expect(suppliers.length).toBeGreaterThan(0);
		for (const s of suppliers) {
			expect(s.companyName.toLowerCase()).toContain(word.toLowerCase());
		}
	});

	it("returns empty array for non-matching search", async () => {
		const { suppliers } = await getSuppliers("item-1", { search: "НесуществующаяКомпания999" });
		expect(suppliers).toHaveLength(0);
	});

	it("returns all suppliers with empty search", async () => {
		const { suppliers } = await getSuppliers("item-1", { search: "", ...ALL });
		expect(suppliers).toHaveLength(ITEM_1_COUNT);
	});
});

describe("getSuppliers sort", () => {
	it("sorts by companyName ascending", async () => {
		const { suppliers } = await getSuppliers("item-1", { sort: "companyName", dir: "asc", ...ALL });
		for (let i = 1; i < suppliers.length; i++) {
			expect(suppliers[i].companyName.localeCompare(suppliers[i - 1].companyName, "ru")).toBeGreaterThanOrEqual(0);
		}
	});

	it("sorts by batchCost descending (mapped to pricePerUnit, nulls last)", async () => {
		const { suppliers } = await getSuppliers("item-1", { sort: "batchCost", dir: "desc", ...ALL });
		const withPrice = suppliers.filter((s) => s.pricePerUnit != null);
		const withoutPrice = suppliers.filter((s) => s.pricePerUnit == null);
		expect(suppliers.indexOf(withPrice[0])).toBeLessThan(suppliers.indexOf(withoutPrice[0]));
		for (let i = 1; i < withPrice.length; i++) {
			expect(withPrice[i].pricePerUnit).toBeLessThanOrEqual(withPrice[i - 1].pricePerUnit as number);
		}
	});

	it("sorts by savings (inverse of price; cheaper supplier ranks higher in asc)", async () => {
		const { suppliers } = await getSuppliers("item-1", { sort: "savings", dir: "asc" });
		const withPrice = suppliers.filter((s) => s.pricePerUnit != null);
		// Lower price = larger savings, so asc savings = desc price.
		for (let i = 1; i < withPrice.length; i++) {
			expect(withPrice[i].pricePerUnit).toBeLessThanOrEqual(withPrice[i - 1].pricePerUnit as number);
		}
	});

	it("sorts by leadTimeDays ascending", async () => {
		const { suppliers } = await getSuppliers("item-1", { sort: "leadTimeDays", dir: "asc" });
		for (let i = 1; i < suppliers.length; i++) {
			const prev = suppliers[i - 1].leadTimeDays;
			const curr = suppliers[i].leadTimeDays;
			if (prev != null && curr != null) expect(curr).toBeGreaterThanOrEqual(prev);
		}
	});

	it("sorts by tco ascending (nulls last)", async () => {
		const { suppliers } = await getSuppliers("item-1", { sort: "tco", dir: "asc", ...ALL });
		const withTco = suppliers.filter((s) => s.tco != null);
		const withoutTco = suppliers.filter((s) => s.tco == null);
		expect(suppliers.indexOf(withTco[0])).toBeLessThan(suppliers.indexOf(withoutTco[0]));
		for (let i = 1; i < withTco.length; i++) {
			expect(withTco[i].tco).toBeGreaterThanOrEqual(withTco[i - 1].tco as number);
		}
	});

	it("generates varied deliveryCost values (null, 0, positive)", async () => {
		const { suppliers } = await getSuppliers("item-1", ALL);
		const nullCost = suppliers.filter((s) => s.deliveryCost === null);
		const zeroCost = suppliers.filter((s) => s.deliveryCost === 0);
		const positiveCost = suppliers.filter((s) => s.deliveryCost != null && s.deliveryCost > 0);
		expect(nullCost.length).toBeGreaterThan(0);
		expect(zeroCost.length).toBeGreaterThan(0);
		expect(positiveCost.length).toBeGreaterThan(0);
	});

	it("generates some suppliers with zero deferralDays (предоплата) and some with deferral", async () => {
		const { suppliers } = await getSuppliers("item-1", ALL);
		const prepay = suppliers.filter((s) => s.deferralDays === 0);
		const withDays = suppliers.filter((s) => s.deferralDays > 0);
		expect(prepay.length).toBeGreaterThan(0);
		expect(withDays.length).toBeGreaterThan(0);
	});
});

describe("getSuppliers status filter", () => {
	it("filters by a single status", async () => {
		const { suppliers } = await getSuppliers("item-1", { statuses: ["получено_кп"] });
		expect(suppliers.length).toBeGreaterThan(0);
		for (const s of suppliers) {
			expect(s.status).toBe("получено_кп");
		}
	});

	it("filters by multiple statuses", async () => {
		const { suppliers } = await getSuppliers("item-1", { statuses: ["получено_кп", "отказ"] });
		expect(suppliers.length).toBeGreaterThan(0);
		for (const s of suppliers) {
			expect(["получено_кп", "отказ"]).toContain(s.status);
		}
	});

	it("returns all when statuses is empty", async () => {
		const { suppliers } = await getSuppliers("item-1", { statuses: [], ...ALL });
		expect(suppliers).toHaveLength(ITEM_1_COUNT);
	});
});

describe("deleteSuppliers", () => {
	it("removes suppliers by IDs", async () => {
		const { suppliers: before } = await getSuppliers("item-1", ALL);
		const idsToDelete = [before[0].id, before[1].id];
		await deleteSuppliers("item-1", idsToDelete);
		const { suppliers: after } = await getSuppliers("item-1", ALL);
		expect(after).toHaveLength(ITEM_1_COUNT - idsToDelete.length);
		for (const id of idsToDelete) {
			expect(after.find((s) => s.id === id)).toBeUndefined();
		}
	});

	it("no-ops for non-existent IDs", async () => {
		await deleteSuppliers("item-1", ["nonexistent-id"]);
		const { suppliers } = await getSuppliers("item-1", ALL);
		expect(suppliers).toHaveLength(ITEM_1_COUNT);
	});
});

describe("getSupplier (single)", () => {
	it("returns a supplier by itemId and supplierId", async () => {
		const { suppliers } = await getSuppliers("item-1");
		const target = suppliers[0];
		const result = await getSupplier("item-1", target.id);
		expect(result).toEqual(target);
	});

	it("returns null for non-existent supplierId", async () => {
		const result = await getSupplier("item-1", "nonexistent");
		expect(result).toBeNull();
	});
});

describe("getSuppliers combined search + sort + filter", () => {
	it("applies search, status filter, and sort together", async () => {
		const { suppliers: all } = await getSuppliers("item-1");
		const kpSuppliers = all.filter((s) => s.status === "получено_кп");
		// Use a substring from one of the КП suppliers
		const searchTerm = kpSuppliers[0].companyName.slice(0, 3);
		const { suppliers } = await getSuppliers("item-1", {
			search: searchTerm,
			statuses: ["получено_кп"],
			sort: "batchCost",
			dir: "asc",
		});
		for (const s of suppliers) {
			expect(s.status).toBe("получено_кп");
			expect(s.companyName.toLowerCase()).toContain(searchTerm.toLowerCase());
		}
	});
});

describe("mock data chat messages", () => {
	it("first message (agent) has no attachments", async () => {
		const { suppliers } = await getSuppliers("item-1", ALL);
		const withChat = suppliers.filter((s) => s.chatHistory.length > 0);
		expect(withChat.length).toBeGreaterThan(0);
		for (const s of withChat) {
			expect(s.chatHistory[0].attachments).toBeUndefined();
		}
	});
});

describe("sendSupplierMessage", () => {
	it("appends a message to the supplier's chatHistory", async () => {
		const { suppliers } = await getSuppliers("item-1");
		const target = suppliers[0];
		const before = target.chatHistory.length;

		const msg = await sendSupplierMessage("item-1", target.id, "Тестовое сообщение");

		expect(msg.body).toBe("Тестовое сообщение");
		expect(msg.sender).toBe("Агент");
		expect(msg.isOurs).toBe(true);
		expect(msg.timestamp).toBeTruthy();

		const updated = await getSupplier("item-1", target.id);
		expect(updated?.chatHistory).toHaveLength(before + 1);
		expect(updated?.chatHistory[updated.chatHistory.length - 1].body).toBe("Тестовое сообщение");
	});

	it("throws for non-existent supplier", async () => {
		await expect(sendSupplierMessage("item-1", "nonexistent", "msg")).rejects.toThrow("Supplier not found");
	});

	it("throws when _setSendShouldFail is set", async () => {
		_setSendShouldFail(true);
		const { suppliers } = await getSuppliers("item-1");
		await expect(sendSupplierMessage("item-1", suppliers[0].id, "msg")).rejects.toThrow(
			"Не удалось отправить сообщение",
		);
	});

	it("includes attachments when files are provided", async () => {
		const { suppliers } = await getSuppliers("item-1");
		const file = new File([new Uint8Array(5000)], "offer.pdf", { type: "application/pdf" });
		const msg = await sendSupplierMessage("item-1", suppliers[0].id, "Вот КП", [file]);

		expect(msg.attachments).toHaveLength(1);
		expect(msg.attachments?.[0]).toEqual({ name: "offer.pdf", type: "pdf", size: 5000 });
	});

	it("omits attachments when no files provided", async () => {
		const { suppliers } = await getSuppliers("item-1");
		const msg = await sendSupplierMessage("item-1", suppliers[0].id, "Без файлов");

		expect(msg.attachments).toBeUndefined();
	});
});
