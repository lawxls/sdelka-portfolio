import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, makeItem, makeTask } from "@/test-utils";
import type { ItemsClient } from "./clients/items-client";
import type { TasksClient } from "./clients/tasks-client";
import type { TaskBoardResponse } from "./domains/tasks";
import { NetworkError, NotFoundError } from "./errors";
import type { Task, TaskStatus } from "./task-types";
import { fakeItemsClient, fakeTasksClient, TestClientsProvider } from "./test-clients-provider";
import {
	useAllTasks,
	useItemSearch,
	useSubmitAnswer,
	useTask,
	useTaskColumns,
	useTasksList,
	useUpdateTaskStatus,
} from "./use-tasks";

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

let queryClient: QueryClient;

function wrapperFactory(opts: { tasks?: TasksClient; items?: ItemsClient }) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				...(opts.tasks ? { tasks: opts.tasks } : {}),
				...(opts.items ? { items: opts.items } : {}),
			}}
		>
			{children}
		</TestClientsProvider>
	);
}

function emptyBoard(overrides: Partial<TaskBoardResponse> = {}): TaskBoardResponse {
	return {
		assigned: { results: [], next: null, count: 0 },
		in_progress: { results: [], next: null, count: 0 },
		completed: { results: [], next: null, count: 0 },
		archived: { results: [], next: null, count: 0 },
		...overrides,
	};
}

beforeEach(() => {
	queryClient = createTestQueryClient();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useAllTasks", () => {
	it("fetches the global task list", async () => {
		const listAll = vi.fn().mockResolvedValue([makeTask("t1"), makeTask("t2")]);
		const tasks = fakeTasksClient({ listAll });
		const { result } = renderHook(() => useAllTasks(), { wrapper: wrapperFactory({ tasks }) });

		await waitFor(() => expect(result.current.data).toHaveLength(2));
		expect(listAll).toHaveBeenCalled();
	});

	it("does not fetch when disabled", () => {
		const listAll = vi.fn();
		const tasks = fakeTasksClient({ listAll });
		const { result } = renderHook(() => useAllTasks({ enabled: false }), { wrapper: wrapperFactory({ tasks }) });

		expect(result.current.isLoading).toBe(false);
		expect(listAll).not.toHaveBeenCalled();
	});
});

describe("useTaskColumns", () => {
	it("groups board response into four columns the hook surfaces", async () => {
		const board = vi.fn().mockResolvedValue(
			emptyBoard({
				assigned: { results: [makeTask("t1", { status: "assigned" })], next: null, count: 1 },
				in_progress: { results: [makeTask("t2", { status: "in_progress" })], next: null, count: 1 },
				completed: { results: [makeTask("t3", { status: "completed" })], next: null, count: 1 },
				archived: { results: [makeTask("t4", { status: "archived" })], next: null, count: 1 },
			}),
		);
		const tasks = fakeTasksClient({ board });

		const { result } = renderHook(() => useTaskColumns(), { wrapper: wrapperFactory({ tasks }) });

		await waitFor(() => expect(result.current.assigned.tasks).toHaveLength(1));
		expect(result.current.in_progress.tasks[0].id).toBe("t2");
		expect(result.current.completed.tasks[0].id).toBe("t3");
		expect(result.current.archived.tasks[0].id).toBe("t4");
	});

	it("reports loading state from the underlying query", () => {
		const board = vi.fn().mockImplementation(() => new Promise(() => {}));
		const tasks = fakeTasksClient({ board });
		const { result } = renderHook(() => useTaskColumns(), { wrapper: wrapperFactory({ tasks }) });
		expect(result.current.assigned.isLoading).toBe(true);
	});

	it("threads filter and sort params to client.board", async () => {
		const board = vi.fn().mockResolvedValue(emptyBoard());
		const tasks = fakeTasksClient({ board });

		renderHook(() => useTaskColumns({ q: "арматур", sort: "deadline_at", dir: "asc" }), {
			wrapper: wrapperFactory({ tasks }),
		});

		await waitFor(() => expect(board).toHaveBeenCalled());
		expect(board).toHaveBeenCalledWith(expect.objectContaining({ q: "арматур", sort: "deadline_at", dir: "asc" }));
	});

	it("hasNextPage reflects column.next; loadMore fetches the next column page", async () => {
		const initial = emptyBoard({
			assigned: { results: [makeTask("t1", { status: "assigned" })], next: "t2", count: 2 },
		});
		const more = { results: [makeTask("t2", { status: "assigned" })], next: null };

		const board = vi.fn().mockResolvedValueOnce(initial).mockResolvedValueOnce(more);
		const tasks = fakeTasksClient({ board });

		const { result } = renderHook(() => useTaskColumns(), { wrapper: wrapperFactory({ tasks }) });
		await waitFor(() => expect(result.current.assigned.tasks).toHaveLength(1));
		expect(result.current.assigned.hasNextPage).toBe(true);

		act(() => {
			result.current.assigned.loadMore();
		});

		await waitFor(() => expect(result.current.assigned.tasks).toHaveLength(2));
		expect(board).toHaveBeenLastCalledWith(expect.objectContaining({ column: "assigned", cursor: "t2" }));
		expect(result.current.assigned.hasNextPage).toBe(false);
	});
});

