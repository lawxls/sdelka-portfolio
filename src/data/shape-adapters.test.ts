import { describe, expect, it } from "vitest";
import { boardColumns, detail, flatList, flatListIn, type InfinitePagesCache, infinitePages } from "./shape-adapters";

const NO_KEY = [] as const;

describe("detail", () => {
	it("patches a single record", () => {
		const updater = detail<{ id: string; name: string }>((r) => ({ ...r, name: "New" }));
		expect(updater({ id: "i1", name: "Old" }, NO_KEY)).toEqual({ id: "i1", name: "New" });
	});
});

describe("flatList", () => {
	const verbs = flatList<{ id: string; name: string }>();

	it("patchById updates the matching item only", () => {
		const before = [
			{ id: "i1", name: "A" },
			{ id: "i2", name: "B" },
		];
		expect(verbs.patchById("i1", (i) => ({ ...i, name: "A2" }))(before, NO_KEY)).toEqual([
			{ id: "i1", name: "A2" },
			{ id: "i2", name: "B" },
		]);
	});

	it("removeById drops the matching item", () => {
		const before = [
			{ id: "i1", name: "A" },
			{ id: "i2", name: "B" },
		];
		expect(verbs.removeById("i1")(before, NO_KEY)).toEqual([{ id: "i2", name: "B" }]);
	});

	it("prepend and append add at the right ends", () => {
		const before = [{ id: "i2", name: "B" }];
		expect(verbs.prepend({ id: "i1", name: "A" })(before, NO_KEY)).toEqual([
			{ id: "i1", name: "A" },
			{ id: "i2", name: "B" },
		]);
		expect(verbs.append({ id: "i3", name: "C" })(before, NO_KEY)).toEqual([
			{ id: "i2", name: "B" },
			{ id: "i3", name: "C" },
		]);
	});

	it("apply runs an arbitrary transform", () => {
		const before = [
			{ id: "i1", name: "A" },
			{ id: "i2", name: "B" },
		];
		expect(verbs.apply((items) => items.reverse())(before, NO_KEY)).toEqual([
			{ id: "i2", name: "B" },
			{ id: "i1", name: "A" },
		]);
	});
});

describe("flatListIn", () => {
	type Folder = { id: string; name: string };
	type Wrap = { folders: Folder[] };
	const verbs = flatListIn<Wrap, Folder>({
		get: (data) => data.folders,
		set: (data, folders) => ({ ...data, folders }),
	});

	it("patches inside a wrapped array", () => {
		const before: Wrap = { folders: [{ id: "f1", name: "Old" }] };
		expect(verbs.patchById("f1", (f) => ({ ...f, name: "New" }))(before, NO_KEY)).toEqual({
			folders: [{ id: "f1", name: "New" }],
		});
	});

	it("removes from a wrapped array", () => {
		const before: Wrap = {
			folders: [
				{ id: "f1", name: "A" },
				{ id: "f2", name: "B" },
			],
		};
		expect(verbs.removeById("f1")(before, NO_KEY)).toEqual({ folders: [{ id: "f2", name: "B" }] });
	});

	it("prepend keeps the wrapping intact", () => {
		const before: Wrap = { folders: [{ id: "f2", name: "B" }] };
		const after = verbs.prepend({ id: "f1", name: "A" })(before, NO_KEY);
		expect(after.folders).toEqual([
			{ id: "f1", name: "A" },
			{ id: "f2", name: "B" },
		]);
	});
});

