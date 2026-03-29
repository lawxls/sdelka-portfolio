import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper, createTestQueryClient, makeTask } from "@/test-utils";
import * as taskMockData from "./task-mock-data";
import { _resetTaskStore, _setMockDelay } from "./task-mock-data";
import type { Task } from "./task-types";
import {
	useAllTasks,
	useProcurementItems,
	useSubmitAnswer,
	useTask,
	useTaskColumns,
	useUpdateTaskStatus,
} from "./use-tasks";

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

type TasksCache = {
	pages: Array<{ tasks: Task[]; nextCursor: string | null }>;
	pageParams: Array<string | undefined>;
};

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	_resetTaskStore();
	_setMockDelay(0, 0);
});

afterEach(() => {
	vi.restoreAllMocks();
});

function seedTasks(status: string, tasks: Task[]) {
	queryClient.setQueryData(["tasks", status, {}], {
		pages: [{ tasks, nextCursor: null }],
		pageParams: [undefined],
	});
}

describe("useTaskColumns", () => {
	it("fetches tasks for all 4 statuses", async () => {
		const { result } = renderHook(() => useTaskColumns(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.assigned.tasks.length).toBeGreaterThan(0);
			expect(result.current.in_progress.tasks.length).toBeGreaterThan(0);
			expect(result.current.completed.tasks.length).toBeGreaterThan(0);
			expect(result.current.archived.tasks.length).toBeGreaterThan(0);
		});

		expect(result.current.assigned.tasks.every((t) => t.status === "assigned")).toBe(true);
		expect(result.current.in_progress.tasks.every((t) => t.status === "in_progress")).toBe(true);
		expect(result.current.completed.tasks.every((t) => t.status === "completed")).toBe(true);
		expect(result.current.archived.tasks.every((t) => t.status === "archived")).toBe(true);
	});

	it("returns loading state initially", () => {
		_setMockDelay(10000, 10000);
		const { result } = renderHook(() => useTaskColumns(), {
			wrapper: createQueryWrapper(queryClient),
		});
		expect(result.current.assigned.isLoading).toBe(true);
	});

	it("reports hasNextPage correctly", async () => {
		const { result } = renderHook(() => useTaskColumns(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.assigned.isLoading).toBe(false);
		});

		// 15 tasks per status, default limit 20 → all fit in one page
		expect(result.current.assigned.hasNextPage).toBe(false);
	});
});

describe("useTask", () => {
	it("returns a single task by id", async () => {
		const { result } = renderHook(() => useTask("task-1"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.data).toBeTruthy();
		});

		expect(result.current.data?.id).toBe("task-1");
		expect(result.current.data?.title).toBeTruthy();
	});

	it("does not fetch when id is null", () => {
		const { result } = renderHook(() => useTask(null), {
			wrapper: createQueryWrapper(queryClient),
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
	});
});

describe("useAllTasks", () => {
	it("fetches all tasks in a single paginated list", async () => {
		const { result } = renderHook(() => useAllTasks(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.tasks.length).toBeGreaterThan(0);
		});

		// All 60 tasks fetched (limit 20 default = first page of 20)
		expect(result.current.tasks).toHaveLength(20);
		// Should have more pages
		expect(result.current.hasNextPage).toBe(true);
	});

	it("returns loading state initially", () => {
		_setMockDelay(10000, 10000);
		const { result } = renderHook(() => useAllTasks(), {
			wrapper: createQueryWrapper(queryClient),
		});
		expect(result.current.isLoading).toBe(true);
	});
});

describe("useTaskColumns with filter params", () => {
	it("passes search param to API and returns filtered results", async () => {
		const { result } = renderHook(() => useTaskColumns({ q: "арматур" }), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.assigned.isLoading).toBe(false);
		});

		// Only tasks matching "арматур" in title or item name
		for (const task of result.current.assigned.tasks) {
			const matches =
				task.title.toLowerCase().includes("арматур") || task.procurementItemName.toLowerCase().includes("арматур");
			expect(matches).toBe(true);
		}
	});

	it("includes filter params in query key for cache isolation", async () => {
		// Fetch with no filter
		renderHook(() => useTaskColumns(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			const data = queryClient.getQueriesData({ queryKey: ["tasks", "assigned"] });
			expect(data.length).toBeGreaterThan(0);
		});

		// Fetch with search filter — should create a separate cache entry
		renderHook(() => useTaskColumns({ q: "арматур" }), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			const allEntries = queryClient.getQueriesData({ queryKey: ["tasks", "assigned"] });
			expect(allEntries.length).toBe(2);
		});
	});
});

describe("useAllTasks with filter params", () => {
	it("passes filter params to API", async () => {
		const { result } = renderHook(() => useAllTasks({ q: "арматур" }), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.tasks.length).toBeGreaterThan(0);
		});

		for (const task of result.current.tasks) {
			const matches =
				task.title.toLowerCase().includes("арматур") || task.procurementItemName.toLowerCase().includes("арматур");
			expect(matches).toBe(true);
		}
	});
});