describe("useTasksList", () => {
	it("threads cursor between pages and exposes totalCount + hasNextPage", async () => {
		const list = vi
			.fn()
			.mockResolvedValueOnce({
				count: 4,
				results: [makeTask("t1"), makeTask("t2")],
				next: "page=2",
				previous: null,
			})
			.mockResolvedValueOnce({
				count: 4,
				results: [makeTask("t3"), makeTask("t4")],
				next: null,
				previous: "page=1",
			});
		const tasks = fakeTasksClient({ list });
		const { result } = renderHook(() => useTasksList(), { wrapper: wrapperFactory({ tasks }) });

		await waitFor(() => expect(result.current.tasks).toHaveLength(2));
		expect(result.current.totalCount).toBe(4);
		expect(result.current.hasNextPage).toBe(true);

		act(() => {
			result.current.loadMore();
		});

		await waitFor(() => expect(result.current.tasks).toHaveLength(4));
		expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
		expect(result.current.hasNextPage).toBe(false);
	});
});

describe("useTask", () => {
	it("fetches a single task by id", async () => {
		const get = vi.fn().mockResolvedValue(makeTask("t1", { name: "Согласовать цену" }));
		const tasks = fakeTasksClient({ get });
		const { result } = renderHook(() => useTask("t1"), { wrapper: wrapperFactory({ tasks }) });

		await waitFor(() => expect(result.current.data?.name).toBe("Согласовать цену"));
		expect(get).toHaveBeenCalledWith("t1");
	});

	it("does not fetch when id is null", () => {
		const get = vi.fn();
		const tasks = fakeTasksClient({ get });
		const { result } = renderHook(() => useTask(null), { wrapper: wrapperFactory({ tasks }) });
		expect(result.current.isLoading).toBe(false);
		expect(get).not.toHaveBeenCalled();
	});
});

