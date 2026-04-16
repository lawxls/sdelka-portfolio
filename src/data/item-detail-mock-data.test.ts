import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	_resetItemDetailStore,
	_setItemDetailMockDelay,
	getItemDetail,
	updateItemDetail,
} from "./item-detail-mock-data";

beforeEach(() => {
	_resetItemDetailStore();
	_setItemDetailMockDelay(0, 0);
});

afterEach(() => {
	_resetItemDetailStore();
});

describe("getItemDetail", () => {
	it("returns a procurement item by ID", async () => {
		const item = await getItemDetail("item-1");
		expect(item).not.toBeNull();
		expect(item?.id).toBe("item-1");
		expect(item?.name).toBe("Арматура А500С ∅12");
		expect(item?.status).toBe("searching");
	});

	it("returns null for nonexistent ID", async () => {
		const item = await getItemDetail("nonexistent");
		expect(item).toBeNull();
	});

	it("includes all editable fields", async () => {
		const item = await getItemDetail("item-1");
		expect(item?.annualQuantity).toBe(1200);
		expect(item?.currentPrice).toBe(4500);
		expect(item?.unit).toBe("т");
		expect(item?.frequencyCount).toBe(2);
		expect(item?.paymentType).toBe("deferred");
		expect(item?.deliveryType).toBe("warehouse");
		expect(item?.folderId).toBe("folder-metal");
	});

	it("includes read-only fields", async () => {
		const item = await getItemDetail("item-1");
		expect(item?.bestPrice).toBe(3800);
		expect(item?.averagePrice).toBe(4100);
	});
});

describe("updateItemDetail", () => {
	it("updates editable fields and returns updated item", async () => {
		const updated = await updateItemDetail("item-1", { name: "Арматура А400", annualQuantity: 2000 });
		expect(updated.name).toBe("Арматура А400");
		expect(updated.annualQuantity).toBe(2000);
		expect(updated.currentPrice).toBe(4500);
		expect(updated.status).toBe("searching");
	});

	it("persists changes to the store", async () => {
		await updateItemDetail("item-1", { currentPrice: 5000 });
		const item = await getItemDetail("item-1");
		expect(item?.currentPrice).toBe(5000);
	});

	it("throws for nonexistent item", async () => {
		await expect(updateItemDetail("nonexistent", { name: "X" })).rejects.toThrow("Item nonexistent not found");
	});
});
