import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/test-utils";
import type { FoldersClient } from "./clients/folders-client";
import { NotFoundError } from "./errors";
import { fakeFoldersClient, TestClientsProvider } from "./test-clients-provider";
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

function wrapperFactory(client: FoldersClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ folders: client }}>
			{children}
		</TestClientsProvider>
	);
}

beforeEach(() => {
	queryClient = createTestQueryClient();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("nextUnusedColor", () => {
	it("returns first color when no folders exist", () => {
		expect(nextUnusedColor([])).toBe(FOLDER_COLORS[0]);
	});

	it("returns first unused color from palette", () => {
		expect(nextUnusedColor([{ id: "1", name: "A", color: "red" }])).toBe("orange");
	});

	it("cycles when all colors are used", () => {
		const folders = FOLDER_COLORS.map((color, i) => ({ id: `${i}`, name: `F${i}`, color }));
		expect(FOLDER_COLORS).toContain(nextUnusedColor(folders));
	});
});

describe("useFolders", () => {
	it("fetches folders from the client", async () => {
		const list = vi.fn().mockResolvedValue(MOCK_FOLDERS);
		const client = fakeFoldersClient({ list });

		const { result } = renderHook(() => useFolders(), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.data).toEqual(MOCK_FOLDERS));
		expect(list).toHaveBeenCalledTimes(1);
	});

	it("returns loading state initially", () => {
		const client = fakeFoldersClient({ list: () => new Promise<Folder[]>(() => {}) });
		const { result } = renderHook(() => useFolders(), { wrapper: wrapperFactory(client) });
		expect(result.current.isLoading).toBe(true);
	});

	it("surfaces errors from the client", async () => {
		const client = fakeFoldersClient({ list: () => Promise.reject(new Error("boom")) });
		const { result } = renderHook(() => useFolders(), { wrapper: wrapperFactory(client) });
		await waitFor(() => expect(result.current.isError).toBe(true));
	});

	it("scopes cache by company param", async () => {
		const list = vi.fn().mockResolvedValueOnce([MOCK_FOLDERS[0]]).mockResolvedValueOnce([MOCK_FOLDERS[1]]);
		const client = fakeFoldersClient({ list });

		const a = renderHook(() => useFolders("c1"), { wrapper: wrapperFactory(client) });
		const b = renderHook(() => useFolders("c2"), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(a.result.current.data).toEqual([MOCK_FOLDERS[0]]);
			expect(b.result.current.data).toEqual([MOCK_FOLDERS[1]]);
		});
		expect(list).toHaveBeenCalledTimes(2);
	});
});

describe("useFolderStats", () => {
	it("transforms server response into { all, none, folderId, archive } counts", async () => {
		const stats = vi.fn().mockResolvedValue({
			stats: [
				{ folderId: null, itemCount: 1 },
				{ folderId: "f1", itemCount: 2 },
				{ folderId: "f2", itemCount: 1 },
			],
			archiveCount: 1,
		});
		const client = fakeFoldersClient({ stats });

		const { result } = renderHook(() => useFolderStats(), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.data).toBeTruthy());
		expect(result.current.data).toMatchObject({
			all: 4,
			none: 1,
			f1: 2,
			f2: 1,
			archive: 1,
		});
	});

	it("threads company param through to the client", async () => {
		const stats = vi.fn().mockResolvedValue({ stats: [], archiveCount: 0 });
		const client = fakeFoldersClient({ stats });

		renderHook(() => useFolderStats("c2"), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(stats).toHaveBeenCalledWith({ company: "c2" }));
	});
});

describe("useCreateFolder", () => {
	it("calls client.create and triggers folders refetch", async () => {
		const create = vi.fn().mockResolvedValue({ id: "f3", name: "New", color: "red" });
		const list = vi.fn().mockResolvedValue(MOCK_FOLDERS);
		const client = fakeFoldersClient({ create, list });

		// seed the cache so we can observe optimistic update + invalidation
		queryClient.setQueryData(["folders", { company: undefined }], MOCK_FOLDERS);
		const { result } = renderHook(() => useCreateFolder(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync({ name: "New", color: "red" });
		});

		expect(create).toHaveBeenCalledWith({ name: "New", color: "red" });
	});

	it("optimistically appends the folder to cached lists before the server responds", async () => {
		queryClient.setQueryData<Folder[]>(["folders", { company: undefined }], MOCK_FOLDERS);
		const create = vi.fn(
			() =>
				new Promise<Folder>((resolve) => setTimeout(() => resolve({ id: "new-id", name: "New", color: "red" }), 50)),
		);
		const list = vi.fn().mockResolvedValue(MOCK_FOLDERS);
		const client = fakeFoldersClient({ create, list });

		const { result } = renderHook(() => useCreateFolder(), { wrapper: wrapperFactory(client) });

		act(() => {
			result.current.mutate({ name: "New", color: "red" });
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<Folder[]>(["folders", { company: undefined }]);
			expect(data).toHaveLength(3);
			expect(data?.[2].name).toBe("New");
		});
	});

	it("rolls back optimistic state on error and shows toast", async () => {
		const { toast } = await import("sonner");
		queryClient.setQueryData<Folder[]>(["folders", { company: undefined }], MOCK_FOLDERS);
		const client = fakeFoldersClient({ create: () => Promise.reject(new Error("dup")) });

		const { result } = renderHook(() => useCreateFolder(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			try {
				await result.current.mutateAsync({ name: "Dup", color: "red" });
			} catch {}
		});

		const data = queryClient.getQueryData<Folder[]>(["folders", { company: undefined }]);
		expect(data).toEqual(MOCK_FOLDERS);
		expect(toast.error).toHaveBeenCalled();
	});
});

