import { describe, expect, it } from "vitest";
import type { NewItemInput } from "../types";
import { groupItemsIntoTenders } from "./group-items-into-tenders";

const item = (name: string, folderId?: string | null): NewItemInput => ({ name, folderId: folderId ?? null });

describe("groupItemsIntoTenders", () => {
	it("returns an empty array for no items", () => {
		expect(groupItemsIntoTenders([])).toEqual([]);
	});

	it("groups items sharing the leading meaningful word", () => {
		const result = groupItemsIntoTenders([
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
		const result = groupItemsIntoTenders([item("Клей ПУ"), item("клей эпокси")]);
		expect(result).toHaveLength(1);
		expect(result[0].items).toHaveLength(2);
	});

	it("preserves first-seen order", () => {
		const result = groupItemsIntoTenders([item("Бета"), item("Альфа"), item("Бета 2")]);
		expect(result.map((r) => r.name)).toEqual(["Бета", "Альфа"]);
	});

	it("inherits folderId from the first item in a group", () => {
		const result = groupItemsIntoTenders([
			item("Полотно ПВД", "folder-packaging"),
			item("Полотно стрейч", "folder-other"),
		]);
		expect(result[0].folderId).toBe("folder-packaging");
	});

	it("skips noise leading words like 'и', 'для', 'с' when picking the group key", () => {
		const result = groupItemsIntoTenders([item("Для бумаги офисной"), item("Бумаги офисной A4")]);
		expect(result).toHaveLength(1);
	});

	it("each item with a unique name lands in its own group", () => {
		const result = groupItemsIntoTenders([item("Альфа"), item("Бета"), item("Гамма")]);
		expect(result).toHaveLength(3);
		expect(result.every((r) => r.items.length === 1)).toBe(true);
	});
});
