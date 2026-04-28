import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/test-utils";
import type { CompaniesClient } from "./clients/companies-client";
import type { CompanySummary, CursorPage } from "./domains/companies";
import { fakeCompaniesClient, TestClientsProvider } from "./test-clients-provider";
import { useCompanies, useProcurementCompanies } from "./use-companies";

let queryClient: QueryClient;

const DEFAULT_PARAMS = { search: "", sort: null };

function makeSummary(id: string, overrides: Partial<CompanySummary> = {}): CompanySummary {
	return {
		id,
		name: `Company ${id}`,
		isMain: false,
		addresses: [{ id: `addr-${id}`, name: "Офис", address: "г. Москва", isMain: true }],
		employeeCount: 0,
		procurementItemCount: 0,
		...overrides,
	};
}

function wrapperFactory(client: CompaniesClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ companies: client }}>
			{children}
		</TestClientsProvider>
	);
}

beforeEach(() => {
	queryClient = createTestQueryClient();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useCompanies", () => {
	it("fetches first page from the client", async () => {
		const list = vi.fn().mockResolvedValue({
			items: [makeSummary("c1"), makeSummary("c2")],
			nextCursor: "c3",
		} satisfies CursorPage<CompanySummary>);
		const client = fakeCompaniesClient({ list });

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.companies).toHaveLength(2));
		expect(result.current.hasNextPage).toBe(true);
		expect(list).toHaveBeenCalledWith({ q: undefined, sort: undefined, dir: undefined, cursor: undefined });
	});

	it("returns loading state initially", () => {
		const client = fakeCompaniesClient({ list: () => new Promise<CursorPage<CompanySummary>>(() => {}) });
		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), { wrapper: wrapperFactory(client) });
		expect(result.current.isLoading).toBe(true);
	});

	it("hasNextPage is false when nextCursor is null", async () => {
		const list = vi.fn().mockResolvedValue({ items: [makeSummary("c1")], nextCursor: null });
		const client = fakeCompaniesClient({ list });

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.companies).toHaveLength(1));
		expect(result.current.hasNextPage).toBe(false);
	});

	it("loads next page via loadMore using returned cursor", async () => {
		const list = vi
			.fn()
			.mockResolvedValueOnce({ items: [makeSummary("c1"), makeSummary("c2")], nextCursor: "c3" })
			.mockResolvedValueOnce({ items: [makeSummary("c3")], nextCursor: null });
		const client = fakeCompaniesClient({ list });

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.companies).toHaveLength(2));
		result.current.loadMore();
		await waitFor(() => expect(result.current.companies).toHaveLength(3));
		expect(list).toHaveBeenLastCalledWith({ q: undefined, sort: undefined, dir: undefined, cursor: "c3" });
	});

	it("threads search and sort params into the client", async () => {
		const list = vi.fn().mockResolvedValue({ items: [], nextCursor: null });
		const client = fakeCompaniesClient({ list });

		renderHook(() => useCompanies({ search: "альф", sort: { field: "name", direction: "desc" } }), {
			wrapper: wrapperFactory(client),
		});

		await waitFor(() => expect(list).toHaveBeenCalled());
		expect(list).toHaveBeenCalledWith({ q: "альф", sort: "name", dir: "desc", cursor: undefined });
	});

	it("surfaces errors from the client", async () => {
		const list = vi.fn().mockRejectedValue(new Error("boom"));
		const client = fakeCompaniesClient({ list });

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.error).toBeTruthy());
	});

	it("refetch retries after error", async () => {
		const list = vi
			.fn()
			.mockRejectedValueOnce(new Error("boom"))
			.mockResolvedValueOnce({ items: [], nextCursor: null });
		const client = fakeCompaniesClient({ list });

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.error).toBeTruthy());
		result.current.refetch();
		await waitFor(() => expect(result.current.error).toBeFalsy());
		expect(list).toHaveBeenCalledTimes(2);
	});
});

describe("useProcurementCompanies", () => {
	it("auto-paginates through all pages", async () => {
		const list = vi
			.fn()
			.mockResolvedValueOnce({ items: [makeSummary("c1")], nextCursor: "c2" })
			.mockResolvedValueOnce({ items: [makeSummary("c2")], nextCursor: null });
		const client = fakeCompaniesClient({ list });

		const { result } = renderHook(() => useProcurementCompanies(), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.data).toHaveLength(2));
		expect(result.current.isLoading).toBe(false);
	});
});
