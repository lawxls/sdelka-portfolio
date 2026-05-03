import { useCallback, useMemo, useState } from "react";

export interface ClientPagination<T> {
	visible: T[];
	hasNextPage: boolean;
	loadMore: () => void;
}

export function useClientPagination<T>(items: readonly T[], pageSize: number): ClientPagination<T> {
	const [visibleCount, setVisibleCount] = useState(pageSize);
	const visible = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
	const hasNextPage = visibleCount < items.length;
	const loadMore = useCallback(() => setVisibleCount((c) => c + pageSize), [pageSize]);
	return { visible, hasNextPage, loadMore };
}
