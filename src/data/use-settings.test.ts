import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getAccessToken, setTokens } from "@/data/auth";
import { createQueryWrapper, createTestQueryClient, makeSettings, mockHostname } from "@/test-utils";
import * as settingsApi from "./settings-api";
import { useChangePassword, useSettings, useUpdateSettings } from "./use-settings";
import { _resetWorkspaceStore, _setUserSettings } from "./workspace-mock-data";

const MOCK_SETTINGS = makeSettings();

beforeEach(() => {
	localStorage.clear();
	mockHostname("acme.localhost");
	setTokens("test-access");
	_setUserSettings(MOCK_SETTINGS);
});

afterEach(() => {
	_resetWorkspaceStore();
	vi.restoreAllMocks();
});

describe("useSettings", () => {
	test("fetches settings and returns data", async () => {
		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useSettings(), {
			wrapper: createQueryWrapper(queryClient),
		});

		expect(result.current.isLoading).toBe(true);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.data).toEqual(MOCK_SETTINGS);
		expect(result.current.error).toBeNull();
	});

	test("returns error on fetch failure", async () => {
		vi.spyOn(settingsApi, "fetchSettings").mockRejectedValueOnce(new Error("boom"));

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useSettings(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.error).not.toBeNull();
		});

		expect(result.current.data).toBeUndefined();
	});
});

describe("useUpdateSettings", () => {
	test("persists the patch and invalidates settings query on success", async () => {
		const queryClient = createTestQueryClient();
		queryClient.setQueryData(["settings"], MOCK_SETTINGS);

		const { result } = renderHook(() => useUpdateSettings(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await act(async () => {
			const updated = await result.current.mutateAsync({ first_name: "Пётр" });
			expect(updated.first_name).toBe("Пётр");
		});

		const state = queryClient.getQueryState(["settings"]);
		expect(state?.isInvalidated).toBe(true);
	});
});

describe("useChangePassword", () => {
	test("clears tokens and navigates to /login on success", async () => {
		const queryClient = createTestQueryClient();

		function Wrapper({ children }: { children: ReactNode }) {
			return createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(MemoryRouter, { initialEntries: ["/profile?tab=settings"] }, children),
			);
		}

		const { result } = renderHook(() => useChangePassword(), { wrapper: Wrapper });

		await act(async () => {
			await result.current.mutateAsync({ currentPassword: "old123", newPassword: "new456" });
		});

		expect(getAccessToken()).toBeNull();
	});
});
