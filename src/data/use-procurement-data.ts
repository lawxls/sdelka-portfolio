import { useMemo } from "react";
import { mockProcurementItems } from "./mock-data";
import type { ProcurementDataParams, ProcurementDataResult, ProcurementItem, SortField, Totals } from "./types";
import { getAnnualCost, getDeviation, getOverpayment } from "./types";

export function useProcurementData(params: ProcurementDataParams): ProcurementDataResult {
	const { search, filters, sort, page, pageSize } = params;

	return useMemo(() => {
		let filtered: ProcurementItem[] = mockProcurementItems;

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

		// Totals — computed on all filtered items before pagination
		const totals = computeTotals(filtered);
		const totalItems = filtered.length;

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

		// Paginate
		const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
		const clampedPage = Math.min(Math.max(1, page), totalPages);
		const start = (clampedPage - 1) * pageSize;
		const items = filtered.slice(start, start + pageSize);

		return {
			items,
			totalItems,
			totals,
			pageInfo: { currentPage: clampedPage, totalPages, pageSize },
		};
	}, [search, filters.deviation, filters.status, sort, page, pageSize]);
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
