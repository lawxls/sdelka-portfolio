import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

beforeEach(() => {
	_resetSupplierStore();
	_setSupplierMockDelay(0, 0);
});

afterEach(() => {
	_resetSupplierStore();
});

describe("supplier mock store", () => {
	it("has 10 suppliers for a given procurement item", async () => {
		const { suppliers } = await getSuppliers("item-1");
		expect(suppliers.length).toBe(10);
	});

	it("all suppliers belong to the requested item", async () => {
		const { suppliers } = await getSuppliers("item-1");
		for (const s of suppliers) {
			expect(s.itemId).toBe("item-1");
		}
	});

	it("spreads suppliers across all 5 statuses", async () => {
		const { suppliers } = await getSuppliers("item-1");
		const statuses = new Set(suppliers.map((s) => s.status));
		expect(statuses.size).toBe(5);
		for (const status of SUPPLIER_STATUSES) {
			expect(statuses.has(status)).toBe(true);
		}
	});

	it("has 2-3 suppliers with получено_кп status", async () => {
		const { suppliers } = await getSuppliers("item-1");
		const kpCount = suppliers.filter((s) => s.status === "получено_кп").length;
		expect(kpCount).toBeGreaterThanOrEqual(2);
		expect(kpCount).toBeLessThanOrEqual(3);
	});

	it("получено_кп suppliers have non-null price, tco, and rating", async () => {
		const { suppliers } = await getSuppliers("item-1");
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
		const { suppliers } = await getSuppliers("item-1");
		const nonKp = suppliers.filter((s) => s.status !== "получено_кп");
		expect(nonKp.length).toBeGreaterThan(0);
		for (const s of nonKp) {
			expect(s.pricePerUnit).toBeNull();
			expect(s.tco).toBeNull();
			expect(s.rating).toBeNull();
		}
	});

	it("tco equals pricePerUnit + deliveryCost for КП suppliers", async () => {
		const { suppliers } = await getSuppliers("item-1");
		const kpSuppliers = suppliers.filter((s) => s.status === "получено_кп");
		for (const s of kpSuppliers) {
			expect(s.tco).toBe((s.pricePerUnit ?? 0) + (s.deliveryCost ?? 0));
		}
	});

	it("suppliers have Russian company names and valid emails", async () => {
		const { suppliers } = await getSuppliers("item-1");
		for (const s of suppliers) {
			expect(s.companyName).toMatch(/[А-Яа-яЁё]/);
			expect(s.email).toContain("@");
		}
	});

	it("generates different suppliers for different item IDs", async () => {
		const { suppliers: s1 } = await getSuppliers("item-1");
		const { suppliers: s2 } = await getSuppliers("item-2");
		const ids1 = new Set(s1.map((s) => s.id));
		const ids2 = new Set(s2.map((s) => s.id));
		// No overlapping IDs
		for (const id of ids2) {
			expect(ids1.has(id)).toBe(false);
		}
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
		const { suppliers } = await getSuppliers("item-1", { search: "" });
		expect(suppliers).toHaveLength(10);
	});
});

describe("getSuppliers sort", () => {
	it("sorts by companyName ascending", async () => {
		const { suppliers } = await getSuppliers("item-1", { sort: "companyName", dir: "asc" });
		for (let i = 1; i < suppliers.length; i++) {
			expect(suppliers[i].companyName.localeCompare(suppliers[i - 1].companyName, "ru")).toBeGreaterThanOrEqual(0);
		}
	});

	it("sorts by pricePerUnit descending (nulls last)", async () => {
		const { suppliers } = await getSuppliers("item-1", { sort: "pricePerUnit", dir: "desc" });
		const withPrice = suppliers.filter((s) => s.pricePerUnit != null);
		const withoutPrice = suppliers.filter((s) => s.pricePerUnit == null);
		// Non-null values come first
		expect(suppliers.indexOf(withPrice[0])).toBeLessThan(suppliers.indexOf(withoutPrice[0]));
		// Among non-null, descending
		for (let i = 1; i < withPrice.length; i++) {
			expect(withPrice[i].pricePerUnit).toBeLessThanOrEqual(withPrice[i - 1].pricePerUnit as number);
		}
	});

	it("sorts by tco ascending (nulls last)", async () => {
		const { suppliers } = await getSuppliers("item-1", { sort: "tco", dir: "asc" });
		const withTco = suppliers.filter((s) => s.tco != null);
		const withoutTco = suppliers.filter((s) => s.tco == null);
		expect(suppliers.indexOf(withTco[0])).toBeLessThan(suppliers.indexOf(withoutTco[0]));
		for (let i = 1; i < withTco.length; i++) {
			expect(withTco[i].tco).toBeGreaterThanOrEqual(withTco[i - 1].tco as number);
		}
	});

	it("generates varied deliveryCost values (null, 0, positive)", async () => {
		const { suppliers } = await getSuppliers("item-1");
		const nullCost = suppliers.filter((s) => s.deliveryCost === null);
		const zeroCost = suppliers.filter((s) => s.deliveryCost === 0);
		const positiveCost = suppliers.filter((s) => s.deliveryCost != null && s.deliveryCost > 0);
		expect(nullCost.length).toBeGreaterThan(0);
		expect(zeroCost.length).toBeGreaterThan(0);
		expect(positiveCost.length).toBeGreaterThan(0);
	});

	it("generates some suppliers with zero deferralDays (предоплата)", async () => {
		const { suppliers } = await getSuppliers("item-1");
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
		const { suppliers } = await getSuppliers("item-1", { statuses: [] });
		expect(suppliers).toHaveLength(10);
	});
});

describe("deleteSuppliers", () => {
	it("removes suppliers by IDs", async () => {
		const { suppliers: before } = await getSuppliers("item-1");
		const idsToDelete = [before[0].id, before[1].id];
		await deleteSuppliers("item-1", idsToDelete);
		const { suppliers: after } = await getSuppliers("item-1");
		expect(after).toHaveLength(8);
		for (const id of idsToDelete) {
			expect(after.find((s) => s.id === id)).toBeUndefined();
		}
	});

	it("no-ops for non-existent IDs", async () => {
		await deleteSuppliers("item-1", ["nonexistent-id"]);
		const { suppliers } = await getSuppliers("item-1");
		expect(suppliers).toHaveLength(10);
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
			sort: "pricePerUnit",
			dir: "asc",
		});
		for (const s of suppliers) {
			expect(s.status).toBe("получено_кп");
			expect(s.companyName.toLowerCase()).toContain(searchTerm.toLowerCase());
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
