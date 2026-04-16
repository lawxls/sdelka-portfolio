import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper, createTestQueryClient, makeTask, mockHostname } from "@/test-utils";
import type { Task } from "./task-types";
import * as tasksMock from "./tasks-mock-data";
import { useAllTasks, useItemSearch, useSubmitAnswer, useTask, useTaskColumns, useUpdateTaskStatus } from "./use-tasks";

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
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	tasksMock._resetTasksStore();
});

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

const task1 = makeTask("t1", { status: "assigned" });
const task2 = makeTask("t2", { status: "in_progress" });
const task3 = makeTask("t3", { status: "completed", completedResponse: "Done" });
const task4 = makeTask("t4", { status: "archived" });

function seedTasks(status: string, tasks: Task[]) {
	queryClient.setQueryData(["tasks", status, {}], {
		pages: [{ tasks, nextCursor: null }],
		pageParams: [undefined],
	});
}

function seedBoardCache(columns: Partial<Record<string, Task[]>>) {
	const data: Record<string, { results: Task[]; next: null; count: number }> = {};
	for (const [status, tasks] of Object.entries(columns)) {
		data[status] = { results: tasks ?? [], next: null, count: tasks?.length ?? 0 };
	}
	queryClient.setQueryData(["tasks-board", {}], data);
}

describe("useTaskColumns", () => {
	it("fetches tasks from mock store grouped by status into four columns", async () => {
		tasksMock._setTasks([task1, task2, task3, task4]);

		const { result } = renderHook(() => useTaskColumns(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.assigned.tasks).toHaveLength(1);
		});

		expect(result.current.assigned.tasks[0].id).toBe("t1");
		expect(result.current.in_progress.tasks[0].id).toBe("t2");
		expect(result.current.completed.tasks[0].id).toBe("t3");
		expect(result.current.archived.tasks[0].id).toBe("t4");
	});

	it("returns loading state initially", () => {
		vi.spyOn(tasksMock, "fetchTaskBoardMock").mockImplementation(() => new Promise(() => {}));

		const { result } = renderHook(() => useTaskColumns(), {
			wrapper: createQueryWrapper(queryClient),
		});
		expect(result.current.assigned.isLoading).toBe(true);
	});

	it("reports hasNextPage from mock-store cursor", async () => {
		const many = Array.from({ length: 25 }, (_, i) => makeTask(`many-${i}`, { status: "assigned" }));
		tasksMock._setTasks(many);

		const { result } = renderHook(() => useTaskColumns(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.assigned.isLoading).toBe(false);
		});

		expect(result.current.assigned.hasNextPage).toBe(true);
		expect(result.current.in_progress.hasNextPage).toBe(false);
	});

	it("passes search and sort params to the mock layer", async () => {
		const spy = vi.spyOn(tasksMock, "fetchTaskBoardMock");
		tasksMock._setTasks([]);

		renderHook(() => useTaskColumns({ q: "арматур", sort: "deadline_at", dir: "asc" }), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(spy).toHaveBeenCalled();
		});

		expect(spy).toHaveBeenCalledWith(expect.objectContaining({ q: "арматур", sort: "deadline_at", dir: "asc" }));
	});

	it("loads next page for a column when loadMore is called", async () => {
		const many = Array.from({ length: 25 }, (_, i) => makeTask(`p${i}`, { status: "assigned" }));
		tasksMock._setTasks(many);

		const { result } = renderHook(() => useTaskColumns(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.assigned.tasks).toHaveLength(20);
		});

		expect(result.current.assigned.hasNextPage).toBe(true);

		act(() => {
			result.current.assigned.loadMore();
		});

		await waitFor(() => {
			expect(result.current.assigned.tasks).toHaveLength(25);
		});

		expect(result.current.assigned.hasNextPage).toBe(false);
	});
});

describe("useAllTasks", () => {
	it("fetches tasks from mock store with page-number pagination", async () => {
		const many = Array.from({ length: 25 }, (_, i) => makeTask(`p${i}`, { status: "assigned" }));
		tasksMock._setTasks(many);

		const { result } = renderHook(() => useAllTasks(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.tasks).toHaveLength(20);
		});

		expect(result.current.hasNextPage).toBe(true);
	});

	it("returns loading state initially", () => {
		vi.spyOn(tasksMock, "fetchTasksMock").mockImplementation(() => new Promise(() => {}));

		const { result } = renderHook(() => useAllTasks(), {
			wrapper: createQueryWrapper(queryClient),
		});
		expect(result.current.isLoading).toBe(true);
	});

	it("passes filter params to mock layer", async () => {
		const spy = vi.spyOn(tasksMock, "fetchTasksMock");
		tasksMock._setTasks([]);

		renderHook(() => useAllTasks({ q: "test", sort: "created_at", dir: "desc" }), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(spy).toHaveBeenCalled();
		});

		expect(spy).toHaveBeenCalledWith(expect.objectContaining({ q: "test", sort: "created_at", dir: "desc" }));
	});
});

