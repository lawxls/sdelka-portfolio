import { useQuery } from "@tanstack/react-query";
import type { AnalyticsKpis, FolderBreakdown } from "./analytics-types";
import { fetchAnalyticsSummary } from "./api-client";

export function useAnalyticsSummary({ company }: { company?: string } = {}) {
	const query = useQuery({
		queryKey: ["analytics-summary", { company }],
		queryFn: () => fetchAnalyticsSummary({ company }),
	});

	return {
		kpis: (query.data?.kpis ?? null) as AnalyticsKpis | null,
		folderBreakdown: (query.data?.folderBreakdown ?? []) as FolderBreakdown[],
		isLoading: query.isLoading,
		isError: query.isError,
	};
}
