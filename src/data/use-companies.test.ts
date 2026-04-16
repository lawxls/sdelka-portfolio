import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper, createTestQueryClient, mockHostname } from "@/test-utils";
import { setTokens } from "./auth";
import * as companiesMock from "./companies-mock-data";
import type { Company } from "./types";
import { useCompanies, useProcurementCompanies } from "./use-companies";

let queryClient: QueryClient;

const DEFAULT_PARAMS = { search: "", sort: null };

function makeStored(id: string, overrides: Partial<Company> = {}): Company {
	return {
		id,
		name: `Company ${id}`,
		industry: "",
		website: "",
		description: "",
		preferredPayment: "",
		preferredDelivery: "",
		additionalComments: "",
		isMain: false,
		employeeCount: 0,
		procurementItemCount: 0,
		addresses: [
			{
				id: `addr-${id}`,
				name: "Офис",
				type: "office",
				postalCode: "",
				address: "г. Москва",
				contactPerson: "",
				phone: "",
				isMain: true,
			},
		],
		employees: [],
		...overrides,
	};
}

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	setTokens("test-jwt", "test-refresh");
	companiesMock._resetCompaniesStore();
});

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("useCompanies", () => {
	it("fetches first page of companies from the mock store", async () => {
		companiesMock._setCompanies(Array.from({ length: 35 }, (_, i) => makeStored(`c${i + 1}`)));

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.companies.length).toBeGreaterThan(0);
		});
		expect(result.current.hasNextPage).toBe(true);
	});

	it("returns loading state initially", () => {
		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), {
			wrapper: createQueryWrapper(queryClient),
		});
		expect(result.current.isLoading).toBe(true);
	});

	it("hasNextPage is false when result fits on one page", async () => {
		companiesMock._setCompanies([makeStored("c1")]);

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.companies).toHaveLength(1);
		});
		expect(result.current.hasNextPage).toBe(false);
	});

	it("loads next page via loadMore", async () => {
		companiesMock._setCompanies(Array.from({ length: 50 }, (_, i) => makeStored(`c${i + 1}`)));

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.companies.length).toBe(30);
		});

		result.current.loadMore();

		await waitFor(() => {
			expect(result.current.companies.length).toBe(50);
		});
		expect(result.current.hasNextPage).toBe(false);
	});

	it("filters by search term", async () => {
		companiesMock._setCompanies([makeStored("c1", { name: "Альфа" }), makeStored("c2", { name: "Бета" })]);

		const { result } = renderHook(() => useCompanies({ search: "альф", sort: null }), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.companies).toHaveLength(1);
		});
		expect(result.current.companies[0].name).toBe("Альфа");
	});

	it("returns error state when fetch fails", async () => {
		vi.spyOn(companiesMock, "fetchCompaniesMock").mockRejectedValue(new Error("boom"));

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.error).toBeTruthy();
		});
	});

	it("refetch retries after error", async () => {
		const spy = vi
			.spyOn(companiesMock, "fetchCompaniesMock")
			.mockRejectedValueOnce(new Error("boom"))
			.mockResolvedValueOnce({ companies: [], nextCursor: null });

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.error).toBeTruthy();
		});

		result.current.refetch();

		await waitFor(() => {
			expect(result.current.error).toBeFalsy();
		});
		expect(spy).toHaveBeenCalledTimes(2);
	});
});

describe("useProcurementCompanies", () => {
	it("fetches all companies for procurement sidebar", async () => {
		companiesMock._setCompanies([
			makeStored("c1", { procurementItemCount: 15 }),
			makeStored("c2", { procurementItemCount: 8 }),
		]);

		const { result } = renderHook(() => useProcurementCompanies(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.data).toHaveLength(2);
		});
		const counts = result.current.data?.map((c) => c.procurementItemCount).sort((a, b) => b - a);
		expect(counts).toEqual([15, 8]);
	});

	it("auto-paginates through all pages", async () => {
		companiesMock._setCompanies(Array.from({ length: 45 }, (_, i) => makeStored(`c${i + 1}`)));

		const { result } = renderHook(() => useProcurementCompanies(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.data).toHaveLength(45);
		});
		expect(result.current.isLoading).toBe(false);
	});
});
