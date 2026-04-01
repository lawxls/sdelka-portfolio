import { useQuery } from "@tanstack/react-query";
import type { AnalyticsKpis, FolderBreakdown, ProcurementStatus } from "./analytics-types";
import { fetchAnalyticsSummary } from "./api-client";

const DEFAULT_STATUS_BREAKDOWN: Record<ProcurementStatus, number> = {
	awaiting_analytics: 0,
	searching: 0,
	negotiating: 0,
	completed: 0,
};

export function useAnalyticsSummary({ company }: { company?: string } = {}) {
	const query = useQuery({
		queryKey: ["analytics-summary", { company }],
		queryFn: () => fetchAnalyticsSummary({ company }),
	});

	return {
		kpis: (query.data?.kpis ?? null) as AnalyticsKpis | null,
		folderBreakdown: (query.data?.folderBreakdown ?? []) as FolderBreakdown[],
		statusBreakdown: query.data?.statusBreakdown ?? DEFAULT_STATUS_BREAKDOWN,
		isLoading: query.isLoading,
		isError: query.isError,
	};
}
