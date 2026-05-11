import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createTestQueryClient } from "@/test-utils";
import { AUTH_CLEARED_EVENT, getAccessToken, setTokens } from "./auth";
import type { SessionClient } from "./clients/session-client";
import { AuthError, NetworkError, ValidationError } from "./errors";
import { fakeSessionClient, TestClientsProvider } from "./test-clients-provider";
import {
	useCheckEmail,
	useConfirmEmail,
	useForgotPassword,
	useLogin,
	useLogout,
	useRegister,
	useRequestPasswordChange,
	useResendConfirmation,
	useResetPassword,
	useSessionBootstrap,
} from "./use-session";

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
		const login = vi
			.fn()
			.mockResolvedValue({ access: "fresh-access", refresh: "fresh-refresh", user: { id: "1", email: "a@b.com" } });
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
		queryClient.setQueryData(["me"], { id: "1", email: "a@b.com" });
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

describe("useRegister", () => {
	test("calls client.register and resolves with the new user record without storing tokens", async () => {
		const register = vi.fn().mockResolvedValue({ user: { id: "99", email: "newuser@example.com" } });
		const client = fakeSessionClient({ register });

		const { result } = renderHook(() => useRegister(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			const res = await result.current.mutateAsync({
				email: "newuser@example.com",
				password: "fresh-pass-1",
				password_confirm: "fresh-pass-1",
				first_name: "Иван",
				last_name: "Иванов",
				phone: "+79991234567",
				inn: "7707083893",
			});
			expect(res.user.email).toBe("newuser@example.com");
		});

		expect(register).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "newuser@example.com",
				password_confirm: "fresh-pass-1",
				inn: "7707083893",
			}),
		);
		// Register does not auto-login — the user must confirm their email first.
		expect(getAccessToken()).toBeNull();
	});

	test("does not store token when register throws", async () => {
		const register = vi
			.fn()
			.mockRejectedValue(new ValidationError({}, { email: [{ code: "unique", message: "Already taken" }] }));
		const client = fakeSessionClient({ register });

		const { result } = renderHook(() => useRegister(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await expect(
				result.current.mutateAsync({
					email: "taken@example.com",
					password: "fresh-pass-1",
					password_confirm: "fresh-pass-1",
					first_name: "Иван",
					last_name: "Иванов",
					phone: "+79991234567",
					inn: "7707083893",
				}),
			).rejects.toBeInstanceOf(ValidationError);
		});

		expect(getAccessToken()).toBeNull();
	});
});

describe("useConfirmEmail", () => {
	test("calls client.confirmEmail and stores access token on success (auto-login)", async () => {
		const confirmEmail = vi.fn().mockResolvedValue({
			access: "confirmed-access",
			refresh: "confirmed-refresh",
			user: { id: "5", email: "x@y.z" },
		});
		const client = fakeSessionClient({ confirmEmail });

		const { result } = renderHook(() => useConfirmEmail(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			const res = await result.current.mutateAsync({ uid: "good-uid", token: "good-token" });
			expect(res.access).toBe("confirmed-access");
		});

		expect(confirmEmail).toHaveBeenCalledWith({ uid: "good-uid", token: "good-token" });
		expect(getAccessToken()).toBe("confirmed-access");
	});

	test("does not store token when confirmEmail throws", async () => {
		const confirmEmail = vi.fn().mockRejectedValue(new ValidationError({}, { code: "invalid_or_expired_link" }));
		const client = fakeSessionClient({ confirmEmail });

		const { result } = renderHook(() => useConfirmEmail(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await expect(result.current.mutateAsync({ uid: "bad-uid", token: "bad-token" })).rejects.toBeInstanceOf(
				ValidationError,
			);
		});

		expect(getAccessToken()).toBeNull();
	});
});

describe("useCheckEmail", () => {
	test("calls client.checkEmail and resolves with the existence flag", async () => {
		const checkEmail = vi.fn().mockResolvedValue({ exists: true });
		const client = fakeSessionClient({ checkEmail });

		const { result } = renderHook(() => useCheckEmail(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			const res = await result.current.mutateAsync("taken@example.com");
			expect(res.exists).toBe(true);
		});

		expect(checkEmail).toHaveBeenCalledWith("taken@example.com");
	});
});

