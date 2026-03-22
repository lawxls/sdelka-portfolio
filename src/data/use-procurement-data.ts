import { useCallback, useMemo, useRef, useState } from "react";
import { mockProcurementItems } from "./mock-data";
import type { ProcurementDataParams, ProcurementDataResult, ProcurementItem, SortField, Totals } from "./types";
import { getAnnualCost, getDeviation, getOverpayment } from "./types";

export function useProcurementData(params: ProcurementDataParams): ProcurementDataResult {
	const { search, filters, sort, folder, items: sourceItems, batchSize } = params;

	const allFiltered = useMemo(() => {
		let filtered: ProcurementItem[] = sourceItems ?? mockProcurementItems;

		// Folder filter
		if (folder != null) {
			if (folder === "none") {
				filtered = filtered.filter((item) => item.folderId == null);
			} else {
				filtered = filtered.filter((item) => item.folderId === folder);
			}
		}

		// Search
		if (search) {
			const query = search.toLowerCase();
			filtered = filtered.filter((item) => item.name.toLowerCase().includes(query));
		}

		// Deviation filter
		if (filters.deviation !== "all") {
			filtered = filtered.filter((item) => {
				const dev = getDeviation(item);
				if (dev == null) return false;
				return filters.deviation === "overpaying" ? dev > 0 : dev < 0;
			});
		}

		// Status filter
		if (filters.status !== "all") {
			filtered = filtered.filter((item) => item.status === filters.status);
		}

		// Sort
		if (sort) {
			filtered = [...filtered].sort((a, b) => {
				const valA = getSortValue(a, sort.field);
				const valB = getSortValue(b, sort.field);

				// Nulls always sort last regardless of direction
				if (valA == null && valB == null) return 0;
				if (valA == null) return 1;
				if (valB == null) return -1;

				const cmp = valA - valB;
				return sort.direction === "asc" ? cmp : -cmp;
			});
		}

		return filtered;
	}, [sourceItems, folder, search, filters.deviation, filters.status, sort]);

	const [cursor, setCursor] = useState(batchSize);
	const prevResetKeyRef = useRef(resetKeyFor(search, filters.deviation, filters.status, sort, folder));

	const currentResetKey = resetKeyFor(search, filters.deviation, filters.status, sort, folder);
	if (prevResetKeyRef.current !== currentResetKey) {
		prevResetKeyRef.current = currentResetKey;
		setCursor(batchSize);
	}

	const effectiveCursor = Math.min(cursor, allFiltered.length);
	const items = useMemo(() => allFiltered.slice(0, effectiveCursor), [allFiltered, effectiveCursor]);
	const hasNextPage = effectiveCursor < allFiltered.length;

	const totals = useMemo(() => computeTotals(allFiltered), [allFiltered]);

	const loadMore = useCallback(() => {
		setCursor((prev) => prev + batchSize);
	}, [batchSize]);

	return {
		items,
		totalItems: allFiltered.length,
		totals,
		hasNextPage,
		loadMore,
	};
}

function resetKeyFor(
	search: string,
	deviation: string,
	status: string,
	sort: { field: string; direction: string } | null,
	folder: string | undefined,
): string {
	return `${search}\0${deviation}\0${status}\0${sort?.field}\0${sort?.direction}\0${folder}`;
}

function getSortValue(item: ProcurementItem, field: SortField): number | null {
	switch (field) {
		case "annualCost":
			return getAnnualCost(item);
		case "currentPrice":
			return item.currentPrice;
		case "bestPrice":
			return item.bestPrice;
		case "averagePrice":
			return item.averagePrice;
		case "deviation":
			return getDeviation(item);
		case "overpayment":
			return getOverpayment(item);
	}
}

function computeTotals(items: ProcurementItem[]): Totals {
	let totalOverpayment = 0;
	let totalSavings = 0;

	for (const item of items) {
		const overpayment = getOverpayment(item);
		if (overpayment == null) continue;
		if (overpayment > 0) {
			totalOverpayment += overpayment;
		} else {
			totalSavings += Math.abs(overpayment);
		}
	}

	return {
		totalDeviation: totalOverpayment - totalSavings,
		totalOverpayment,
		totalSavings,
		itemCount: items.length,
	};
}
