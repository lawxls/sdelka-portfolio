import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useCompaniesClient } from "./clients-context";
import { keys } from "./query-keys";
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
	const client = useCompaniesClient();
	const filterParams = buildCompanyFilterParams(params);

	const query = useInfiniteQuery({
		queryKey: keys.companies.list(filterParams),
		queryFn: ({ pageParam }) => client.list({ ...filterParams, cursor: pageParam }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});

	const companies = query.data?.pages.flatMap((page) => page.items) ?? [];

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
	const client = useCompaniesClient();
	return useQuery({
		queryKey: keys.companies.listAll(),
		queryFn: () => client.listAll(),
		enabled: options?.enabled ?? true,
	});
}

export function useProcurementCompanies() {
	const client = useCompaniesClient();
	const query = useInfiniteQuery({
		queryKey: keys.companies.procurement(),
		queryFn: ({ pageParam }) => client.list({ cursor: pageParam }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});

	if (query.hasNextPage && !query.isFetchingNextPage) {
		query.fetchNextPage();
	}

	const companies = query.data?.pages.flatMap((page) => page.items) ?? [];

	return {
		data: companies,
		isLoading: query.isLoading || query.isFetchingNextPage,
	};
}