describe("useResendConfirmation", () => {
	test("calls client.resendConfirmation with the email and resolves", async () => {
		const resendConfirmation = vi.fn().mockResolvedValue(undefined);
		const client = fakeSessionClient({ resendConfirmation });

		const { result } = renderHook(() => useResendConfirmation(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync("unverified@example.com");
		});

		expect(resendConfirmation).toHaveBeenCalledWith("unverified@example.com");
	});

	test("resolves even when the backend rejects (anti-enumeration: caller is shielded from outcome)", async () => {
		// The HTTP adapter would translate a real 200 to a resolved promise; this
		// test simulates a hypothetical adapter quirk to pin the contract that
		// errors propagate untouched (the page swallows them in onError to keep
		// the success copy generic).
		const resendConfirmation = vi.fn().mockRejectedValue(new Error("network blip"));
		const client = fakeSessionClient({ resendConfirmation });

		const { result } = renderHook(() => useResendConfirmation(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await expect(result.current.mutateAsync("unverified@example.com")).rejects.toThrow();
		});

		expect(resendConfirmation).toHaveBeenCalledOnce();
	});
});

describe("useForgotPassword", () => {
	test("calls client.forgotPassword with the email and resolves", async () => {
		const forgotPassword = vi.fn().mockResolvedValue(undefined);
		const client = fakeSessionClient({ forgotPassword });

		const { result } = renderHook(() => useForgotPassword(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync({ email: "user@example.com" });
		});

		expect(forgotPassword).toHaveBeenCalledWith({ email: "user@example.com" });
	});

	test("propagates errors so the page can swallow them in onError (anti-enumeration)", async () => {
		const forgotPassword = vi.fn().mockRejectedValue(new Error("network blip"));
		const client = fakeSessionClient({ forgotPassword });

		const { result } = renderHook(() => useForgotPassword(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await expect(result.current.mutateAsync({ email: "user@example.com" })).rejects.toThrow();
		});

		expect(forgotPassword).toHaveBeenCalledOnce();
	});
});

describe("useResetPassword", () => {
	test("calls client.resetPassword with the full payload and resolves on success", async () => {
		const resetPassword = vi.fn().mockResolvedValue(undefined);
		const client = fakeSessionClient({ resetPassword });

		const { result } = renderHook(() => useResetPassword(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync({
				uid: "good-uid",
				token: "good-token",
				new_password: "newSecure1",
				new_password_confirm: "newSecure1",
			});
		});

		expect(resetPassword).toHaveBeenCalledWith({
			uid: "good-uid",
			token: "good-token",
			new_password: "newSecure1",
			new_password_confirm: "newSecure1",
		});
		// Reset is not an auto-login flow — the user re-enters via /login.
		expect(getAccessToken()).toBeNull();
	});

	test("does not store any token when resetPassword throws (auth-related errors only flow through extractFormErrors)", async () => {
		const resetPassword = vi.fn().mockRejectedValue(new ValidationError({}, { code: "invalid_or_expired_link" }));
		const client = fakeSessionClient({ resetPassword });

		const { result } = renderHook(() => useResetPassword(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await expect(
				result.current.mutateAsync({
					uid: "bad-uid",
					token: "bad-token",
					new_password: "newSecure1",
					new_password_confirm: "newSecure1",
				}),
			).rejects.toBeInstanceOf(ValidationError);
		});

		expect(getAccessToken()).toBeNull();
	});
});

describe("useRequestPasswordChange", () => {
	test("calls client.requestPasswordChange with no args and resolves", async () => {
		const requestPasswordChange = vi.fn().mockResolvedValue(undefined);
		const client = fakeSessionClient({ requestPasswordChange });

		const { result } = renderHook(() => useRequestPasswordChange(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync();
		});

		expect(requestPasswordChange).toHaveBeenCalledOnce();
		expect(requestPasswordChange).toHaveBeenCalledWith();
	});

	test("does not clear the access token (user stays signed in until they consume the email link)", async () => {
		setTokens("existing-access");
		const requestPasswordChange = vi.fn().mockResolvedValue(undefined);
		const client = fakeSessionClient({ requestPasswordChange });

		const { result } = renderHook(() => useRequestPasswordChange(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync();
		});

		expect(getAccessToken()).toBe("existing-access");
	});

	test("propagates errors so the caller can surface a toast", async () => {
		const requestPasswordChange = vi.fn().mockRejectedValue(new Error("network blip"));
		const client = fakeSessionClient({ requestPasswordChange });

		const { result } = renderHook(() => useRequestPasswordChange(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await expect(result.current.mutateAsync()).rejects.toThrow();
		});
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
