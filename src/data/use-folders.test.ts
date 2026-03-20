import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { mockProcurementItems, SEED_FOLDER_ASSIGNMENTS, SEED_FOLDERS } from "./mock-data";
import { FOLDER_COLORS } from "./types";
import { useFolders } from "./use-folders";

const LS_FOLDERS_KEY = "folders";
const LS_ASSIGNMENTS_KEY = "folder-assignments";

function readStoredFolders() {
	return JSON.parse(localStorage.getItem(LS_FOLDERS_KEY) ?? "null");
}

function readStoredAssignments() {
	return JSON.parse(localStorage.getItem(LS_ASSIGNMENTS_KEY) ?? "null");
}

afterEach(() => {
	localStorage.clear();
});

describe("useFolders", () => {
	describe("seed fallback", () => {
		it("returns seed folders when localStorage is empty", () => {
			const { result } = renderHook(() => useFolders());
			expect(result.current.folders).toEqual(SEED_FOLDERS);
		});

		it("returns seed assignments when localStorage is empty", () => {
			const { result } = renderHook(() => useFolders());
			const items = result.current.applyFolders(mockProcurementItems);
			const assigned = items.filter((i) => i.folderId != null);
			expect(assigned.length).toBe(Object.keys(SEED_FOLDER_ASSIGNMENTS).length);
		});
	});

	describe("localStorage persistence", () => {
		it("reads folders from localStorage", () => {
			const custom = [{ id: "f1", name: "Custom", color: "red" }];
			localStorage.setItem(LS_FOLDERS_KEY, JSON.stringify(custom));
			const { result } = renderHook(() => useFolders());
			expect(result.current.folders).toEqual(custom);
		});

		it("reads assignments from localStorage", () => {
			localStorage.setItem(LS_ASSIGNMENTS_KEY, JSON.stringify({ "item-1": "f1" }));
			localStorage.setItem(LS_FOLDERS_KEY, JSON.stringify([{ id: "f1", name: "X", color: "red" }]));
			const { result } = renderHook(() => useFolders());
			const items = result.current.applyFolders(mockProcurementItems);
			expect(items.find((i) => i.id === "item-1")?.folderId).toBe("f1");
		});

		it("persists folders to localStorage on create", () => {
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.createFolder("Новая");
			});
			const stored = readStoredFolders();
			expect(stored).toHaveLength(SEED_FOLDERS.length + 1);
			expect(stored.at(-1).name).toBe("Новая");
		});

		it("persists assignments to localStorage on assign", () => {
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.assignItem("item-70", "folder-1");
			});
			const stored = readStoredAssignments();
			expect(stored["item-70"]).toBe("folder-1");
		});
	});

	describe("createFolder", () => {
		it("adds a folder with auto-assigned color", () => {
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.createFolder("Тест");
			});
			const created = result.current.folders.find((f) => f.name === "Тест");
			expect(created).toBeDefined();
			expect(FOLDER_COLORS).toContain(created?.color);
		});

		it("auto-assigns next unused color from palette", () => {
			const { result } = renderHook(() => useFolders());
			// Seed uses blue, green, orange, purple. Next unused should be red, yellow, pink, or teal.
			const seedColors = new Set(SEED_FOLDERS.map((f) => f.color));
			act(() => {
				result.current.createFolder("Авто-цвет");
			});
			const created = result.current.folders.find((f) => f.name === "Авто-цвет");
			expect(created).toBeDefined();
			expect(seedColors.has(created?.color ?? "")).toBe(false);
		});

		it("cycles colors when all are used", () => {
			const { result } = renderHook(() => useFolders());
			// Create enough folders to exhaust palette
			const toCreate = FOLDER_COLORS.length - SEED_FOLDERS.length + 1;
			act(() => {
				for (let i = 0; i < toCreate; i++) {
					result.current.createFolder(`Папка ${i}`);
				}
			});
			const lastCreated = result.current.folders.at(-1);
			expect(FOLDER_COLORS).toContain(lastCreated?.color);
		});

		it("returns null for duplicate name", () => {
			const { result } = renderHook(() => useFolders());
			const countBefore = result.current.folders.length;
			act(() => {
				result.current.createFolder(SEED_FOLDERS[0].name);
			});
			// Folder count unchanged = creation was rejected
			expect(result.current.folders.length).toBe(countBefore);
		});

		it("duplicate check is case-insensitive", () => {
			const { result } = renderHook(() => useFolders());
			const countBefore = result.current.folders.length;
			act(() => {
				result.current.createFolder(SEED_FOLDERS[0].name.toUpperCase());
			});
			expect(result.current.folders.length).toBe(countBefore);
		});

		it("generates unique id via crypto.randomUUID", () => {
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.createFolder("А");
			});
			act(() => {
				result.current.createFolder("Б");
			});
			const a = result.current.folders.find((f) => f.name === "А");
			const b = result.current.folders.find((f) => f.name === "Б");
			expect(a?.id).toBeDefined();
			expect(b?.id).toBeDefined();
			expect(a?.id).not.toBe(b?.id);
		});
	});

	describe("renameFolder", () => {
		it("renames a folder", () => {
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.renameFolder(SEED_FOLDERS[0].id, "Новое имя");
			});
			expect(result.current.folders.find((f) => f.id === SEED_FOLDERS[0].id)?.name).toBe("Новое имя");
		});

		it("returns false for duplicate name", () => {
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.renameFolder(SEED_FOLDERS[0].id, SEED_FOLDERS[1].name);
			});
			// Name unchanged = rename was rejected
			expect(result.current.folders.find((f) => f.id === SEED_FOLDERS[0].id)?.name).toBe(SEED_FOLDERS[0].name);
		});

		it("allows renaming to same name (own name)", () => {
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.renameFolder(SEED_FOLDERS[0].id, SEED_FOLDERS[0].name);
			});
			expect(result.current.folders.find((f) => f.id === SEED_FOLDERS[0].id)?.name).toBe(SEED_FOLDERS[0].name);
		});

		it("persists rename to localStorage", () => {
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.renameFolder(SEED_FOLDERS[0].id, "Renamed");
			});
			const stored = readStoredFolders();
			expect(stored.find((f: { id: string }) => f.id === SEED_FOLDERS[0].id).name).toBe("Renamed");
		});
	});

	describe("recolorFolder", () => {
		it("changes folder color", () => {
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.recolorFolder(SEED_FOLDERS[0].id, "pink");
			});
			expect(result.current.folders.find((f) => f.id === SEED_FOLDERS[0].id)?.color).toBe("pink");
		});

		it("persists recolor to localStorage", () => {
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.recolorFolder(SEED_FOLDERS[0].id, "teal");
			});
			const stored = readStoredFolders();
			expect(stored.find((f: { id: string }) => f.id === SEED_FOLDERS[0].id).color).toBe("teal");
		});
	});

	describe("deleteFolder", () => {
		it("removes the folder", () => {
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.deleteFolder(SEED_FOLDERS[0].id);
			});
			expect(result.current.folders.find((f) => f.id === SEED_FOLDERS[0].id)).toBeUndefined();
		});

		it("unassigns items from deleted folder", () => {
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.deleteFolder(SEED_FOLDERS[0].id);
			});
			const items = result.current.applyFolders(mockProcurementItems);
			// item-1 was in folder-1 (seed)
			expect(items.find((i) => i.id === "item-1")?.folderId).toBeNull();
		});

		it("persists deletion to localStorage", () => {
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.deleteFolder(SEED_FOLDERS[0].id);
			});
			const stored = readStoredFolders();
			expect(stored.find((f: { id: string }) => f.id === SEED_FOLDERS[0].id)).toBeUndefined();
		});
	});

	describe("assignItem", () => {
		it("assigns item to folder", () => {
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.assignItem("item-70", "folder-2");
			});
			const items = result.current.applyFolders(mockProcurementItems);
			expect(items.find((i) => i.id === "item-70")?.folderId).toBe("folder-2");
		});

		it("unassigns item when folderId is null", () => {
			const { result } = renderHook(() => useFolders());
			// item-1 starts assigned to folder-1 via seed
			act(() => {
				result.current.assignItem("item-1", null);
			});
			const items = result.current.applyFolders(mockProcurementItems);
			expect(items.find((i) => i.id === "item-1")?.folderId).toBeNull();
		});
	});

	describe("applyFolders", () => {
		it("sets folderId on items based on assignments", () => {
			const { result } = renderHook(() => useFolders());
			const items = result.current.applyFolders(mockProcurementItems);
			expect(items.find((i) => i.id === "item-1")?.folderId).toBe("folder-1");
			expect(items.find((i) => i.id === "item-8")?.folderId).toBe("folder-2");
		});

		it("leaves unassigned items with folderId null", () => {
			const { result } = renderHook(() => useFolders());
			const items = result.current.applyFolders(mockProcurementItems);
			const unassignedIds = mockProcurementItems.filter((i) => !(i.id in SEED_FOLDER_ASSIGNMENTS)).map((i) => i.id);
			for (const id of unassignedIds) {
				expect(items.find((i) => i.id === id)?.folderId).toBeNull();
			}
		});

		it("does not mutate original items", () => {
			const { result } = renderHook(() => useFolders());
			const original = mockProcurementItems[0].folderId;
			result.current.applyFolders(mockProcurementItems);
			expect(mockProcurementItems[0].folderId).toBe(original);
		});
	});

	describe("counts", () => {
		it("computes counts per folder from all items", () => {
			const { result } = renderHook(() => useFolders());
			const counts = result.current.counts;
			// folder-1 has 9 items in seed
			expect(counts["folder-1"]).toBe(9);
		});

		it("includes total count", () => {
			const { result } = renderHook(() => useFolders());
			expect(result.current.counts.all).toBe(mockProcurementItems.length);
		});

		it("includes unassigned count", () => {
			const { result } = renderHook(() => useFolders());
			const assignedCount = Object.keys(SEED_FOLDER_ASSIGNMENTS).length;
			expect(result.current.counts.none).toBe(mockProcurementItems.length - assignedCount);
		});

		it("updates counts after assignment", () => {
			const { result } = renderHook(() => useFolders());
			const before = result.current.counts["folder-1"];
			act(() => {
				result.current.assignItem("item-70", "folder-1");
			});
			expect(result.current.counts["folder-1"]).toBe(before + 1);
		});

		it("updates counts after folder deletion", () => {
			const { result } = renderHook(() => useFolders());
			const folder1Count = result.current.counts["folder-1"];
			const noneBefore = result.current.counts.none;
			act(() => {
				result.current.deleteFolder("folder-1");
			});
			expect(result.current.counts["folder-1"]).toBeUndefined();
			expect(result.current.counts.none).toBe(noneBefore + folder1Count);
		});
	});

	describe("auto-color assignment", () => {
		it("assigns first unused color from FOLDER_COLORS order", () => {
			localStorage.clear();
			// Start fresh with no folders
			localStorage.setItem(LS_FOLDERS_KEY, JSON.stringify([]));
			localStorage.setItem(LS_ASSIGNMENTS_KEY, JSON.stringify({}));
			const { result } = renderHook(() => useFolders());
			act(() => {
				result.current.createFolder("Первая");
			});
			const created = result.current.folders.find((f) => f.name === "Первая");
			expect(created?.color).toBe(FOLDER_COLORS[0]);
		});
	});
});
