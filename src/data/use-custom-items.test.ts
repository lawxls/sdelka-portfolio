import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProcurementItem } from "./types";
import {
	DELIVERY_TYPE_LABELS,
	FREQUENCIES,
	FREQUENCY_LABELS,
	LEGAL_ENTITY_LABELS,
	PAYMENT_METHOD_LABELS,
	PAYMENT_TYPE_LABELS,
	PROCUREMENT_TYPE_LABELS,
	UNLOADING_LABELS,
} from "./types";
import { useCustomItems } from "./use-custom-items";

const LS_KEY = "custom-items";

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("useCustomItems", () => {
	describe("items", () => {
		it("returns empty array when no custom items exist", () => {
			const { result } = renderHook(() => useCustomItems());
			expect(result.current.items).toEqual([]);
		});

		it("returns previously added items", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "Test Item" }]);
			});
			const items = result.current.items;
			expect(items).toHaveLength(1);
			expect(items[0].name).toBe("Test Item");
		});
	});

	describe("addItems", () => {
		it("creates ProcurementItem with status searching and null prices", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "New Position" }]);
			});
			const item = result.current.items[0];
			expect(item.status).toBe("searching");
			expect(item.bestPrice).toBeNull();
			expect(item.averagePrice).toBeNull();
		});

		it("generates unique IDs for each item", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "A" }, { name: "B" }]);
			});
			const items = result.current.items;
			expect(items[0].id).not.toBe(items[1].id);
		});

		it("sets default values for annualQuantity, currentPrice, and folderId", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "Item" }]);
			});
			const item = result.current.items[0];
			expect(item.annualQuantity).toBe(0);
			expect(item.currentPrice).toBe(0);
			expect(item.folderId).toBeNull();
		});

		it("maps description, unit, annualQuantity, and currentPrice to ProcurementItem", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([
					{
						name: "Цемент М500",
						description: "Портландцемент",
						unit: "т",
						annualQuantity: 120,
						currentPrice: 5500,
					},
				]);
			});
			const item = result.current.items[0];
			expect(item.description).toBe("Портландцемент");
			expect(item.unit).toBe("т");
			expect(item.annualQuantity).toBe(120);
			expect(item.currentPrice).toBe(5500);
		});

		it("leaves description and unit undefined when not provided", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "Plain" }]);
			});
			const item = result.current.items[0];
			expect(item.description).toBeUndefined();
			expect(item.unit).toBeUndefined();
		});

		it("adds multiple items in a single call", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "A" }, { name: "B" }, { name: "C" }]);
			});
			expect(result.current.items).toHaveLength(3);
		});

		it("accumulates items across multiple addItems calls", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "First" }]);
			});
			act(() => {
				result.current.addItems([{ name: "Second" }]);
			});
			expect(result.current.items).toHaveLength(2);
		});

		it("persists items to localStorage", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "Persisted" }]);
			});
			const stored: ProcurementItem[] = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
			expect(stored).toHaveLength(1);
			expect(stored[0].name).toBe("Persisted");
		});
	});

	describe("localStorage persistence", () => {
		it("reads items from localStorage on mount", () => {
			const items: ProcurementItem[] = [
				{
					id: "custom-abc",
					name: "Stored Item",
					status: "searching",
					annualQuantity: 0,
					currentPrice: 0,
					bestPrice: null,
					averagePrice: null,
					folderId: null,
				},
			];
			localStorage.setItem(LS_KEY, JSON.stringify(items));

			const { result } = renderHook(() => useCustomItems());
			expect(result.current.items).toHaveLength(1);
			expect(result.current.items[0].name).toBe("Stored Item");
		});

		it("survives remount (simulating page reload)", () => {
			const { result, unmount } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "Survivor" }]);
			});
			unmount();

			const { result: result2 } = renderHook(() => useCustomItems());
			expect(result2.current.items).toHaveLength(1);
			expect(result2.current.items[0].name).toBe("Survivor");
		});

		it("falls back to empty array when localStorage is empty", () => {
			const { result } = renderHook(() => useCustomItems());
			expect(result.current.items).toEqual([]);
		});
	});

	describe("procurementType and frequency", () => {
		it("maps procurementType and frequency to ProcurementItem", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([
					{
						name: "Regular Item",
						procurementType: "regular",
						frequency: "monthly",
					},
				]);
			});
			const item = result.current.items[0];
			expect(item.procurementType).toBe("regular");
			expect(item.frequency).toBe("monthly");
		});

		it("leaves procurementType and frequency undefined when not provided", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "Plain" }]);
			});
			const item = result.current.items[0];
			expect(item.procurementType).toBeUndefined();
			expect(item.frequency).toBeUndefined();
		});

		it("sets frequency undefined for one-time procurement", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([
					{
						name: "One-time",
						procurementType: "one-time",
					},
				]);
			});
			const item = result.current.items[0];
			expect(item.procurementType).toBe("one-time");
			expect(item.frequency).toBeUndefined();
		});
	});

	describe("delivery conditions", () => {
		it("maps all delivery condition fields to ProcurementItem", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([
					{
						name: "Full delivery",
						legalEntityMode: "company",
						legalEntityCompany: "ООО «Сделка»",
						paymentType: "deferred",
						paymentDeferralDays: 30,
						vatIncluded: true,
						paymentMethod: "bank_transfer",
						deliveryType: "warehouse",
						deliveryAddress: "г. Москва, ул. Примерная, 1",
						unloading: "supplier",
						analoguesAllowed: true,
					},
				]);
			});
			const item = result.current.items[0];
			expect(item.legalEntityMode).toBe("company");
			expect(item.legalEntityCompany).toBe("ООО «Сделка»");
			expect(item.paymentType).toBe("deferred");
			expect(item.paymentDeferralDays).toBe(30);
			expect(item.vatIncluded).toBe(true);
			expect(item.paymentMethod).toBe("bank_transfer");
			expect(item.deliveryType).toBe("warehouse");
			expect(item.deliveryAddress).toBe("г. Москва, ул. Примерная, 1");
			expect(item.unloading).toBe("supplier");
			expect(item.analoguesAllowed).toBe(true);
		});

		it("leaves delivery fields undefined when not provided", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "No delivery" }]);
			});
			const item = result.current.items[0];
			expect(item.legalEntityMode).toBeUndefined();
			expect(item.legalEntityCompany).toBeUndefined();
			expect(item.paymentType).toBeUndefined();
			expect(item.paymentDeferralDays).toBeUndefined();
			expect(item.vatIncluded).toBeUndefined();
			expect(item.paymentMethod).toBeUndefined();
			expect(item.deliveryType).toBeUndefined();
			expect(item.deliveryAddress).toBeUndefined();
			expect(item.unloading).toBeUndefined();
			expect(item.analoguesAllowed).toBeUndefined();
		});
	});
});

