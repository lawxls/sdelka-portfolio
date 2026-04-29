import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createTestQueryClient } from "@/test-utils";
import type { CompanyInfoClient } from "./clients/company-info-client";
import { NetworkError } from "./errors";
import { fakeCompanyInfoClient, TestClientsProvider } from "./test-clients-provider";
import { useCompanyInfo } from "./use-company-info";

let queryClient: QueryClient;

function wrapperFactory(client: CompanyInfoClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ companyInfo: client }}>
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

describe("useCompanyInfo", () => {
	test("returns CompanyInfo from client.get()", async () => {
		const get = vi.fn().mockResolvedValue({ name: "Acme Corp" });
		const client = fakeCompanyInfoClient({ get });

		const { result } = renderHook(() => useCompanyInfo(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.data).toEqual({ name: "Acme Corp" });
		});
		expect(get).toHaveBeenCalledTimes(1);
	});

	test("surfaces NetworkError as the query error", async () => {
		const client = fakeCompanyInfoClient({
			get: () => Promise.reject(new NetworkError(new Error("offline"))),
		});

		const { result } = renderHook(() => useCompanyInfo(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(NetworkError);
		});
	});
});
