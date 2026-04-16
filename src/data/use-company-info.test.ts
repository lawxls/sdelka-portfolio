import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper, createTestQueryClient, mockHostname } from "@/test-utils";
import { setTokens } from "./auth";
import { useCompanyInfo } from "./use-company-info";
import * as workspaceMock from "./workspace-mock-data";
import { _resetWorkspaceStore, _setCompanyInfo } from "./workspace-mock-data";

afterEach(() => {
	localStorage.clear();
	_resetWorkspaceStore();
	vi.restoreAllMocks();
});

describe("useCompanyInfo", () => {
	it("fetches company info from the mock store", async () => {
		mockHostname("acme.localhost");
		setTokens("valid-jwt");
		_setCompanyInfo({ name: "Acme Corp" });

		const { result } = renderHook(() => useCompanyInfo(), {
			wrapper: createQueryWrapper(createTestQueryClient()),
		});

		await waitFor(() => {
			expect(result.current.data).toEqual({ name: "Acme Corp" });
		});
	});

	it("returns error state on failure", async () => {
		mockHostname("acme.localhost");
		setTokens("valid-jwt");
		vi.spyOn(workspaceMock, "fetchCompanyInfoMock").mockRejectedValueOnce(new Error("boom"));

		const { result } = renderHook(() => useCompanyInfo(), {
			wrapper: createQueryWrapper(createTestQueryClient()),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
	});
});
