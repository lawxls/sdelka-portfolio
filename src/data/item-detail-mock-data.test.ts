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
		expect(item?.name).toBe("Полотно ПВД 2600 мм");
		expect(item?.status).toBe("completed");
	});

	it("returns null for nonexistent ID", async () => {
		const item = await getItemDetail("nonexistent");
		expect(item).toBeNull();
	});

	it("includes all editable fields", async () => {
		const item = await getItemDetail("item-1");
		expect(item?.annualQuantity).toBe(180_000);
		expect(item?.currentPrice).toBe(1776);
		expect(item?.unit).toBe("м");
		expect(item?.quantityPerDelivery).toBe(15_000);
		expect(item?.paymentType).toBe("prepayment");
		expect(item?.deliveryCostType).toBe("paid");
		expect(item?.folderId).toBe("folder-packaging");
	});

	it("includes read-only fields", async () => {
		const item = await getItemDetail("item-1");
		expect(item?.bestPrice).toBe(1485);
		expect(item?.averagePrice).toBe(2256);
	});
});

describe("updateItemDetail", () => {
	it("updates editable fields and returns updated item", async () => {
		const updated = await updateItemDetail("item-1", { name: "Полотно ПВД 1800 мм", annualQuantity: 2000 });
		expect(updated.name).toBe("Полотно ПВД 1800 мм");
		expect(updated.annualQuantity).toBe(2000);
		expect(updated.currentPrice).toBe(1776);
		expect(updated.status).toBe("completed");
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
