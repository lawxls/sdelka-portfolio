import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test-msw";
import { createQueryWrapper, createTestQueryClient, mockHostname } from "@/test-utils";
import { setTokens } from "./auth";
import { useCompanyInfo } from "./use-company-info";

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("useCompanyInfo", () => {
	it("fetches company info and returns data", async () => {
		mockHostname("acme.localhost");
		setTokens("valid-jwt", "valid-refresh");

		server.use(
			http.get("/api/v1/company/info/", () => {
				return HttpResponse.json({ name: "Acme Corp" });
			}),
		);

		const { result } = renderHook(() => useCompanyInfo(), {
			wrapper: createQueryWrapper(createTestQueryClient()),
		});

		await waitFor(() => {
			expect(result.current.data).toEqual({ name: "Acme Corp" });
		});
	});

	it("returns error state on failure", async () => {
		mockHostname("acme.localhost");
		setTokens("valid-jwt", "valid-refresh");

		server.use(
			http.get("/api/v1/company/info/", () => {
				return HttpResponse.json({ detail: "error" }, { status: 500 });
			}),
		);

		const { result } = renderHook(() => useCompanyInfo(), {
			wrapper: createQueryWrapper(createTestQueryClient()),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
	});
});