describe("useTask", () => {
	it("fetches single task by id from the mock store", async () => {
		tasksMock._setTasks([task1]);

		const { result } = renderHook(() => useTask("t1"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.data).toBeTruthy();
		});

		expect(result.current.data?.id).toBe("t1");
		expect(result.current.data?.name).toBeTruthy();
	});

	it("does not fetch when id is null", () => {
		const { result } = renderHook(() => useTask(null), {
			wrapper: createQueryWrapper(queryClient),
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
	});
});

describe("useUpdateTaskStatus", () => {
	it("optimistically moves task between columns", async () => {
		tasksMock._setTasks([makeTask("t1", { status: "assigned" })]);
		vi.spyOn(tasksMock, "changeTaskStatusMock").mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve(makeTask("t1", { status: "in_progress" })), 5000)),
		);

		seedTasks("assigned", [makeTask("t1", { status: "assigned" })]);
		seedTasks("in_progress", [makeTask("t2", { status: "in_progress" })]);

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

	it("rolls back on error and shows fallback toast", async () => {
		const { toast } = await import("sonner");
		vi.spyOn(tasksMock, "changeTaskStatusMock").mockRejectedValue(new Error("boom"));

		seedTasks("assigned", [makeTask("t1", { status: "assigned" })]);
		seedTasks("in_progress", []);

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

		expect(toast.error).toHaveBeenCalledWith("Не удалось обновить статус задачи");
	});
});

describe("useUpdateTaskStatus - board cache", () => {
	it("optimistically moves task between columns in board cache", async () => {
		vi.spyOn(tasksMock, "changeTaskStatusMock").mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve(makeTask("t1", { status: "in_progress" })), 5000)),
		);

		seedBoardCache({
			assigned: [makeTask("t1", { status: "assigned" })],
			in_progress: [makeTask("t2", { status: "in_progress" })],
		});

		const { result } = renderHook(() => useUpdateTaskStatus(), {
			wrapper: createQueryWrapper(queryClient),
		});

		act(() => {
			result.current.mutate({ id: "t1", status: "in_progress" });
		});

		await waitFor(() => {
			const board = queryClient.getQueryData<{ assigned?: { results: Task[] } }>(["tasks-board", {}]);
			expect(board?.assigned?.results).toHaveLength(0);
		});

		const board = queryClient.getQueryData<{ in_progress?: { results: Task[] } }>(["tasks-board", {}]);
		expect(board?.in_progress?.results).toHaveLength(2);
		expect(board?.in_progress?.results?.[0]?.id).toBe("t1");
		expect(board?.in_progress?.results?.[0]?.status).toBe("in_progress");
	});

	it("rolls back board cache on error and shows fallback toast", async () => {
		const { toast } = await import("sonner");
		vi.spyOn(tasksMock, "changeTaskStatusMock").mockRejectedValue(new Error("boom"));

		seedBoardCache({
			assigned: [makeTask("t1", { status: "assigned" })],
			in_progress: [],
		});

		const { result } = renderHook(() => useUpdateTaskStatus(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "t1", status: "in_progress" });
			} catch {}
		});

		const board = queryClient.getQueryData<{ assigned?: { results: Task[] }; in_progress?: { results: Task[] } }>([
			"tasks-board",
			{},
		]);
		expect(board?.assigned?.results).toHaveLength(1);
		expect(board?.in_progress?.results).toHaveLength(0);
		expect(toast.error).toHaveBeenCalledWith("Не удалось обновить статус задачи");
	});
});

