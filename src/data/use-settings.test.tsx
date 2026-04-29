import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getAccessToken, setTokens } from "@/data/auth";
import { createTestQueryClient, makeSettings, mockHostname } from "@/test-utils";
import type { ProfileClient } from "./clients/profile-client";
import { NetworkError } from "./errors";
import { fakeProfileClient, TestClientsProvider } from "./test-clients-provider";
import { useChangePassword, useSettings, useUpdateSettings } from "./use-settings";

const MOCK_SETTINGS = makeSettings();

let queryClient: QueryClient;

function wrapperFactory(client: ProfileClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ profile: client }}>
			<MemoryRouter initialEntries={["/"]}>{children}</MemoryRouter>
		</TestClientsProvider>
	);
}

beforeEach(() => {
	localStorage.clear();
	mockHostname("acme.localhost");
	setTokens("test-access");
	queryClient = createTestQueryClient();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useSettings", () => {
	test("fetches settings and returns data", async () => {
		const settings = vi.fn().mockResolvedValue(MOCK_SETTINGS);
		const client = fakeProfileClient({ settings });

		const { result } = renderHook(() => useSettings(), { wrapper: wrapperFactory(client) });

		expect(result.current.isLoading).toBe(true);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.data).toEqual(MOCK_SETTINGS);
		expect(result.current.error).toBeNull();
	});

	test("surfaces NetworkError as the query error", async () => {
		const client = fakeProfileClient({
			settings: () => Promise.reject(new NetworkError(new Error("offline"))),
		});

		const { result } = renderHook(() => useSettings(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(NetworkError);
		});
		expect(result.current.data).toBeUndefined();
	});
});

describe("useUpdateSettings", () => {
	test("calls client.update and invalidates the settings query on success", async () => {
		const update = vi.fn().mockResolvedValue({ ...MOCK_SETTINGS, first_name: "Пётр" });
		const client = fakeProfileClient({ update });

		queryClient.setQueryData(["settings"], MOCK_SETTINGS);

		const { result } = renderHook(() => useUpdateSettings(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			const updated = await result.current.mutateAsync({ first_name: "Пётр" });
			expect(updated.first_name).toBe("Пётр");
		});

		expect(update).toHaveBeenCalledOnce();
		expect(update.mock.calls[0][0]).toEqual({ first_name: "Пётр" });
		const state = queryClient.getQueryState(["settings"]);
		expect(state?.isInvalidated).toBe(true);
	});
});

describe("useChangePassword", () => {
	test("clears tokens on success", async () => {
		const changePassword = vi.fn().mockResolvedValue({ detail: "ok" });
		const client = fakeProfileClient({ changePassword });

		const { result } = renderHook(() => useChangePassword(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync({ currentPassword: "old123", newPassword: "new456" });
		});

		expect(changePassword).toHaveBeenCalledWith("old123", "new456");
		expect(getAccessToken()).toBeNull();
	});
});
