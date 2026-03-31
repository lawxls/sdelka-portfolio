import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { changeTaskStatus, fetchTask, fetchTaskBoard, fetchTasks } from "./api-client";
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

export function useTaskColumns(params?: TaskFilterParams) {
	const queryParams = params ?? {};
	const boardQuery = useQuery({
		queryKey: ["tasks-board", queryParams],
		queryFn: () =>
			fetchTaskBoard({
				q: queryParams.q,
				item: queryParams.item,
				company: queryParams.company,
				sort: queryParams.sort,
				dir: queryParams.dir,
			}),
	});

	const boardData = boardQuery.data;

	function columnState(status: TaskStatus) {
		const column = boardData?.[status];
		return {
			tasks: column?.results ?? [],
			hasNextPage: column?.next != null,
			loadMore: () => {},
			isLoading: boardQuery.isLoading,
			isFetchingNextPage: false,
		};
	}

	return {
		assigned: columnState("assigned"),
		in_progress: columnState("in_progress"),
		completed: columnState("completed"),
		archived: columnState("archived"),
	};
}

export function useAllTasks(params?: TaskFilterParams) {
	const queryParams = params ?? {};
	const query = useInfiniteQuery({
		queryKey: ["tasks", "all", queryParams],
		queryFn: ({ pageParam }) =>
			fetchTasks({
				page: pageParam,
				page_size: 20,
				q: queryParams.q,
				item: queryParams.item,
				company: queryParams.company,
				sort: queryParams.sort,
				dir: queryParams.dir,
			}),
		initialPageParam: 1,
		getNextPageParam: (lastPage, _allPages, lastPageParam) => (lastPage.next ? lastPageParam + 1 : undefined),
	});

	// Extract page number from next URL or compute from pagination
	const pages = query.data?.pages ?? [];
	const lastPage = pages[pages.length - 1];
	const hasNextPage = lastPage?.next != null;

	return {
		tasks: pages.flatMap((p) => p.results),
		hasNextPage,
		loadMore: query.fetchNextPage,
		isLoading: query.isLoading,
		isFetchingNextPage: query.isFetchingNextPage,
	};
}

export function useTask(id: string | null) {
	return useQuery({
		queryKey: ["task", id],
		queryFn: () => fetchTask(id as string),
		enabled: id !== null,
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

function invalidateAllTaskQueries(queryClient: ReturnType<typeof useQueryClient>, taskId?: string) {
	queryClient.invalidateQueries({ queryKey: ["tasks"] });
	queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
	if (taskId) queryClient.invalidateQueries({ queryKey: ["task", taskId] });
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
		mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => changeTaskStatus(id, { status }),
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
		onSettled: (_data, _err, vars) => invalidateAllTaskQueries(queryClient, vars.id),
	});
}

export function useSubmitAnswer() {
	const queryClient = useQueryClient();
	const findTask = findTaskInCaches(queryClient);

	return useMutation({
		mutationFn: ({ id, answer }: { id: string; answer: string; attachments?: string[] }) =>
			changeTaskStatus(id, { status: "completed", completedResponse: answer }),
		onMutate: async ({ id, answer }) => {
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
							addTaskToCache(data, { ...task, status: "completed", completedResponse: answer }),
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
		onSettled: (_data, _err, vars) => invalidateAllTaskQueries(queryClient, vars.id),
	});
}