describe("useUpdateFolder", () => {
	it("optimistically renames in cache", async () => {
		queryClient.setQueryData<Folder[]>(["folders", { company: undefined }], MOCK_FOLDERS);
		const update = vi.fn(
			() =>
				new Promise<Folder>((resolve) => setTimeout(() => resolve({ id: "f1", name: "Renamed", color: "blue" }), 50)),
		);
		const client = fakeFoldersClient({ update });

		const { result } = renderHook(() => useUpdateFolder(), { wrapper: wrapperFactory(client) });

		act(() => {
			result.current.mutate({ id: "f1", name: "Renamed" });
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<Folder[]>(["folders", { company: undefined }]);
			expect(data?.find((f) => f.id === "f1")?.name).toBe("Renamed");
		});
		expect(update).toHaveBeenCalledWith("f1", { name: "Renamed" });
	});

	it("optimistically recolors in cache", async () => {
		queryClient.setQueryData<Folder[]>(["folders", { company: undefined }], MOCK_FOLDERS);
		const update = vi.fn(
			() =>
				new Promise<Folder>((resolve) =>
					setTimeout(() => resolve({ id: "f1", name: "Металлопрокат", color: "pink" }), 50),
				),
		);
		const client = fakeFoldersClient({ update });

		const { result } = renderHook(() => useUpdateFolder(), { wrapper: wrapperFactory(client) });

		act(() => {
			result.current.mutate({ id: "f1", color: "pink" });
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<Folder[]>(["folders", { company: undefined }]);
			expect(data?.find((f) => f.id === "f1")?.color).toBe("pink");
		});
	});

	it("rolls back on error and shows toast", async () => {
		const { toast } = await import("sonner");
		queryClient.setQueryData<Folder[]>(["folders", { company: undefined }], MOCK_FOLDERS);
		const client = fakeFoldersClient({ update: () => Promise.reject(new Error("dup")) });

		const { result } = renderHook(() => useUpdateFolder(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "f1", name: "Стройматериалы" });
			} catch {}
		});

		const data = queryClient.getQueryData<Folder[]>(["folders", { company: undefined }]);
		expect(data?.find((f) => f.id === "f1")?.name).toBe("Металлопрокат");
		expect(toast.error).toHaveBeenCalled();
	});

	it("surfaces NotFoundError thrown by the client", async () => {
		const client = fakeFoldersClient({ update: () => Promise.reject(new NotFoundError({ id: "f99" })) });

		const { result } = renderHook(() => useUpdateFolder(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "f99", name: "Nope" });
				throw new Error("expected throw");
			} catch (err) {
				expect(err).toBeInstanceOf(NotFoundError);
			}
		});
	});
});

describe("useDeleteFolder", () => {
	it("optimistically removes folder from cache", async () => {
		queryClient.setQueryData<Folder[]>(["folders", { company: undefined }], MOCK_FOLDERS);
		const del = vi.fn(() => new Promise<void>((resolve) => setTimeout(() => resolve(), 50)));
		const client = fakeFoldersClient({ delete: del });

		const { result } = renderHook(() => useDeleteFolder(), { wrapper: wrapperFactory(client) });

		act(() => {
			result.current.mutate("f1");
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<Folder[]>(["folders", { company: undefined }]);
			expect(data).toHaveLength(1);
			expect(data?.[0].id).toBe("f2");
		});
		expect(del).toHaveBeenCalledWith("f1");
	});

	it("rolls back on error and shows toast", async () => {
		const { toast } = await import("sonner");
		queryClient.setQueryData<Folder[]>(["folders", { company: undefined }], MOCK_FOLDERS);
		const client = fakeFoldersClient({ delete: () => Promise.reject(new Error("fail")) });

		const { result } = renderHook(() => useDeleteFolder(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			try {
				await result.current.mutateAsync("f1");
			} catch {}
		});

		const data = queryClient.getQueryData<Folder[]>(["folders", { company: undefined }]);
		expect(data).toEqual(MOCK_FOLDERS);
		expect(toast.error).toHaveBeenCalled();
	});

	it("invalidates items cache after delete (cross-domain refresh)", async () => {
		const del = vi.fn().mockResolvedValue(undefined);
		const client = fakeFoldersClient({ delete: del });

		queryClient.setQueryData<Folder[]>(["folders", { company: undefined }], MOCK_FOLDERS);
		queryClient.setQueryData(["items", { folder: "f1" }], { items: [], nextCursor: null });

		const { result } = renderHook(() => useDeleteFolder(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync("f1");
		});

		await waitFor(() => {
			const state = queryClient.getQueryState(["items", { folder: "f1" }]);
			expect(state?.isInvalidated).toBe(true);
		});
	});
});
