import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test-msw";
import { setToken } from "./auth";
import { useCompanyInfo } from "./use-company-info";

function mockHostname(hostname: string) {
	vi.spyOn(window, "location", "get").mockReturnValue({
		...window.location,
		hostname,
	});
}

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

function createWrapper() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return ({ children }: { children: ReactNode }) => QueryClientProvider({ client: qc, children });
}

describe("useCompanyInfo", () => {
	it("fetches company info and returns data", async () => {
		mockHostname("acme.localhost");
		setToken("valid-jwt");

		server.use(
			http.get("/api/v1/company/info/", () => {
				return HttpResponse.json({ name: "Acme Corp" });
			}),
		);

		const { result } = renderHook(() => useCompanyInfo(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.data).toEqual({ name: "Acme Corp" });
		});
	});

	it("returns error state on failure", async () => {
		mockHostname("acme.localhost");
		setToken("valid-jwt");

		server.use(
			http.get("/api/v1/company/info/", () => {
				return HttpResponse.json({ detail: "error" }, { status: 500 });
			}),
		);

		const { result } = renderHook(() => useCompanyInfo(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
	});
});
