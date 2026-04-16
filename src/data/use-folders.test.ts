import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper, createTestQueryClient, makeItem, mockHostname } from "@/test-utils";
import { setTokens } from "./auth";
import * as foldersMock from "./folders-mock-data";
import { _resetItemsStore, _setItems } from "./items-mock-data";
import type { Folder } from "./types";
import { FOLDER_COLORS } from "./types";
import {
	nextUnusedColor,
	useCreateFolder,
	useDeleteFolder,
	useFolderStats,
	useFolders,
	useUpdateFolder,
} from "./use-folders";

vi.mock("sonner", () => ({
	toast: { error: vi.fn() },
}));

const MOCK_FOLDERS: Folder[] = [
	{ id: "f1", name: "Металлопрокат", color: "blue" },
	{ id: "f2", name: "Стройматериалы", color: "green" },
];

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	setTokens("test-jwt", "test-refresh");
	foldersMock._resetFoldersStore();
	_resetItemsStore();
});

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("nextUnusedColor", () => {
	it("returns first color when no folders exist", () => {
		expect(nextUnusedColor([])).toBe(FOLDER_COLORS[0]);
	});

	it("returns first unused color from palette", () => {
		const folders = [{ id: "1", name: "A", color: "red" }];
		expect(nextUnusedColor(folders)).toBe("orange");
	});

	it("cycles when all colors are used", () => {
		const folders = FOLDER_COLORS.map((color, i) => ({ id: `${i}`, name: `F${i}`, color }));
		const result = nextUnusedColor(folders);
		expect(FOLDER_COLORS).toContain(result);
	});
});

describe("useFolders", () => {
	it("returns seeded folders", async () => {
		foldersMock._setFolders(MOCK_FOLDERS);

		const { result } = renderHook(() => useFolders(), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.data).toEqual(MOCK_FOLDERS);
		});
	});

	it("returns loading state initially", () => {
		foldersMock._setFolders(MOCK_FOLDERS);
		const { result } = renderHook(() => useFolders(), { wrapper: createQueryWrapper(queryClient) });
		expect(result.current.isLoading).toBe(true);
	});

	it("returns error state when mock throws", async () => {
		vi.spyOn(foldersMock, "fetchFoldersMock").mockRejectedValue(new Error("boom"));

		const { result } = renderHook(() => useFolders(), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
	});
});

describe("useFolderStats", () => {
	it("transforms stats into { all, none, folderId, archive } counts", async () => {
		foldersMock._setFolders(MOCK_FOLDERS);
		_setItems(
			[
				makeItem("a", { folderId: "f1" }),
				makeItem("b", { folderId: "f1" }),
				makeItem("c", { folderId: "f2" }),
				makeItem("d", { folderId: null }),
				makeItem("arc", { folderId: null }),
			],
			["arc"],
		);

		const { result } = renderHook(() => useFolderStats(), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.data).toBeTruthy();
		});
		expect(result.current.data).toMatchObject({
			all: 4,
			none: 1,
			f1: 2,
			f2: 1,
			archive: 1,
		});
	});

	it("returns loading state initially", () => {
		foldersMock._setFolders(MOCK_FOLDERS);
		const { result } = renderHook(() => useFolderStats(), { wrapper: createQueryWrapper(queryClient) });
		expect(result.current.isLoading).toBe(true);
	});
});

describe("useCreateFolder", () => {
	it("creates folder via mock store", async () => {
		foldersMock._setFolders(MOCK_FOLDERS);

		const { result } = renderHook(() => useCreateFolder(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			await result.current.mutateAsync({ name: "New", color: "red" });
		});

		const folders = foldersMock._getFolders();
		expect(folders.find((f) => f.name === "New")?.color).toBe("red");
	});

	it("optimistically adds folder to cache before server responds", async () => {
		queryClient.setQueryData(["folders"], { folders: MOCK_FOLDERS });
		foldersMock._setFolders(MOCK_FOLDERS);

		vi.spyOn(foldersMock, "createFolderMock").mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve({ id: "new-id", name: "New", color: "red" }), 50)),
		);

		const { result } = renderHook(() => useCreateFolder(), { wrapper: createQueryWrapper(queryClient) });

		act(() => {
			result.current.mutate({ name: "New", color: "red" });
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<{ folders: Folder[] }>(["folders"]);
			expect(data?.folders).toHaveLength(3);
			expect(data?.folders[2].name).toBe("New");
			expect(data?.folders[2].color).toBe("red");
		});
	});

	it("rolls back on error and shows toast", async () => {
		const { toast } = await import("sonner");
		queryClient.setQueryData(["folders"], { folders: MOCK_FOLDERS });
		foldersMock._setFolders(MOCK_FOLDERS);

		vi.spyOn(foldersMock, "createFolderMock").mockRejectedValue(new Error("dup"));

		const { result } = renderHook(() => useCreateFolder(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			try {
				await result.current.mutateAsync({ name: "Dup", color: "red" });
			} catch {}
		});

		const data = queryClient.getQueryData<{ folders: Folder[] }>(["folders"]);
		expect(data?.folders).toHaveLength(2);
		expect(toast.error).toHaveBeenCalled();
	});
});

