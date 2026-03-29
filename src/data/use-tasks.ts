import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAllTasks, getProcurementItems, getTask, getTasks, submitAnswer, updateTaskStatus } from "./task-mock-data";
import type { Task, TaskFilterParams, TaskStatus } from "./task-types";
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

function useTasksByStatus(status: TaskStatus, params?: TaskFilterParams) {
	const query = useInfiniteQuery({
		queryKey: ["tasks", status, params ?? {}],
		queryFn: ({ pageParam }) => getTasks(status, pageParam, 20, params),
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

export function useAllTasks(params?: TaskFilterParams) {
	const query = useInfiniteQuery({
		queryKey: ["tasks", "all", params ?? {}],
		queryFn: ({ pageParam }) => getAllTasks(pageParam, 20, params),
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

export function useTaskColumns(params?: TaskFilterParams) {
	const assigned = useTasksByStatus("assigned", params);
	const in_progress = useTasksByStatus("in_progress", params);
	const completed = useTasksByStatus("completed", params);
	const archived = useTasksByStatus("archived", params);

	return { assigned, in_progress, completed, archived };
}

export function useTask(id: string | null) {
	return useQuery({
		queryKey: ["task", id],
		queryFn: () => getTask(id as string),
		enabled: id !== null,
	});
}

export function useProcurementItems() {
	return useQuery({
		queryKey: ["tasks", "procurementItems"],
		queryFn: () => getProcurementItems(),
		staleTime: Number.POSITIVE_INFINITY,
	});
}

function findTaskInCaches(queryClient: ReturnType<typeof useQueryClient>) {
	return (id: string): { task: Task; oldStatus: TaskStatus; queryKey: readonly unknown[] } | undefined => {
		for (const s of TASK_STATUSES) {
			const entries = queryClient.getQueriesData<TasksCache>({ queryKey: ["tasks", s] });
			for (const [key, data] of entries) {
				if (!data) continue;
				for (const page of data.pages) {
					const found = page.tasks.find((t) => t.id === id);
					if (found) return { task: found, oldStatus: s, queryKey: key };
				}
			}
		}
		return undefined;
	};
}

async function cancelAllTaskQueries(queryClient: ReturnType<typeof useQueryClient>) {
	await queryClient.cancelQueries({ queryKey: ["tasks"] });
}

function invalidateAllTaskQueries(queryClient: ReturnType<typeof useQueryClient>) {
	queryClient.invalidateQueries({ queryKey: ["tasks"] });
}

type OptimisticContext = {
	snapshots: Array<{ key: readonly unknown[]; data: TasksCache }>;
};

function rollbackTaskSnapshots(queryClient: ReturnType<typeof useQueryClient>, context: OptimisticContext | undefined) {
	if (!context?.snapshots) return;
	for (const { key, data } of context.snapshots) {
		queryClient.setQueryData(key, data);
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
			const { task, queryKey: sourceKey } = found;

			const snapshots: OptimisticContext["snapshots"] = [];

			const sourceData = queryClient.getQueryData<TasksCache>(sourceKey);
			if (sourceData) {
				snapshots.push({ key: sourceKey, data: sourceData });
				queryClient.setQueryData<TasksCache>(sourceKey, removeTaskFromCache(sourceData, id));
			}

			const targetEntries = queryClient.getQueriesData<TasksCache>({ queryKey: ["tasks", newStatus] });
			for (const [key, data] of targetEntries) {
				if (data) {
					snapshots.push({ key, data });
					queryClient.setQueryData<TasksCache>(key, addTaskToCache(data, { ...task, status: newStatus }));
				}
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
			const { task, oldStatus, queryKey: sourceKey } = found;

			const snapshots: OptimisticContext["snapshots"] = [];

			const sourceData = queryClient.getQueryData<TasksCache>(sourceKey);
			if (sourceData) {
				snapshots.push({ key: sourceKey, data: sourceData });
				queryClient.setQueryData<TasksCache>(sourceKey, removeTaskFromCache(sourceData, id));
			}

			if (oldStatus !== "completed") {
				const completedEntries = queryClient.getQueriesData<TasksCache>({ queryKey: ["tasks", "completed"] });
				for (const [key, data] of completedEntries) {
					if (data) {
						snapshots.push({ key, data });
						queryClient.setQueryData<TasksCache>(
							key,
							addTaskToCache(data, { ...task, status: "completed", answer, attachments }),
						);
					}
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
