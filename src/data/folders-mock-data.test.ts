import { beforeEach, describe, expect, it } from "vitest";
import {
	_getFolders,
	_resetFoldersStore,
	_setFolders,
	createFolderMock,
	deleteFolderMock,
	fetchFolderStatsMock,
	fetchFoldersMock,
	updateFolderMock,
} from "./folders-mock-data";
import { _resetItemsStore, _setItems } from "./items-mock-data";
import type { ProcurementItem } from "./types";

function makeItem(id: string, overrides: Partial<ProcurementItem> = {}): ProcurementItem {
	return {
		id,
		name: `Item ${id}`,
		status: "searching",
		annualQuantity: 100,
		currentPrice: 50,
		bestPrice: 40,
		averagePrice: 45,
		folderId: null,
		companyId: "c1",
		...overrides,
	};
}

beforeEach(() => {
	_resetFoldersStore();
	_resetItemsStore();
});

describe("fetchFoldersMock", () => {
	it("returns seed folders", async () => {
		const result = await fetchFoldersMock();
		expect(result.folders.length).toBeGreaterThan(0);
	});

	it("reflects _setFolders override", async () => {
		_setFolders([{ id: "x", name: "Custom", color: "red" }]);
		const result = await fetchFoldersMock();
		expect(result.folders).toEqual([{ id: "x", name: "Custom", color: "red" }]);
	});
});

describe("fetchFolderStatsMock", () => {
	it("returns counts grouped by folder + archive count", async () => {
		_setFolders([
			{ id: "f1", name: "A", color: "red" },
			{ id: "f2", name: "B", color: "blue" },
		]);
		_setItems(
			[
				makeItem("a", { folderId: "f1" }),
				makeItem("b", { folderId: "f1" }),
				makeItem("c", { folderId: "f2" }),
				makeItem("d", { folderId: null }),
				makeItem("e", { folderId: "f1" }),
			],
			["e"],
		);
		const result = await fetchFolderStatsMock();
		const f1 = result.stats.find((s) => s.folderId === "f1");
		const f2 = result.stats.find((s) => s.folderId === "f2");
		const none = result.stats.find((s) => s.folderId === null);
		expect(f1?.itemCount).toBe(2);
		expect(f2?.itemCount).toBe(1);
		expect(none?.itemCount).toBe(1);
		expect(result.archiveCount).toBe(1);
	});

	it("skips folders with no items", async () => {
		_setFolders([{ id: "empty", name: "Empty", color: "pink" }]);
		_setItems([makeItem("a", { folderId: null })]);
		const result = await fetchFolderStatsMock();
		expect(result.stats.find((s) => s.folderId === "empty")).toBeUndefined();
	});
});

describe("createFolderMock", () => {
	it("adds new folder with generated id", async () => {
		_setFolders([]);
		const created = await createFolderMock({ name: "New", color: "red" });
		expect(created.name).toBe("New");
		expect(created.id).toBeTruthy();
		expect(_getFolders()).toHaveLength(1);
	});
});

describe("updateFolderMock", () => {
	it("renames folder", async () => {
		_setFolders([{ id: "f1", name: "Old", color: "red" }]);
		const updated = await updateFolderMock("f1", { name: "Renamed" });
		expect(updated.name).toBe("Renamed");
		expect(_getFolders()[0].name).toBe("Renamed");
	});

	it("changes color", async () => {
		_setFolders([{ id: "f1", name: "A", color: "red" }]);
		await updateFolderMock("f1", { color: "purple" });
		expect(_getFolders()[0].color).toBe("purple");
	});

	it("throws when folder missing", async () => {
		_setFolders([]);
		await expect(updateFolderMock("nope", { name: "x" })).rejects.toThrow();
	});
});

describe("deleteFolderMock", () => {
	it("removes folder from store", async () => {
		_setFolders([
			{ id: "f1", name: "A", color: "red" },
			{ id: "f2", name: "B", color: "blue" },
		]);
		await deleteFolderMock("f1");
		expect(_getFolders().map((f) => f.id)).toEqual(["f2"]);
	});

	it("unassigns items from the deleted folder", async () => {
		_setFolders([{ id: "f1", name: "A", color: "red" }]);
		_setItems([makeItem("a", { folderId: "f1" }), makeItem("b", { folderId: null })]);
		await deleteFolderMock("f1");
		const stats = await fetchFolderStatsMock();
		const none = stats.stats.find((s) => s.folderId === null);
		expect(none?.itemCount).toBe(2);
	});
});
