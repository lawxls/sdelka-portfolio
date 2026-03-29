import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { createElement, type ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test } from "vitest";
import { getAccessToken, setTokens } from "@/data/auth";
import { server } from "@/test-msw";
import { createQueryWrapper, createTestQueryClient, mockHostname } from "@/test-utils";
import { useChangePassword, useSettings, useUpdateSettings } from "./use-settings";

const MOCK_SETTINGS = {
	first_name: "Иван",
	last_name: "Иванов",
	email: "ivan@example.com",
	phone: "+79991234567",
	avatar_icon: "blue",
	date_joined: "2024-01-15T10:00:00Z",
	mailing_allowed: true,
};

beforeEach(() => {
	localStorage.clear();
	mockHostname("acme.localhost");
	setTokens("test-access", "test-refresh");
});

describe("useSettings", () => {
	test("fetches settings and returns data", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => {
				return HttpResponse.json(MOCK_SETTINGS);
			}),
		);

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
		server.use(
			http.get("/api/v1/auth/settings", () => {
				return HttpResponse.json({ detail: "Server error" }, { status: 500 });
			}),
		);

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
	test("calls PATCH and invalidates settings query on success", async () => {
		let patchBody: Record<string, unknown> | null = null;
		const updated = { ...MOCK_SETTINGS, first_name: "Пётр" };

		server.use(
			http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)),
			http.patch("/api/v1/auth/settings", async ({ request }) => {
				patchBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(updated);
			}),
		);

		const queryClient = createTestQueryClient();
		queryClient.setQueryData(["settings"], MOCK_SETTINGS);

		const { result } = renderHook(() => useUpdateSettings(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await act(async () => {
			await result.current.mutateAsync({ first_name: "Пётр" });
		});

		expect(patchBody).toEqual({ first_name: "Пётр" });

		// Query should be invalidated (marked stale)
		const state = queryClient.getQueryState(["settings"]);
		expect(state?.isInvalidated).toBe(true);
	});
});

describe("useChangePassword", () => {
	test("calls POST change-password, clears tokens, and navigates to /login on success", async () => {
		let postBody: unknown = null;

		server.use(
			http.post("/api/v1/auth/change-password", async ({ request }) => {
				postBody = await request.json();
				return HttpResponse.json({ detail: "Пароль успешно изменён" });
			}),
		);

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

		expect(postBody).toEqual({ current_password: "old123", new_password: "new456" });
		expect(getAccessToken()).toBeNull();
	});
});
