import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { vi } from "vitest";
import type { CompanySummary, ProcurementItem } from "@/data/types";

export function mockHostname(hostname: string) {
	vi.spyOn(window, "location", "get").mockReturnValue({
		...window.location,
		hostname,
	});
}

export function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
}

export function createQueryWrapper(queryClient: QueryClient) {
	return ({ children }: { children: ReactNode }) => QueryClientProvider({ client: queryClient, children });
}

export function makeItem(id: string, overrides: Partial<ProcurementItem> = {}): ProcurementItem {
	return {
		id,
		name: `Item ${id}`,
		status: "searching",
		annualQuantity: 100,
		currentPrice: 50,
		bestPrice: 40,
		averagePrice: 45,
		folderId: null,
		companyId: "company-1",
		...overrides,
	};
}

export function makeCompany(id: string, overrides: Partial<CompanySummary> = {}): CompanySummary {
	return {
		id,
		name: `Company ${id}`,
		isMain: false,
		responsibleEmployeeName: "Иванов Иван",
		addresses: [{ id: `addr-${id}`, name: "Офис", type: "office" }],
		employeeCount: 5,
		procurementItemCount: 10,
		...overrides,
	};
}