describe("useUpdateFolder", () => {
	it("updates the folder via mock store", async () => {
		foldersMock._setFolders(MOCK_FOLDERS);

		const { result } = renderHook(() => useUpdateFolder(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			await result.current.mutateAsync({ id: "f1", name: "Renamed" });
		});

		expect(foldersMock._getFolders().find((f) => f.id === "f1")?.name).toBe("Renamed");
	});

	it("optimistically updates folder in cache", async () => {
		queryClient.setQueryData(["folders"], { folders: MOCK_FOLDERS });
		foldersMock._setFolders(MOCK_FOLDERS);

		vi.spyOn(foldersMock, "updateFolderMock").mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve({ id: "f1", name: "Renamed", color: "blue" }), 50)),
		);

		const { result } = renderHook(() => useUpdateFolder(), { wrapper: createQueryWrapper(queryClient) });

		act(() => {
			result.current.mutate({ id: "f1", name: "Renamed" });
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<{ folders: Folder[] }>(["folders"]);
			expect(data?.folders.find((f) => f.id === "f1")?.name).toBe("Renamed");
		});
	});

	it("optimistically recolors folder in cache", async () => {
		queryClient.setQueryData(["folders"], { folders: MOCK_FOLDERS });
		foldersMock._setFolders(MOCK_FOLDERS);

		vi.spyOn(foldersMock, "updateFolderMock").mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve({ id: "f1", name: "Металлопрокат", color: "pink" }), 50)),
		);

		const { result } = renderHook(() => useUpdateFolder(), { wrapper: createQueryWrapper(queryClient) });

		act(() => {
			result.current.mutate({ id: "f1", color: "pink" });
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<{ folders: Folder[] }>(["folders"]);
			expect(data?.folders.find((f) => f.id === "f1")?.color).toBe("pink");
		});
	});

	it("rolls back on error and shows toast", async () => {
		const { toast } = await import("sonner");
		queryClient.setQueryData(["folders"], { folders: MOCK_FOLDERS });
		foldersMock._setFolders(MOCK_FOLDERS);

		vi.spyOn(foldersMock, "updateFolderMock").mockRejectedValue(new Error("dup"));

		const { result } = renderHook(() => useUpdateFolder(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "f1", name: "Стройматериалы" });
			} catch {}
		});

		const data = queryClient.getQueryData<{ folders: Folder[] }>(["folders"]);
		expect(data?.folders.find((f) => f.id === "f1")?.name).toBe("Металлопрокат");
		expect(toast.error).toHaveBeenCalled();
	});
});

describe("useDeleteFolder", () => {
	it("removes folder via mock store", async () => {
		foldersMock._setFolders(MOCK_FOLDERS);

		const { result } = renderHook(() => useDeleteFolder(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			await result.current.mutateAsync("f1");
		});

		expect(foldersMock._getFolders().map((f) => f.id)).toEqual(["f2"]);
	});

	it("optimistically removes folder from cache", async () => {
		queryClient.setQueryData(["folders"], { folders: MOCK_FOLDERS });
		foldersMock._setFolders(MOCK_FOLDERS);

		vi.spyOn(foldersMock, "deleteFolderMock").mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve(), 50)),
		);

		const { result } = renderHook(() => useDeleteFolder(), { wrapper: createQueryWrapper(queryClient) });

		act(() => {
			result.current.mutate("f1");
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<{ folders: Folder[] }>(["folders"]);
			expect(data?.folders).toHaveLength(1);
			expect(data?.folders[0].id).toBe("f2");
		});
	});

	it("rolls back on error and shows toast", async () => {
		const { toast } = await import("sonner");
		queryClient.setQueryData(["folders"], { folders: MOCK_FOLDERS });
		foldersMock._setFolders(MOCK_FOLDERS);

		vi.spyOn(foldersMock, "deleteFolderMock").mockRejectedValue(new Error("fail"));

		const { result } = renderHook(() => useDeleteFolder(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			try {
				await result.current.mutateAsync("f1");
			} catch {}
		});

		const data = queryClient.getQueryData<{ folders: Folder[] }>(["folders"]);
		expect(data?.folders).toHaveLength(2);
		expect(toast.error).toHaveBeenCalled();
	});
});