describe("infinitePages", () => {
	type Item = { id: string; name: string; folderId: string | null };
	type Page = { items: Item[]; nextCursor: string | null };

	const verbs = infinitePages<Page, Item>({
		get: (page) => page.items,
		set: (page, items) => ({ ...page, items }),
	});

	function seed(): InfinitePagesCache<Page> {
		return {
			pages: [
				{ items: [{ id: "i1", name: "A", folderId: null }], nextCursor: "cursor-1" },
				{
					items: [
						{ id: "i2", name: "B", folderId: "f1" },
						{ id: "i3", name: "C", folderId: "f1" },
					],
					nextCursor: null,
				},
			],
			pageParams: [undefined, "cursor-1"],
		};
	}

	it("patchById walks every page", () => {
		const result = verbs.patchById("i2", (i) => ({ ...i, name: "B2" }))(seed(), NO_KEY);
		expect(result.pages[1].items[0]).toEqual({ id: "i2", name: "B2", folderId: "f1" });
		expect(result.pages[0].items[0].name).toBe("A");
	});

	it("removeById walks every page", () => {
		const result = verbs.removeById("i2")(seed(), NO_KEY);
		expect(result.pages[1].items.map((i) => i.id)).toEqual(["i3"]);
	});

	it("preserves page metadata (nextCursor, pageParams)", () => {
		const result = verbs.removeById("i1")(seed(), NO_KEY);
		expect(result.pages[0].nextCursor).toBe("cursor-1");
		expect(result.pageParams).toEqual([undefined, "cursor-1"]);
	});

	it("patchOrRemoveById removes when decide returns null", () => {
		const result = verbs.patchOrRemoveById("i2", () => null)(seed(), NO_KEY);
		expect(result.pages[1].items.map((i) => i.id)).toEqual(["i3"]);
	});

	it("patchOrRemoveById branches per cache key", () => {
		const cache = seed();
		// Cache scoped to folder=f1 — should keep i2 (folderId === f1)
		const inFolder = verbs.patchOrRemoveById("i2", (item, key) => {
			const folder = (key[1] as { folder?: string })?.folder;
			if (folder !== undefined && item.folderId !== folder) return null;
			return item;
		})(cache, ["items", { folder: "f1" }]);
		expect(inFolder.pages[1].items.find((i) => i.id === "i2")).toBeDefined();

		// Cache scoped to folder=f2 — should drop i2
		const otherFolder = verbs.patchOrRemoveById("i2", (item, key) => {
			const folder = (key[1] as { folder?: string })?.folder;
			if (folder !== undefined && item.folderId !== folder) return null;
			return item;
		})(seed(), ["items", { folder: "f2" }]);
		expect(otherFolder.pages[1].items.find((i) => i.id === "i2")).toBeUndefined();
	});

	it("perPage is the escape hatch for bespoke transforms", () => {
		const result = verbs.perPage((items) => items.map((i) => ({ ...i, name: i.name.toUpperCase() })))(seed(), NO_KEY);
		expect(result.pages[0].items[0].name).toBe("A");
		expect(result.pages[1].items[0].name).toBe("B");
	});
});

describe("boardColumns", () => {
	type Task = { id: string; name: string; status: string };
	type Board = Record<string, Task[]>;

	const COLUMNS = ["assigned", "in_progress", "completed"];

	const verbs = boardColumns<Board, Task>({
		listColumns: () => COLUMNS,
		getItems: (data, column) => data[column] ?? [],
		setItems: (data, column, items) => ({ ...data, [column]: items }),
	});

	function seed(): Board {
		return {
			assigned: [
				{ id: "t1", name: "T1", status: "assigned" },
				{ id: "t2", name: "T2", status: "assigned" },
			],
			in_progress: [{ id: "t3", name: "T3", status: "in_progress" }],
			completed: [],
		};
	}

	it("patchById finds the item in its column", () => {
		const result = verbs.patchById("t3", (t) => ({ ...t, name: "T3-renamed" }))(seed(), NO_KEY);
		expect(result.in_progress[0].name).toBe("T3-renamed");
	});

	it("removeById drops the item from its column", () => {
		const result = verbs.removeById("t1")(seed(), NO_KEY);
		expect(result.assigned.map((t) => t.id)).toEqual(["t2"]);
	});

	it("moveBetween moves the item from source to target with transform", () => {
		const result = verbs.moveBetween("t1", "completed", (t) => ({ ...t, status: "completed" }))(seed(), NO_KEY);
		expect(result.assigned.map((t) => t.id)).toEqual(["t2"]);
		expect(result.completed[0]).toEqual({ id: "t1", name: "T1", status: "completed" });
	});

	it("moveBetween prepends to the target column", () => {
		const result = verbs.moveBetween("t3", "assigned")(seed(), NO_KEY);
		expect(result.assigned.map((t) => t.id)).toEqual(["t3", "t1", "t2"]);
		expect(result.in_progress).toEqual([]);
	});

	it("moveBetween is a no-op when the item is missing", () => {
		const before = seed();
		const result = verbs.moveBetween("missing", "completed")(before, NO_KEY);
		expect(result).toEqual(before);
	});

	it("perColumn applies a per-column transform", () => {
		const result = verbs.perColumn((items, column) => items.map((t) => ({ ...t, name: `${column}:${t.name}` })))(
			seed(),
			NO_KEY,
		);
		expect(result.assigned[0].name).toBe("assigned:T1");
		expect(result.in_progress[0].name).toBe("in_progress:T3");
	});
});
