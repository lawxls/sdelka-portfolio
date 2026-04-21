import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchItemsMock as fetchItems } from "./items-mock-data";
import type { Task, TaskFilterParams, TaskStatus } from "./task-types";
import { TASK_STATUSES } from "./task-types";
import {
	changeTaskStatusMock as changeTaskStatus,
	fetchAllTasksMock,
	fetchTaskMock as fetchTask,
	fetchTaskBoardMock as fetchTaskBoard,
	fetchTasksMock as fetchTasks,
	type TaskBoardResponse,
	uploadTaskAttachmentsMock as uploadTaskAttachments,
} from "./tasks-mock-data";

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

export function useAllTasks(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: ["tasks-global"],
		queryFn: fetchAllTasksMock,
		enabled: options?.enabled ?? true,
	});
}

export function useTaskColumns(params?: TaskFilterParams) {
	const queryParams = params ?? {};
	const queryClient = useQueryClient();

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

	function loadMore(status: TaskStatus) {
		const current = queryClient.getQueryData<TaskBoardResponse>(["tasks-board", queryParams]);
		const cursor = current?.[status]?.next;
		if (!cursor) return;

		fetchTaskBoard({
			q: queryParams.q,
			item: queryParams.item,
			company: queryParams.company,
			sort: queryParams.sort,
			dir: queryParams.dir,
			column: status,
			cursor,
		})
			.then((page) => {
				queryClient.setQueryData<TaskBoardResponse>(["tasks-board", queryParams], (old) => {
					const col = old?.[status];
					if (!col) return old;
					return {
						...old,
						[status]: { ...col, results: [...col.results, ...(page.results ?? [])], next: page.next ?? null },
					};
				});
			})
			.catch(() => {
				toast.error("Ошибка загрузки");
			});
	}

	function columnState(status: TaskStatus) {
		const column = boardQuery.data?.[status];
		return {
			tasks: column?.results ?? [],
			count: column?.count ?? 0,
			hasNextPage: column?.next != null,
			loadMore: () => loadMore(status),
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

export interface TasksListParams extends TaskFilterParams {
	statuses?: TaskStatus[];
}

export function useTasksList(params?: TasksListParams) {
	const queryParams = params ?? {};
	const query = useInfiniteQuery({
		queryKey: ["tasks", "list", queryParams],
		queryFn: ({ pageParam }) =>
			fetchTasks({
				page: pageParam,
				page_size: 25,
				q: queryParams.q,
				item: queryParams.item,
				company: queryParams.company,
				statuses: queryParams.statuses,
				sort: queryParams.sort,
				dir: queryParams.dir,
			}),
		initialPageParam: 1,
		getNextPageParam: (lastPage, _allPages, lastPageParam) => (lastPage.next ? lastPageParam + 1 : undefined),
	});

	return {
		tasks: query.data?.pages.flatMap((p) => p.results) ?? [],
		totalCount: query.data?.pages[0]?.count,
		hasNextPage: query.hasNextPage,
		loadMore: query.fetchNextPage,
		isLoading: query.isLoading,
		isFetchingNextPage: query.isFetchingNextPage,
	};
}

export function useTasksCount(params?: TasksListParams) {
	const queryParams = params ?? {};
	const query = useQuery({
		queryKey: ["tasks", "count", queryParams],
		queryFn: () =>
			fetchTasks({
				page: 1,
				page_size: 1,
				q: queryParams.q,
				item: queryParams.item,
				company: queryParams.company,
				statuses: queryParams.statuses,
			}),
	});
	return query.data?.count ?? 0;
}

export function useTask(id: string | null) {
	return useQuery({
		queryKey: ["task", id],
		queryFn: () => fetchTask(id as string),
		enabled: id !== null,
	});
}

type FoundTask = { task: Task; oldStatus: TaskStatus; queryKey: readonly unknown[]; isBoardCache: boolean };

function findTaskInCaches(queryClient: ReturnType<typeof useQueryClient>) {
	return (id: string): FoundTask | undefined => {
		for (const s of TASK_STATUSES) {
			const entries = queryClient.getQueriesData<TasksCache>({ queryKey: ["tasks", s] });
			for (const [key, data] of entries) {
				if (!data) continue;
				for (const page of data.pages) {
					const found = page.tasks.find((t) => t.id === id);
					if (found) return { task: found, oldStatus: s, queryKey: key, isBoardCache: false };
				}
			}
		}

		const boardEntries = queryClient.getQueriesData<TaskBoardResponse>({ queryKey: ["tasks-board"] });
		for (const [key, data] of boardEntries) {
			if (!data) continue;
			for (const s of TASK_STATUSES) {
				const col = data[s];
				if (!col) continue;
				const found = col.results.find((t) => t.id === id);
				if (found) return { task: found, oldStatus: s, queryKey: key, isBoardCache: true };
			}
		}

		return undefined;
	};
}

async function cancelAllTaskQueries(queryClient: ReturnType<typeof useQueryClient>) {
	await Promise.all([
		queryClient.cancelQueries({ queryKey: ["tasks"] }),
		queryClient.cancelQueries({ queryKey: ["tasks-board"] }),
	]);
}

function invalidateAllTaskQueries(queryClient: ReturnType<typeof useQueryClient>, taskId?: string) {
	queryClient.invalidateQueries({ queryKey: ["tasks"] });
	queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
	queryClient.invalidateQueries({ queryKey: ["tasks-global"] });
	if (taskId) queryClient.invalidateQueries({ queryKey: ["task", taskId] });
}

type OptimisticContext = {
	snapshots: Array<{ key: readonly unknown[]; data: unknown }>;
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
			const { task, oldStatus, queryKey: sourceKey, isBoardCache } = found;

			const snapshots: OptimisticContext["snapshots"] = [];

			if (isBoardCache) {
				const boardData = queryClient.getQueryData<TaskBoardResponse>(sourceKey);
				if (boardData) {
					snapshots.push({ key: sourceKey, data: boardData });
					queryClient.setQueryData<TaskBoardResponse>(sourceKey, (old) => {
						if (!old) return old;
						const srcCol = old[oldStatus];
						const tgtCol = old[newStatus];
						return {
							...old,
							[oldStatus]: srcCol ? { ...srcCol, results: srcCol.results.filter((t) => t.id !== id) } : srcCol,
							[newStatus]: tgtCol
								? { ...tgtCol, results: [{ ...task, status: newStatus }, ...tgtCol.results] }
								: tgtCol,
						};
					});
				}
			} else {
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
		mutationFn: async ({ id, answer, files }: { id: string; answer: string; files?: File[] }) => {
			if (files && files.length > 0) {
				await uploadTaskAttachments(id, files);
			}
			return changeTaskStatus(id, { status: "completed", completedResponse: answer });
		},
		onMutate: async ({ id, answer }) => {
			await cancelAllTaskQueries(queryClient);

			const found = findTask(id);
			if (!found) return;
			const { task, oldStatus, queryKey: sourceKey, isBoardCache } = found;

			const snapshots: OptimisticContext["snapshots"] = [];

			if (isBoardCache) {
				const boardData = queryClient.getQueryData<TaskBoardResponse>(sourceKey);
				if (boardData) {
					snapshots.push({ key: sourceKey, data: boardData });
					if (oldStatus !== "completed") {
						queryClient.setQueryData<TaskBoardResponse>(sourceKey, (old) => {
							if (!old) return old;
							const srcCol = old[oldStatus];
							const completedCol = old.completed;
							return {
								...old,
								[oldStatus]: srcCol ? { ...srcCol, results: srcCol.results.filter((t) => t.id !== id) } : srcCol,
								completed: completedCol
									? {
											...completedCol,
											results: [{ ...task, status: "completed", completedResponse: answer }, ...completedCol.results],
										}
									: completedCol,
							};
						});
					}
				}
			} else {
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

export function useItemSearch(query: string) {
	const result = useQuery({
		queryKey: ["items", "search", query],
		queryFn: () => fetchItems({ q: query }),
		enabled: query.length > 0,
	});

	return {
		data: result.data?.items.map((item) => ({ id: item.id, name: item.name })),
		isLoading: result.isLoading && query.length > 0,
	};
}
