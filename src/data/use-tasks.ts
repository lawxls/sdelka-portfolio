import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getTask, getTasks, submitAnswer, updateTaskStatus } from "./task-mock-data";
import type { Task, TaskStatus } from "./task-types";
import { TASK_STATUSES } from "./task-types";

type TasksCache = {
	pages: Array<{ tasks: Task[]; nextCursor: string | null }>;
	pageParams: Array<string | undefined>;
};

function removeTaskFromCache(cache: TasksCache, id: string): TasksCache {
	return {
		...cache,
		pages: cache.pages.map((page) => ({
			...page,
			tasks: page.tasks.filter((t) => t.id !== id),
		})),
	};
}

function addTaskToCache(cache: TasksCache, task: Task): TasksCache {
	if (cache.pages.length === 0) return cache;
	return {
		...cache,
		pages: [{ ...cache.pages[0], tasks: [task, ...cache.pages[0].tasks] }, ...cache.pages.slice(1)],
	};
}

function useTasksByStatus(status: TaskStatus) {
	const query = useInfiniteQuery({
		queryKey: ["tasks", status],
		queryFn: ({ pageParam }) => getTasks(status, pageParam),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});

	return {
		tasks: query.data?.pages.flatMap((p) => p.tasks) ?? [],
		hasNextPage: query.hasNextPage,
		loadMore: query.fetchNextPage,
		isLoading: query.isLoading,
		isFetchingNextPage: query.isFetchingNextPage,
	};
}

export function useTaskColumns() {
	const assigned = useTasksByStatus("assigned");
	const in_progress = useTasksByStatus("in_progress");
	const completed = useTasksByStatus("completed");
	const archived = useTasksByStatus("archived");

	return { assigned, in_progress, completed, archived };
}

export function useTask(id: string | null) {
	return useQuery({
		queryKey: ["task", id],
		queryFn: () => getTask(id as string),
		enabled: id !== null,
	});
}

function findTaskInCaches(queryClient: ReturnType<typeof useQueryClient>) {
	return (id: string): { task: Task; oldStatus: TaskStatus } | undefined => {
		for (const s of TASK_STATUSES) {
			const data = queryClient.getQueryData<TasksCache>(["tasks", s]);
			if (!data) continue;
			for (const page of data.pages) {
				const found = page.tasks.find((t) => t.id === id);
				if (found) return { task: found, oldStatus: s };
			}
		}
		return undefined;
	};
}

async function cancelAllTaskQueries(queryClient: ReturnType<typeof useQueryClient>) {
	await Promise.all(TASK_STATUSES.map((s) => queryClient.cancelQueries({ queryKey: ["tasks", s] })));
}

function invalidateAllTaskQueries(queryClient: ReturnType<typeof useQueryClient>) {
	for (const s of TASK_STATUSES) {
		queryClient.invalidateQueries({ queryKey: ["tasks", s] });
	}
}

type OptimisticContext = {
	snapshots: Map<TaskStatus, TasksCache>;
};

function rollbackTaskSnapshots(queryClient: ReturnType<typeof useQueryClient>, context: OptimisticContext | undefined) {
	if (!context?.snapshots) return;
	for (const [status, data] of context.snapshots) {
		queryClient.setQueryData(["tasks", status], data);
	}
}

export function useUpdateTaskStatus() {
	const queryClient = useQueryClient();
	const findTask = findTaskInCaches(queryClient);

	return useMutation({
		mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => updateTaskStatus(id, status),
		onMutate: async ({ id, status: newStatus }) => {
			await cancelAllTaskQueries(queryClient);

			const found = findTask(id);
			if (!found) return;
			const { task, oldStatus } = found;

			const snapshots = new Map<TaskStatus, TasksCache>();

			const sourceData = queryClient.getQueryData<TasksCache>(["tasks", oldStatus]);
			if (sourceData) {
				snapshots.set(oldStatus, sourceData);
				queryClient.setQueryData<TasksCache>(["tasks", oldStatus], removeTaskFromCache(sourceData, id));
			}

			const targetData = queryClient.getQueryData<TasksCache>(["tasks", newStatus]);
			if (targetData) {
				snapshots.set(newStatus, targetData);
				queryClient.setQueryData<TasksCache>(
					["tasks", newStatus],
					addTaskToCache(targetData, { ...task, status: newStatus }),
				);
			}

			return { snapshots };
		},
		onError: (_err, _vars, context) => {
			rollbackTaskSnapshots(queryClient, context);
			toast.error("Не удалось обновить статус задачи");
		},
		onSettled: () => invalidateAllTaskQueries(queryClient),
	});
}

export function useSubmitAnswer() {
	const queryClient = useQueryClient();
	const findTask = findTaskInCaches(queryClient);

	return useMutation({
		mutationFn: ({ id, answer, attachments }: { id: string; answer: string; attachments?: string[] }) =>
			submitAnswer(id, answer, attachments),
		onMutate: async ({ id, answer, attachments = [] }) => {
			await cancelAllTaskQueries(queryClient);

			const found = findTask(id);
			if (!found) return;
			const { task, oldStatus } = found;

			const snapshots = new Map<TaskStatus, TasksCache>();

			const sourceData = queryClient.getQueryData<TasksCache>(["tasks", oldStatus]);
			if (sourceData) {
				snapshots.set(oldStatus, sourceData);
				queryClient.setQueryData<TasksCache>(["tasks", oldStatus], removeTaskFromCache(sourceData, id));
			}

			if (oldStatus !== "completed") {
				const completedData = queryClient.getQueryData<TasksCache>(["tasks", "completed"]);
				if (completedData) {
					snapshots.set("completed", completedData);
					queryClient.setQueryData<TasksCache>(
						["tasks", "completed"],
						addTaskToCache(completedData, { ...task, status: "completed", answer, attachments }),
					);
				}
			}

			return { snapshots };
		},
		onError: (_err, _vars, context) => {
			rollbackTaskSnapshots(queryClient, context);
			toast.error("Не удалось отправить ответ");
		},
		onSettled: () => invalidateAllTaskQueries(queryClient),
	});
}
