import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test-msw";
import { createQueryWrapper, createTestQueryClient, makeTask, mockHostname } from "@/test-utils";
import type { Task } from "./task-types";
import { useAllTasks, useSubmitAnswer, useTask, useTaskColumns, useUpdateTaskStatus } from "./use-tasks";

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
	localStorage.setItem("auth-refresh-token", "test-refresh");
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

describe("useTaskColumns", () => {
	it("fetches tasks from board endpoint for all 4 statuses", async () => {
		server.use(
			http.get("/api/v1/tasks/board/", () => {
				return HttpResponse.json({
					assigned: { results: [task1], next: null, count: 1 },
					in_progress: { results: [task2], next: null, count: 1 },
					completed: { results: [task3], next: null, count: 1 },
					archived: { results: [task4], next: null, count: 1 },
				});
			}),
		);

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

	it("returns loading state initially", async () => {
		server.use(
			http.get("/api/v1/tasks/board/", async () => {
				await new Promise((r) => setTimeout(r, 10000));
				return HttpResponse.json({});
			}),
		);

		const { result } = renderHook(() => useTaskColumns(), {
			wrapper: createQueryWrapper(queryClient),
		});
		expect(result.current.assigned.isLoading).toBe(true);
	});

	it("reports hasNextPage from board endpoint cursor", async () => {
		server.use(
			http.get("/api/v1/tasks/board/", () => {
				return HttpResponse.json({
					assigned: { results: [task1], next: "cursor-abc", count: 25 },
					in_progress: { results: [], next: null, count: 0 },
					completed: { results: [], next: null, count: 0 },
					archived: { results: [], next: null, count: 0 },
				});
			}),
		);

		const { result } = renderHook(() => useTaskColumns(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.assigned.isLoading).toBe(false);
		});

		expect(result.current.assigned.hasNextPage).toBe(true);
		expect(result.current.in_progress.hasNextPage).toBe(false);
	});

	it("passes search and sort params to board endpoint", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/tasks/board/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({
					assigned: { results: [], next: null, count: 0 },
					in_progress: { results: [], next: null, count: 0 },
					completed: { results: [], next: null, count: 0 },
					archived: { results: [], next: null, count: 0 },
				});
			}),
		);

		renderHook(() => useTaskColumns({ q: "арматур", sort: "deadline_at", dir: "asc" }), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(capturedUrl).toBeDefined();
		});

		const url = new URL(capturedUrl as string);
		expect(url.searchParams.get("q")).toBe("арматур");
		expect(url.searchParams.get("sort")).toBe("deadline_at");
		expect(url.searchParams.get("dir")).toBe("asc");
	});
});

describe("useAllTasks", () => {
	it("fetches tasks from list endpoint with page-number pagination", async () => {
		server.use(
			http.get("/api/v1/tasks/", ({ request }) => {
				const url = new URL(request.url);
				const page = Number(url.searchParams.get("page") ?? "1");
				if (page === 1) {
					return HttpResponse.json({
						count: 3,
						results: [task1, task2],
						next: "http://api/tasks/?page=2",
						previous: null,
					});
				}
				return HttpResponse.json({
					count: 3,
					results: [task3],
					next: null,
					previous: "http://api/tasks/?page=1",
				});
			}),
		);

		const { result } = renderHook(() => useAllTasks(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.tasks).toHaveLength(2);
		});

		expect(result.current.hasNextPage).toBe(true);
	});

	it("returns loading state initially", async () => {
		server.use(
			http.get("/api/v1/tasks/", async () => {
				await new Promise((r) => setTimeout(r, 10000));
				return HttpResponse.json({});
			}),
		);

		const { result } = renderHook(() => useAllTasks(), {
			wrapper: createQueryWrapper(queryClient),
		});
		expect(result.current.isLoading).toBe(true);
	});

	it("passes filter params to list endpoint", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/tasks/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({ count: 0, results: [], next: null, previous: null });
			}),
		);

		renderHook(() => useAllTasks({ q: "test", sort: "created_at", dir: "desc" }), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(capturedUrl).toBeDefined();
		});

		const url = new URL(capturedUrl as string);
		expect(url.searchParams.get("q")).toBe("test");
		expect(url.searchParams.get("sort")).toBe("created_at");
		expect(url.searchParams.get("dir")).toBe("desc");
	});
});

