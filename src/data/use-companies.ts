import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchAllCompaniesMock, fetchCompaniesMock as fetchCompanies } from "./companies-mock-data";
import type { CompanySortState } from "./types";

interface CompanyQueryParams {
	search: string;
	sort: CompanySortState | null;
}

function buildCompanyFilterParams({ search, sort }: CompanyQueryParams) {
	return {
		q: search || undefined,
		sort: sort?.field,
		dir: sort?.direction,
	};
}

export function useCompanies(params: CompanyQueryParams) {
	const filterParams = buildCompanyFilterParams(params);

	const query = useInfiniteQuery({
		queryKey: ["companies", filterParams],
		queryFn: ({ pageParam }) => fetchCompanies({ ...filterParams, cursor: pageParam }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});

	const companies = query.data?.pages.flatMap((page) => page.companies) ?? [];

	return {
		companies,
		hasNextPage: query.hasNextPage,
		loadMore: query.fetchNextPage,
		isLoading: query.isLoading,
		isFetchingNextPage: query.isFetchingNextPage,
		error: query.error,
		refetch: query.refetch,
	};
}

export function useAllCompanies(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: ["companies-global"],
		queryFn: fetchAllCompaniesMock,
		enabled: options?.enabled ?? true,
	});
}

export function useProcurementCompanies() {
	const query = useInfiniteQuery({
		queryKey: ["procurementCompanies"],
		queryFn: ({ pageParam }) => fetchCompanies({ cursor: pageParam }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});

	// Auto-fetch all pages for complete sidebar navigation
	if (query.hasNextPage && !query.isFetchingNextPage) {
		query.fetchNextPage();
	}

	const companies = query.data?.pages.flatMap((page) => page.companies) ?? [];

	return {
		data: companies,
		isLoading: query.isLoading || query.isFetchingNextPage,
	};
}
