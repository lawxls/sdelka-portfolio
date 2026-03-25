import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test-msw";
import { createQueryWrapper, createTestQueryClient, mockHostname } from "@/test-utils";
import { setToken } from "./auth";
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

const MOCK_STATS = [
	{ folderId: "f1", itemCount: 10 },
	{ folderId: "f2", itemCount: 5 },
	{ folderId: null, itemCount: 20 },
];

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	setToken("test-jwt");
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
	it("fetches folder list from API", async () => {
		server.use(http.get("/api/v1/company/folders/", () => HttpResponse.json({ folders: MOCK_FOLDERS })));

		const { result } = renderHook(() => useFolders(), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.data).toEqual(MOCK_FOLDERS);
		});
	});

	it("returns loading state initially", () => {
		server.use(
			http.get("/api/v1/company/folders/", async () => {
				await delay(1000);
				return HttpResponse.json({ folders: MOCK_FOLDERS });
			}),
		);

		const { result } = renderHook(() => useFolders(), { wrapper: createQueryWrapper(queryClient) });
		expect(result.current.isLoading).toBe(true);
	});

	it("returns error state on failure", async () => {
		server.use(http.get("/api/v1/company/folders/", () => HttpResponse.json({}, { status: 500 })));

		const { result } = renderHook(() => useFolders(), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
	});
});

describe("useFolderStats", () => {
	it("fetches and transforms stats to counts format", async () => {
		server.use(
			http.get("/api/v1/company/folders/stats", () => HttpResponse.json({ stats: MOCK_STATS, archiveCount: 3 })),
		);

		const { result } = renderHook(() => useFolderStats(), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.data).toEqual({
				all: 35,
				none: 20,
				f1: 10,
				f2: 5,
				archive: 3,
			});
		});
	});

	it("returns loading state initially", () => {
		server.use(
			http.get("/api/v1/company/folders/stats", async () => {
				await delay(1000);
				return HttpResponse.json({ stats: MOCK_STATS });
			}),
		);

		const { result } = renderHook(() => useFolderStats(), { wrapper: createQueryWrapper(queryClient) });
		expect(result.current.isLoading).toBe(true);
	});
});

describe("useCreateFolder", () => {
	it("sends POST with name and color", async () => {
		let capturedBody: unknown;

		server.use(
			http.post("/api/v1/company/folders/", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ id: "new-id", name: "New", color: "red" }, { status: 201 });
			}),
			http.get("/api/v1/company/folders/", () => HttpResponse.json({ folders: MOCK_FOLDERS })),
			http.get("/api/v1/company/folders/stats", () => HttpResponse.json({ stats: MOCK_STATS })),
		);

		const { result } = renderHook(() => useCreateFolder(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			await result.current.mutateAsync({ name: "New", color: "red" });
		});

		expect(capturedBody).toEqual({ name: "New", color: "red" });
	});

	it("optimistically adds folder to cache before server responds", async () => {
		queryClient.setQueryData(["folders"], { folders: MOCK_FOLDERS });

		server.use(
			http.post("/api/v1/company/folders/", async () => {
				await delay(5000);
				return HttpResponse.json({ id: "new-id", name: "New", color: "red" }, { status: 201 });
			}),
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

		server.use(
			http.post("/api/v1/company/folders/", () => HttpResponse.json({ name: ["Already exists."] }, { status: 400 })),
		);

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
	it("sends PATCH with partial data", async () => {
		let capturedBody: unknown;

		server.use(
			http.patch("/api/v1/company/folders/:id/", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ id: "f1", name: "Renamed", color: "blue" });
			}),
			http.get("/api/v1/company/folders/", () => HttpResponse.json({ folders: MOCK_FOLDERS })),
			http.get("/api/v1/company/folders/stats", () => HttpResponse.json({ stats: MOCK_STATS })),
		);

		const { result } = renderHook(() => useUpdateFolder(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			await result.current.mutateAsync({ id: "f1", name: "Renamed" });
		});

		expect(capturedBody).toEqual({ name: "Renamed" });
	});

	it("optimistically updates folder in cache", async () => {
		queryClient.setQueryData(["folders"], { folders: MOCK_FOLDERS });

		server.use(
			http.patch("/api/v1/company/folders/:id/", async () => {
				await delay(5000);
				return HttpResponse.json({ id: "f1", name: "Renamed", color: "blue" });
			}),
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

		server.use(
			http.patch("/api/v1/company/folders/:id/", async () => {
				await delay(5000);
				return HttpResponse.json({ id: "f1", name: "Металлопрокат", color: "pink" });
			}),
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

		server.use(
			http.patch("/api/v1/company/folders/:id/", () =>
				HttpResponse.json({ name: ["Already exists."] }, { status: 400 }),
			),
		);

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
	it("sends DELETE request", async () => {
		let capturedId: string | undefined;

		server.use(
			http.delete("/api/v1/company/folders/:id/", ({ params }) => {
				capturedId = params.id as string;
				return new HttpResponse(null, { status: 204 });
			}),
			http.get("/api/v1/company/folders/", () => HttpResponse.json({ folders: MOCK_FOLDERS })),
			http.get("/api/v1/company/folders/stats", () => HttpResponse.json({ stats: MOCK_STATS })),
		);

		const { result } = renderHook(() => useDeleteFolder(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			await result.current.mutateAsync("f1");
		});

		expect(capturedId).toBe("f1");
	});

	it("optimistically removes folder from cache", async () => {
		queryClient.setQueryData(["folders"], { folders: MOCK_FOLDERS });

		server.use(
			http.delete("/api/v1/company/folders/:id/", async () => {
				await delay(5000);
				return new HttpResponse(null, { status: 204 });
			}),
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

		server.use(http.delete("/api/v1/company/folders/:id/", () => HttpResponse.json({}, { status: 500 })));

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