describe("useProcurementItems", () => {
	it("returns unique sorted procurement item names", async () => {
		const { result } = renderHook(() => useProcurementItems(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.data?.length).toBeGreaterThan(0);
		});

		const items = result.current.data ?? [];
		expect(items.length).toBeGreaterThan(0);
		expect(new Set(items).size).toBe(items.length);
		for (let i = 1; i < items.length; i++) {
			expect(items[i - 1].localeCompare(items[i], "ru")).toBeLessThanOrEqual(0);
		}
	});
});

describe("useUpdateTaskStatus", () => {
	it("optimistically moves task between columns", async () => {
		seedTasks("assigned", [makeTask("t1", { status: "assigned" })]);
		seedTasks("in_progress", [makeTask("t2", { status: "in_progress" })]);

		vi.spyOn(taskMockData, "updateTaskStatus").mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve(makeTask("t1", { status: "in_progress" })), 5000)),
		);

		const { result } = renderHook(() => useUpdateTaskStatus(), {
			wrapper: createQueryWrapper(queryClient),
		});

		act(() => {
			result.current.mutate({ id: "t1", status: "in_progress" });
		});

		await waitFor(() => {
			const assigned = queryClient.getQueryData<TasksCache>(["tasks", "assigned", {}]);
			expect(assigned?.pages[0].tasks).toHaveLength(0);
		});

		const inProgress = queryClient.getQueryData<TasksCache>(["tasks", "in_progress", {}]);
		expect(inProgress?.pages[0].tasks).toHaveLength(2);
		expect(inProgress?.pages[0].tasks[0].id).toBe("t1");
		expect(inProgress?.pages[0].tasks[0].status).toBe("in_progress");
	});

	it("rolls back on error", async () => {
		const { toast } = await import("sonner");
		seedTasks("assigned", [makeTask("t1", { status: "assigned" })]);
		seedTasks("in_progress", []);

		vi.spyOn(taskMockData, "updateTaskStatus").mockRejectedValue(new Error("Network error"));

		const { result } = renderHook(() => useUpdateTaskStatus(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "t1", status: "in_progress" });
			} catch {}
		});

		const assigned = queryClient.getQueryData<TasksCache>(["tasks", "assigned", {}]);
		expect(assigned?.pages[0].tasks).toHaveLength(1);
		expect(assigned?.pages[0].tasks[0].id).toBe("t1");

		const inProgress = queryClient.getQueryData<TasksCache>(["tasks", "in_progress", {}]);
		expect(inProgress?.pages[0].tasks).toHaveLength(0);

		expect(toast.error).toHaveBeenCalled();
	});
});

describe("useSubmitAnswer", () => {
	it("optimistically moves task to completed with answer", async () => {
		seedTasks("assigned", [makeTask("t1", { status: "assigned" })]);
		seedTasks("completed", []);

		vi.spyOn(taskMockData, "submitAnswer").mockImplementation(
			() =>
				new Promise((resolve) =>
					setTimeout(
						() =>
							resolve(
								makeTask("t1", {
									status: "completed",
									answer: "Ответ",
									attachments: ["file.pdf"],
								}),
							),
						5000,
					),
				),
		);

		const { result } = renderHook(() => useSubmitAnswer(), {
			wrapper: createQueryWrapper(queryClient),
		});

		act(() => {
			result.current.mutate({ id: "t1", answer: "Ответ", attachments: ["file.pdf"] });
		});

		await waitFor(() => {
			const assigned = queryClient.getQueryData<TasksCache>(["tasks", "assigned", {}]);
			expect(assigned?.pages[0].tasks).toHaveLength(0);
		});

		const completed = queryClient.getQueryData<TasksCache>(["tasks", "completed", {}]);
		expect(completed?.pages[0].tasks).toHaveLength(1);
		expect(completed?.pages[0].tasks[0].answer).toBe("Ответ");
		expect(completed?.pages[0].tasks[0].attachments).toEqual(["file.pdf"]);
		expect(completed?.pages[0].tasks[0].status).toBe("completed");
	});

	it("rolls back on error", async () => {
		const { toast } = await import("sonner");
		seedTasks("assigned", [makeTask("t1", { status: "assigned" })]);
		seedTasks("completed", []);

		vi.spyOn(taskMockData, "submitAnswer").mockRejectedValue(new Error("Network error"));

		const { result } = renderHook(() => useSubmitAnswer(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "t1", answer: "Ответ" });
			} catch {}
		});

		const assigned = queryClient.getQueryData<TasksCache>(["tasks", "assigned", {}]);
		expect(assigned?.pages[0].tasks).toHaveLength(1);

		const completed = queryClient.getQueryData<TasksCache>(["tasks", "completed", {}]);
		expect(completed?.pages[0].tasks).toHaveLength(0);

		expect(toast.error).toHaveBeenCalled();
	});
});