describe("useSubmitAnswer - board cache", () => {
	it("optimistically moves task to completed column in board cache", async () => {
		vi.spyOn(tasksMock, "changeTaskStatusMock").mockImplementation(
			() =>
				new Promise((resolve) =>
					setTimeout(() => resolve(makeTask("t1", { status: "completed", completedResponse: "My answer" })), 5000),
				),
		);

		seedBoardCache({
			assigned: [makeTask("t1", { status: "assigned" })],
			completed: [],
		});

		const { result } = renderHook(() => useSubmitAnswer(), {
			wrapper: createQueryWrapper(queryClient),
		});

		act(() => {
			result.current.mutate({ id: "t1", answer: "My answer" });
		});

		await waitFor(() => {
			const board = queryClient.getQueryData<{ assigned?: { results: Task[] } }>(["tasks-board", {}]);
			expect(board?.assigned?.results).toHaveLength(0);
		});

		const board = queryClient.getQueryData<{ completed?: { results: Task[] } }>(["tasks-board", {}]);
		expect(board?.completed?.results).toHaveLength(1);
		expect(board?.completed?.results?.[0]?.id).toBe("t1");
		expect(board?.completed?.results?.[0]?.completedResponse).toBe("My answer");
	});

	it("rolls back board cache on error and shows fallback toast", async () => {
		const { toast } = await import("sonner");
		vi.spyOn(tasksMock, "changeTaskStatusMock").mockRejectedValue(new Error("boom"));

		seedBoardCache({
			assigned: [makeTask("t1", { status: "assigned" })],
			completed: [],
		});

		const { result } = renderHook(() => useSubmitAnswer(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "t1", answer: "My answer" });
			} catch {}
		});

		const board = queryClient.getQueryData<{ assigned?: { results: Task[] }; completed?: { results: Task[] } }>([
			"tasks-board",
			{},
		]);
		expect(board?.assigned?.results).toHaveLength(1);
		expect(board?.completed?.results).toHaveLength(0);
		expect(toast.error).toHaveBeenCalledWith("Не удалось отправить ответ");
	});
});

