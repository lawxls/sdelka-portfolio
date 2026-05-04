import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createTestQueryClient } from "@/test-utils";
import { AUTH_CLEARED_EVENT, getAccessToken, setTokens } from "./auth";
import type { SessionClient } from "./clients/session-client";
import { AuthError, NetworkError } from "./errors";
import { fakeSessionClient, TestClientsProvider } from "./test-clients-provider";
import { useLogin, useLogout, useSessionBootstrap } from "./use-session";

let queryClient: QueryClient;

function wrapperFactory(client: SessionClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ session: client }}>
			{children}
		</TestClientsProvider>
	);
}

beforeEach(() => {
	sessionStorage.clear();
	localStorage.clear();
	queryClient = createTestQueryClient();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useLogin", () => {
	test("calls client.login and stores access token on success", async () => {
		const login = vi.fn().mockResolvedValue({ access: "fresh-access", user: { id: 1, email: "a@b.com" } });
		const client = fakeSessionClient({ login });

		const { result } = renderHook(() => useLogin(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			const res = await result.current.mutateAsync({ email: "a@b.com", password: "pass1234" });
			expect(res.user.email).toBe("a@b.com");
		});

		expect(login).toHaveBeenCalledWith({ email: "a@b.com", password: "pass1234" });
		expect(getAccessToken()).toBe("fresh-access");
	});

	test("does not store token when login throws", async () => {
		const login = vi.fn().mockRejectedValue(new AuthError(401, { code: "invalid_credentials" }));
		const client = fakeSessionClient({ login });

		const { result } = renderHook(() => useLogin(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await expect(result.current.mutateAsync({ email: "a@b.com", password: "wrong" })).rejects.toBeInstanceOf(
				AuthError,
			);
		});

		expect(getAccessToken()).toBeNull();
	});
});

describe("useLogout", () => {
	test("calls client.logout, clears the access token, and dispatches AUTH_CLEARED_EVENT", async () => {
		setTokens("existing-access");
		const logout = vi.fn().mockResolvedValue(undefined);
		const client = fakeSessionClient({ logout });
		const onCleared = vi.fn();
		window.addEventListener(AUTH_CLEARED_EVENT, onCleared);

		const { result } = renderHook(() => useLogout(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync();
		});

		expect(logout).toHaveBeenCalledOnce();
		expect(getAccessToken()).toBeNull();
		expect(onCleared).toHaveBeenCalledOnce();

		window.removeEventListener(AUTH_CLEARED_EVENT, onCleared);
	});

	test("clears the react-query cache so the next signed-in user starts fresh", async () => {
		setTokens("existing-access");
		queryClient.setQueryData(["me"], { id: 1, email: "a@b.com" });
		queryClient.setQueryData(["companies"], [{ id: "company-1" }]);

		const logout = vi.fn().mockResolvedValue(undefined);
		const client = fakeSessionClient({ logout });

		const { result } = renderHook(() => useLogout(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync();
		});

		expect(queryClient.getQueryData(["me"])).toBeUndefined();
		expect(queryClient.getQueryData(["companies"])).toBeUndefined();
	});

	test("still cleans up locally when the backend logout call rejects", async () => {
		setTokens("existing-access");
		const logout = vi.fn().mockRejectedValue(new NetworkError(new Error("offline")));
		const client = fakeSessionClient({ logout });

		const { result } = renderHook(() => useLogout(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync();
		});

		expect(logout).toHaveBeenCalledOnce();
		expect(getAccessToken()).toBeNull();
	});

	test("tolerates a 4xx from /auth/logout/ (already logged out elsewhere)", async () => {
		setTokens("existing-access");
		const logout = vi.fn().mockRejectedValue(new AuthError(401, { code: "refresh_invalid" }));
		const client = fakeSessionClient({ logout });

		const { result } = renderHook(() => useLogout(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync();
		});

		expect(getAccessToken()).toBeNull();
	});
});

describe("useSessionBootstrap", () => {
	test("fast path: when sessionStorage holds an access token, starts authed and skips refresh", () => {
		sessionStorage.setItem("auth-access-token", "existing-access");
		const refresh = vi.fn();
		const client = fakeSessionClient({ refresh });

		const { result } = renderHook(() => useSessionBootstrap(), { wrapper: wrapperFactory(client) });

		expect(result.current).toBe("authed");
		expect(refresh).not.toHaveBeenCalled();
	});

	test("initial state is pending while refresh is in flight", () => {
		const refresh = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
		const client = fakeSessionClient({ refresh });

		const { result } = renderHook(() => useSessionBootstrap(), { wrapper: wrapperFactory(client) });

		expect(result.current).toBe("pending");
	});

	test("resolves to authed after successful refresh and stores access token", async () => {
		const refresh = vi.fn().mockResolvedValue({ access: "new-access" });
		const client = fakeSessionClient({ refresh });

		const { result } = renderHook(() => useSessionBootstrap(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current).toBe("authed");
		});
		expect(getAccessToken()).toBe("new-access");
	});

	test("resolves to anon when refresh throws AuthError", async () => {
		const refresh = vi.fn().mockRejectedValue(new AuthError(401, { code: "refresh_invalid" }));
		const client = fakeSessionClient({ refresh });

		const { result } = renderHook(() => useSessionBootstrap(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current).toBe("anon");
		});
		expect(getAccessToken()).toBeNull();
	});

	test("transitions to anon when AUTH_CLEARED_EVENT fires after authed", async () => {
		const refresh = vi.fn().mockResolvedValue({ access: "new-access" });
		const client = fakeSessionClient({ refresh });

		const { result } = renderHook(() => useSessionBootstrap(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current).toBe("authed");
		});

		await act(async () => {
			window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
		});

		await waitFor(() => {
			expect(result.current).toBe("anon");
		});
	});

	test("calls refresh exactly once across re-renders", async () => {
		const refresh = vi.fn().mockResolvedValue({ access: "new-access" });
		const client = fakeSessionClient({ refresh });

		const { result, rerender } = renderHook(() => useSessionBootstrap(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current).toBe("authed");
		});

		rerender();
		rerender();
		rerender();

		expect(refresh).toHaveBeenCalledTimes(1);
	});
});
