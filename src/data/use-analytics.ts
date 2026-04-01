import { useQuery } from "@tanstack/react-query";
import type { AnalyticsKpis, FolderBreakdown, ProcurementStatus } from "./analytics-types";
import { fetchAnalyticsPipeline, fetchAnalyticsSummary, fetchTasks } from "./api-client";
import type { SupplierStatus } from "./supplier-types";
import { SUPPLIER_STATUSES } from "./supplier-types";

const DEFAULT_STATUS_BREAKDOWN: Record<ProcurementStatus, number> = {
	awaiting_analytics: 0,
	searching: 0,
	negotiating: 0,
	completed: 0,
};

const DEFAULT_SUPPLIER_PIPELINE = Object.fromEntries(SUPPLIER_STATUSES.map((s) => [s, 0])) as Record<
	SupplierStatus,
	number
>;

export function useAnalyticsSummary({ company }: { company?: string } = {}) {
	const query = useQuery({
		queryKey: ["analytics-summary", { company }],
		queryFn: () => fetchAnalyticsSummary({ company }),
	});

	const pipelineQuery = useQuery({
		queryKey: ["analytics-supplier-pipeline", { company }],
		queryFn: () => fetchAnalyticsPipeline({ company }),
	});

	const tasksQuery = useQuery({
		queryKey: ["analytics-tasks", { company }],
		queryFn: () => fetchTasks({ company, page_size: 200 }),
	});

	const activeTasks = (tasksQuery.data?.results ?? []).filter(
		(t) => t.status === "assigned" || t.status === "in_progress",
	);
	const tasksSummary = {
		open: activeTasks.length,
		overdue: activeTasks.filter((t) => t.deadlineAt < new Date().toISOString()).length,
	};

	return {
		kpis: (query.data?.kpis ?? null) as AnalyticsKpis | null,
		folderBreakdown: (query.data?.folderBreakdown ?? []) as FolderBreakdown[],
		statusBreakdown: query.data?.statusBreakdown ?? DEFAULT_STATUS_BREAKDOWN,
		supplierPipeline: pipelineQuery.data ?? DEFAULT_SUPPLIER_PIPELINE,
		tasksSummary,
		isLoading: query.isLoading || pipelineQuery.isLoading || tasksQuery.isLoading,
		isError: query.isError || pipelineQuery.isError || tasksQuery.isError,
	};
}