describe("useUpdateTaskStatus", () => {
	function seedBoard(columns: Partial<Record<TaskStatus, Task[]>>) {
		const data: TaskBoardResponse = emptyBoard();
		for (const [status, list] of Object.entries(columns) as Array<[TaskStatus, Task[]]>) {
			data[status] = { results: list, next: null, count: list.length };
		}
		queryClient.setQueryData(["tasks-board", {}], data);
	}

	it("optimistically moves a task between columns in the board cache", async () => {
		const changeStatus = vi
			.fn()
			.mockImplementation(
				() =>
					new Promise<Task>((resolve) => setTimeout(() => resolve(makeTask("t1", { status: "in_progress" })), 5000)),
			);
		const tasks = fakeTasksClient({ changeStatus });

		seedBoard({
			assigned: [makeTask("t1", { status: "assigned" })],
			in_progress: [makeTask("t2", { status: "in_progress" })],
		});

		const { result } = renderHook(() => useUpdateTaskStatus(), { wrapper: wrapperFactory({ tasks }) });

		act(() => {
			result.current.mutate({ id: "t1", status: "in_progress" });
		});

		await waitFor(() => {
			const board = queryClient.getQueryData<TaskBoardResponse>(["tasks-board", {}]);
			expect(board?.assigned?.results).toHaveLength(0);
		});

		const board = queryClient.getQueryData<TaskBoardResponse>(["tasks-board", {}]);
		expect(board?.in_progress?.results).toHaveLength(2);
		expect(board?.in_progress?.results?.[0]?.id).toBe("t1");
		expect(board?.in_progress?.results?.[0]?.status).toBe("in_progress");
		expect(changeStatus).toHaveBeenCalledWith("t1", { status: "in_progress" });
	});

	it("rolls back the board cache on error and surfaces a toast", async () => {
		const { toast } = await import("sonner");
		const changeStatus = vi.fn().mockRejectedValue(new Error("boom"));
		const tasks = fakeTasksClient({ changeStatus });

		seedBoard({
			assigned: [makeTask("t1", { status: "assigned" })],
			in_progress: [],
		});

		const { result } = renderHook(() => useUpdateTaskStatus(), { wrapper: wrapperFactory({ tasks }) });

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "t1", status: "in_progress" });
			} catch {}
		});

		const board = queryClient.getQueryData<TaskBoardResponse>(["tasks-board", {}]);
		expect(board?.assigned?.results).toHaveLength(1);
		expect(board?.in_progress?.results).toHaveLength(0);
		expect(toast.error).toHaveBeenCalledWith("Не удалось обновить статус задачи");
	});
});

describe("useSubmitAnswer", () => {
	function seedBoard(columns: Partial<Record<TaskStatus, Task[]>>) {
		const data: TaskBoardResponse = emptyBoard();
		for (const [status, list] of Object.entries(columns) as Array<[TaskStatus, Task[]]>) {
			data[status] = { results: list, next: null, count: list.length };
		}
		queryClient.setQueryData(["tasks-board", {}], data);
	}

	it("uploads attachments before changing status when files are passed", async () => {
		const callOrder: string[] = [];
		const uploadAttachments = vi.fn().mockImplementation(async () => {
			callOrder.push("upload");
			return [];
		});
		const changeStatus = vi.fn().mockImplementation(async () => {
			callOrder.push("status");
			return makeTask("t1", { status: "completed", completedResponse: "ответ" });
		});
		const tasks = fakeTasksClient({ uploadAttachments, changeStatus });

		seedBoard({ assigned: [makeTask("t1", { status: "assigned" })] });

		const { result } = renderHook(() => useSubmitAnswer(), { wrapper: wrapperFactory({ tasks }) });

		const file = new File(["x"], "doc.pdf");
		await act(async () => {
			await result.current.mutateAsync({ id: "t1", answer: "ответ", files: [file] });
		});

		expect(callOrder).toEqual(["upload", "status"]);
		expect(uploadAttachments).toHaveBeenCalledWith("t1", [file]);
		expect(changeStatus).toHaveBeenCalledWith("t1", { status: "completed", completedResponse: "ответ" });
	});

	it("skips attachment upload when no files provided", async () => {
		const uploadAttachments = vi.fn();
		const changeStatus = vi.fn().mockResolvedValue(makeTask("t1", { status: "completed", completedResponse: "x" }));
		const tasks = fakeTasksClient({ uploadAttachments, changeStatus });

		seedBoard({ assigned: [makeTask("t1", { status: "assigned" })] });

		const { result } = renderHook(() => useSubmitAnswer(), { wrapper: wrapperFactory({ tasks }) });
		await act(async () => {
			await result.current.mutateAsync({ id: "t1", answer: "x" });
		});

		expect(uploadAttachments).not.toHaveBeenCalled();
		expect(changeStatus).toHaveBeenCalled();
	});

	it("does not change status when attachment upload fails", async () => {
		const { toast } = await import("sonner");
		const uploadAttachments = vi.fn().mockRejectedValue(new Error("File too large"));
		const changeStatus = vi.fn();
		const tasks = fakeTasksClient({ uploadAttachments, changeStatus });

		seedBoard({ assigned: [makeTask("t1", { status: "assigned" })] });

		const { result } = renderHook(() => useSubmitAnswer(), { wrapper: wrapperFactory({ tasks }) });
		const files = [new File(["x"], "big.pdf")];

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "t1", answer: "ответ", files });
			} catch {}
		});

		expect(changeStatus).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith("Не удалось отправить ответ");
	});

	it("rolls back optimistic update when status change fails after successful upload", async () => {
		const { toast } = await import("sonner");
		const uploadAttachments = vi.fn().mockResolvedValue([]);
		const changeStatus = vi.fn().mockRejectedValue(new Error("Task is locked"));
		const tasks = fakeTasksClient({ uploadAttachments, changeStatus });

		seedBoard({
			assigned: [makeTask("t1", { status: "assigned" })],
			completed: [],
		});

		const { result } = renderHook(() => useSubmitAnswer(), { wrapper: wrapperFactory({ tasks }) });
		const files = [new File(["x"], "doc.pdf")];

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "t1", answer: "ответ", files });
			} catch {}
		});

		const board = queryClient.getQueryData<TaskBoardResponse>(["tasks-board", {}]);
		expect(board?.assigned?.results).toHaveLength(1);
		expect(board?.completed?.results).toHaveLength(0);
		expect(toast.error).toHaveBeenCalledWith("Не удалось отправить ответ");
	});
});