describe("type constants", () => {
	it("PROCUREMENT_TYPE_LABELS covers both types", () => {
		expect(Object.keys(PROCUREMENT_TYPE_LABELS)).toEqual(["one-time", "regular"]);
	});

	it("FREQUENCY_LABELS covers all 6 frequencies", () => {
		expect(Object.keys(FREQUENCY_LABELS)).toHaveLength(6);
		expect(FREQUENCY_LABELS.weekly).toBe("Еженедельно");
		expect(FREQUENCY_LABELS["on-demand"]).toBe("По требованию");
	});

	it("FREQUENCIES array matches FREQUENCY_LABELS keys", () => {
		expect(FREQUENCIES).toEqual(Object.keys(FREQUENCY_LABELS));
	});

	it("LEGAL_ENTITY_LABELS covers incognito and company", () => {
		expect(Object.keys(LEGAL_ENTITY_LABELS)).toEqual(["incognito", "company"]);
		expect(LEGAL_ENTITY_LABELS.incognito).toBe("Режим инкогнито");
		expect(LEGAL_ENTITY_LABELS.company).toBe("Компания");
	});

	it("PAYMENT_TYPE_LABELS covers prepayment and deferred", () => {
		expect(Object.keys(PAYMENT_TYPE_LABELS)).toEqual(["prepayment", "deferred"]);
	});

	it("PAYMENT_METHOD_LABELS covers bank_transfer and cash", () => {
		expect(Object.keys(PAYMENT_METHOD_LABELS)).toEqual(["bank_transfer", "cash"]);
		expect(PAYMENT_METHOD_LABELS.bank_transfer).toBe("Р/С");
		expect(PAYMENT_METHOD_LABELS.cash).toBe("Наличные");
	});

	it("DELIVERY_TYPE_LABELS covers warehouse and pickup", () => {
		expect(Object.keys(DELIVERY_TYPE_LABELS)).toEqual(["warehouse", "pickup"]);
	});

	it("UNLOADING_LABELS covers supplier and self", () => {
		expect(Object.keys(UNLOADING_LABELS)).toEqual(["supplier", "self"]);
	});
});