describe("useSubmitAnswer", () => {
	it("optimistically moves task to completed column", async () => {
		vi.spyOn(tasksMock, "changeTaskStatusMock").mockImplementation(
			() =>
				new Promise((resolve) =>
					setTimeout(() => resolve(makeTask("t1", { status: "completed", completedResponse: "My answer" })), 5000),
				),
		);

		seedTasks("assigned", [makeTask("t1", { status: "assigned" })]);
		seedTasks("completed", []);

		const { result } = renderHook(() => useSubmitAnswer(), {
			wrapper: createQueryWrapper(queryClient),
		});

		act(() => {
			result.current.mutate({ id: "t1", answer: "My answer" });
		});

		await waitFor(() => {
			const assigned = queryClient.getQueryData<TasksCache>(["tasks", "assigned", {}]);
			expect(assigned?.pages[0].tasks).toHaveLength(0);
		});

		const completed = queryClient.getQueryData<TasksCache>(["tasks", "completed", {}]);
		expect(completed?.pages[0].tasks).toHaveLength(1);
		expect(completed?.pages[0].tasks[0].id).toBe("t1");
		expect(completed?.pages[0].tasks[0].status).toBe("completed");
	});

	it("rolls back on error and shows fallback toast", async () => {
		const { toast } = await import("sonner");
		vi.spyOn(tasksMock, "changeTaskStatusMock").mockRejectedValue(new Error("boom"));

		seedTasks("assigned", [makeTask("t1", { status: "assigned" })]);
		seedTasks("completed", []);

		const { result } = renderHook(() => useSubmitAnswer(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "t1", answer: "My answer" });
			} catch {}
		});

		const assigned = queryClient.getQueryData<TasksCache>(["tasks", "assigned", {}]);
		expect(assigned?.pages[0].tasks).toHaveLength(1);

		const completed = queryClient.getQueryData<TasksCache>(["tasks", "completed", {}]);
		expect(completed?.pages[0].tasks).toHaveLength(0);

		expect(toast.error).toHaveBeenCalledWith("Не удалось отправить ответ");
	});

	it("uploads attachments before changing status when files provided", async () => {
		const callOrder: string[] = [];
		vi.spyOn(tasksMock, "uploadTaskAttachmentsMock").mockImplementation(async () => {
			callOrder.push("upload");
			return [
				{
					id: "att-1",
					fileName: "doc.pdf",
					fileSize: 1024,
					fileType: "pdf",
					contentType: "application/pdf",
					fileUrl: "blob:mock",
					uploadedAt: "2026-03-15T10:00:00.000Z",
				},
			];
		});
		vi.spyOn(tasksMock, "changeTaskStatusMock").mockImplementation(async () => {
			callOrder.push("status");
			return makeTask("t1", { status: "completed", completedResponse: "My answer" });
		});

		seedTasks("assigned", [makeTask("t1", { status: "assigned" })]);
		seedTasks("completed", []);

		const { result } = renderHook(() => useSubmitAnswer(), {
			wrapper: createQueryWrapper(queryClient),
		});

		const files = [new File(["content"], "doc.pdf", { type: "application/pdf" })];

		await act(async () => {
			await result.current.mutateAsync({ id: "t1", answer: "My answer", files });
		});

		expect(callOrder).toEqual(["upload", "status"]);
	});

	it("skips attachment upload when no files provided", async () => {
		const uploadSpy = vi.spyOn(tasksMock, "uploadTaskAttachmentsMock");
		vi.spyOn(tasksMock, "changeTaskStatusMock").mockResolvedValue(
			makeTask("t1", { status: "completed", completedResponse: "My answer" }),
		);

		seedTasks("assigned", [makeTask("t1", { status: "assigned" })]);
		seedTasks("completed", []);

		const { result } = renderHook(() => useSubmitAnswer(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await act(async () => {
			await result.current.mutateAsync({ id: "t1", answer: "My answer" });
		});

		expect(uploadSpy).not.toHaveBeenCalled();
	});

	it("does not change status when attachment upload fails", async () => {
		const { toast } = await import("sonner");
		vi.spyOn(tasksMock, "uploadTaskAttachmentsMock").mockRejectedValue(new Error("File too large"));
		const statusSpy = vi
			.spyOn(tasksMock, "changeTaskStatusMock")
			.mockResolvedValue(makeTask("t1", { status: "completed" }));

		seedTasks("assigned", [makeTask("t1", { status: "assigned" })]);
		seedTasks("completed", []);

		const { result } = renderHook(() => useSubmitAnswer(), {
			wrapper: createQueryWrapper(queryClient),
		});

		const files = [new File(["x".repeat(100)], "big.pdf")];

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "t1", answer: "My answer", files });
			} catch {}
		});

		expect(statusSpy).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith("Не удалось отправить ответ");
	});

	it("rolls back optimistic update when status change fails after successful upload", async () => {
		const { toast } = await import("sonner");
		vi.spyOn(tasksMock, "uploadTaskAttachmentsMock").mockResolvedValue([
			{
				id: "att-1",
				fileName: "doc.pdf",
				fileSize: 1024,
				fileType: "pdf",
				contentType: "application/pdf",
				fileUrl: "blob:mock",
				uploadedAt: "2026-03-15T10:00:00.000Z",
			},
		]);
		vi.spyOn(tasksMock, "changeTaskStatusMock").mockRejectedValue(new Error("Task is locked"));

		seedTasks("assigned", [makeTask("t1", { status: "assigned" })]);
		seedTasks("completed", []);

		const { result } = renderHook(() => useSubmitAnswer(), {
			wrapper: createQueryWrapper(queryClient),
		});

		const files = [new File(["content"], "doc.pdf")];

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "t1", answer: "My answer", files });
			} catch {}
		});

		const assigned = queryClient.getQueryData<TasksCache>(["tasks", "assigned", {}]);
		expect(assigned?.pages[0].tasks).toHaveLength(1);

		const completed = queryClient.getQueryData<TasksCache>(["tasks", "completed", {}]);
		expect(completed?.pages[0].tasks).toHaveLength(0);

		expect(toast.error).toHaveBeenCalledWith("Не удалось отправить ответ");
	});
});

describe("useItemSearch", () => {
	it("fetches items from mock store filtered by q", async () => {
		const { _setItems } = await import("./items-mock-data");
		_setItems([
			{
				id: "item-1",
				name: "Арматура А500С",
				status: "searching",
				annualQuantity: 100,
				currentPrice: 50,
				bestPrice: null,
				averagePrice: null,
				folderId: null,
				companyId: "c1",
			},
			{
				id: "item-2",
				name: "Арматура А400",
				status: "searching",
				annualQuantity: 200,
				currentPrice: 60,
				bestPrice: null,
				averagePrice: null,
				folderId: null,
				companyId: "c1",
			},
			{
				id: "item-3",
				name: "Цемент",
				status: "searching",
				annualQuantity: 50,
				currentPrice: 10,
				bestPrice: null,
				averagePrice: null,
				folderId: null,
				companyId: "c1",
			},
		]);

		const { result } = renderHook(() => useItemSearch("арматур"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.data).toHaveLength(2);
		});

		expect(result.current.data?.[0]).toEqual({ id: "item-1", name: "Арматура А500С" });
		expect(result.current.data?.[1]).toEqual({ id: "item-2", name: "Арматура А400" });
	});

	it("does not fetch when query is empty", () => {
		const { result } = renderHook(() => useItemSearch(""), {
			wrapper: createQueryWrapper(queryClient),
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
	});
});