describe("useItemSearch", () => {
	it("delegates to the items client and projects to {id, name}", async () => {
		const list = vi.fn().mockResolvedValue({
			items: [makeItem("i1", { name: "Арматура А500С" }), makeItem("i2", { name: "Арматура А400" })],
			nextCursor: null,
		});
		const items = fakeItemsClient({ list });

		const { result } = renderHook(() => useItemSearch("арматур"), { wrapper: wrapperFactory({ items }) });

		await waitFor(() => expect(result.current.data).toHaveLength(2));
		expect(result.current.data?.[0]).toEqual({ id: "i1", name: "Арматура А500С" });
		expect(list).toHaveBeenCalledWith({ q: "арматур" });
	});

	it("does not fetch when query is empty", () => {
		const list = vi.fn();
		const items = fakeItemsClient({ list });
		const { result } = renderHook(() => useItemSearch(""), { wrapper: wrapperFactory({ items }) });
		expect(result.current.isLoading).toBe(false);
		expect(list).not.toHaveBeenCalled();
	});
});

describe("error-class branching", () => {
	it("NotFoundError surfaces on get", async () => {
		const get = vi.fn().mockRejectedValue(new NotFoundError({ id: "missing" }));
		const tasks = fakeTasksClient({ get });

		const { result } = renderHook(() => useTask("missing"), { wrapper: wrapperFactory({ tasks }) });
		await waitFor(() => expect(result.current.error).toBeInstanceOf(NotFoundError));
	});

	it("NetworkError surfaces on board", async () => {
		const board = vi.fn().mockRejectedValue(new NetworkError(new Error("offline")));
		const tasks = fakeTasksClient({ board });

		const { result } = renderHook(() => useTaskColumns(), { wrapper: wrapperFactory({ tasks }) });
		await waitFor(() => expect(result.current.assigned.tasks).toEqual([]));
		// boardQuery error surfaces — column state still renders with empty list.
		// The hook doesn't expose the error object directly, but we verify the
		// underlying query error via the query cache.
		const state = queryClient.getQueryState(["tasks-board", {}]);
		expect(state?.error).toBeInstanceOf(NetworkError);
	});
});
