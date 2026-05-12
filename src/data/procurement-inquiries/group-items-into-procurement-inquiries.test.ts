import { describe, expect, it } from "vitest";
import type { NewItemInput } from "../types";
import { groupItemsIntoProcurementInquiries } from "./group-items-into-procurement-inquiries";

const item = (name: string): NewItemInput => ({ name });

describe("groupItemsIntoProcurementInquiries", () => {
	it("returns an empty array for no items", () => {
		expect(groupItemsIntoProcurementInquiries([])).toEqual([]);
	});

	it("groups items sharing the leading meaningful word", () => {
		const result = groupItemsIntoProcurementInquiries([
			item("Полотно ПВД 2600 мм"),
			item("Полотно стрейч 500 мм"),
			item("Картонные уголки 50×50"),
		]);
		expect(result).toHaveLength(2);
		expect(result[0].items).toHaveLength(2);
		expect(result[0].name).toBe("Полотно ПВД 2600 мм");
		expect(result[1].items).toHaveLength(1);
		expect(result[1].name).toBe("Картонные уголки 50×50");
	});

	it("groups case-insensitively", () => {
		const result = groupItemsIntoProcurementInquiries([item("Клей ПУ"), item("клей эпокси")]);
		expect(result).toHaveLength(1);
		expect(result[0].items).toHaveLength(2);
	});

	it("preserves first-seen order", () => {
		const result = groupItemsIntoProcurementInquiries([item("Бета"), item("Альфа"), item("Бета 2")]);
		expect(result.map((r) => r.name)).toEqual(["Бета", "Альфа"]);
	});

	it("skips noise leading words like 'и', 'для', 'с' when picking the group key", () => {
		const result = groupItemsIntoProcurementInquiries([item("Для бумаги офисной"), item("Бумаги офисной A4")]);
		expect(result).toHaveLength(1);
	});

	it("each item with a unique name lands in its own group", () => {
		const result = groupItemsIntoProcurementInquiries([item("Альфа"), item("Бета"), item("Гамма")]);
		expect(result).toHaveLength(3);
		expect(result.every((r) => r.items.length === 1)).toBe(true);
	});
});