describe("useTask", () => {
	it("fetches single task by id from detail endpoint", async () => {
		server.use(
			http.get("/api/v1/tasks/:id/", () => {
				return HttpResponse.json(task1);
			}),
		);

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
		server.use(
			http.patch("/api/v1/tasks/:id/status/", async () => {
				await new Promise((r) => setTimeout(r, 5000));
				return HttpResponse.json(makeTask("t1", { status: "in_progress" }));
			}),
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

	it("rolls back on error and shows API detail in toast", async () => {
		const { toast } = await import("sonner");
		server.use(
			http.patch("/api/v1/tasks/:id/status/", () => {
				return HttpResponse.json({ detail: "Completed tasks cannot change status." }, { status: 400 });
			}),
		);

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

		expect(toast.error).toHaveBeenCalledWith("Completed tasks cannot change status.");
	});

	it("shows generic error toast when API returns no detail", async () => {
		const { toast } = await import("sonner");
		server.use(
			http.patch("/api/v1/tasks/:id/status/", () => {
				return HttpResponse.json(null, { status: 500 });
			}),
		);

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

		expect(toast.error).toHaveBeenCalledWith("Не удалось обновить статус задачи");
	});
});

describe("useSubmitAnswer", () => {
	it("optimistically moves task to completed column", async () => {
		server.use(
			http.patch("/api/v1/tasks/:id/status/", async () => {
				await new Promise((r) => setTimeout(r, 5000));
				return HttpResponse.json(makeTask("t1", { status: "completed", completedResponse: "My answer" }));
			}),
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

	it("rolls back on error and shows API detail in toast", async () => {
		const { toast } = await import("sonner");
		server.use(
			http.patch("/api/v1/tasks/:id/status/", () => {
				return HttpResponse.json({ detail: "Task is already completed." }, { status: 400 });
			}),
		);

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

		expect(toast.error).toHaveBeenCalledWith("Task is already completed.");
	});

	it("shows generic error toast when API returns no detail", async () => {
		const { toast } = await import("sonner");
		server.use(
			http.patch("/api/v1/tasks/:id/status/", () => {
				return HttpResponse.json(null, { status: 500 });
			}),
		);

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

		expect(toast.error).toHaveBeenCalledWith("Не удалось отправить ответ");
	});

	it("uploads attachments before changing status when files provided", async () => {
		const callOrder: string[] = [];

		server.use(
			http.post("/api/v1/tasks/:id/attachments/", () => {
				callOrder.push("upload");
				return HttpResponse.json([
					{
						id: "att-1",
						fileName: "doc.pdf",
						fileSize: 1024,
						fileType: "pdf",
						contentType: "application/pdf",
						fileUrl: "/files/doc.pdf",
						uploadedAt: "2026-03-15T10:00:00.000Z",
					},
				]);
			}),
			http.patch("/api/v1/tasks/:id/status/", () => {
				callOrder.push("status");
				return HttpResponse.json(makeTask("t1", { status: "completed", completedResponse: "My answer" }));
			}),
		);

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
		let uploadCalled = false;

		server.use(
			http.post("/api/v1/tasks/:id/attachments/", () => {
				uploadCalled = true;
				return HttpResponse.json([]);
			}),
			http.patch("/api/v1/tasks/:id/status/", () => {
				return HttpResponse.json(makeTask("t1", { status: "completed", completedResponse: "My answer" }));
			}),
		);

		seedTasks("assigned", [makeTask("t1", { status: "assigned" })]);
		seedTasks("completed", []);

		const { result } = renderHook(() => useSubmitAnswer(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await act(async () => {
			await result.current.mutateAsync({ id: "t1", answer: "My answer" });
		});

		expect(uploadCalled).toBe(false);
	});

	it("does not change status when attachment upload fails", async () => {
		const { toast } = await import("sonner");
		let statusCalled = false;

		server.use(
			http.post("/api/v1/tasks/:id/attachments/", () => {
				return HttpResponse.json({ detail: "File too large" }, { status: 400 });
			}),
			http.patch("/api/v1/tasks/:id/status/", () => {
				statusCalled = true;
				return HttpResponse.json(makeTask("t1", { status: "completed" }));
			}),
		);

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

		expect(statusCalled).toBe(false);
		expect(toast.error).toHaveBeenCalledWith("File too large");
	});

	it("rolls back optimistic update when status change fails after successful upload", async () => {
		const { toast } = await import("sonner");

		server.use(
			http.post("/api/v1/tasks/:id/attachments/", () => {
				return HttpResponse.json([
					{
						id: "att-1",
						fileName: "doc.pdf",
						fileSize: 1024,
						fileType: "pdf",
						contentType: "application/pdf",
						fileUrl: "/files/doc.pdf",
						uploadedAt: "2026-03-15T10:00:00.000Z",
					},
				]);
			}),
			http.patch("/api/v1/tasks/:id/status/", () => {
				return HttpResponse.json({ detail: "Task is locked" }, { status: 400 });
			}),
		);

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

		expect(toast.error).toHaveBeenCalledWith("Task is locked");
	});
});
