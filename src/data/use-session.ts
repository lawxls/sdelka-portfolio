import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { AUTH_CLEARED_EVENT, clearTokens, getAccessToken, setTokens } from "./auth";
import { useSessionClient } from "./clients-context";
import type {
	CheckEmailResult,
	ConfirmEmailInput,
	ConfirmEmailResult,
	ForgotPasswordInput,
	LoginInput,
	LoginResult,
	RegisterInput,
	RegisterResult,
	ResetPasswordInput,
} from "./domains/session";

export function useLogin() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (input: LoginInput): Promise<LoginResult> => {
			const result = await client.login(input);
			setTokens(result.access, result.refresh);
			return result;
		},
	});
}

/**
 * Local cleanup runs unconditionally — even if the backend call fails
 * (network down, cookie already expired) the user must still drop out of the
 * authed UI. `clearTokens` dispatches `AUTH_CLEARED_EVENT`, which
 * `useSessionBootstrap` consumes to redirect to /login.
 */
export function useLogout() {
	const client = useSessionClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (): Promise<void> => {
			try {
				await client.logout();
			} catch {
				// Tolerate backend failure; local cleanup below still runs.
			}
			clearTokens();
			queryClient.clear();
		},
	});
}

// Register does NOT auto-login; auto-login happens in `useConfirmEmail` after
// the user follows the email-confirmation link.
export function useRegister() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (input: RegisterInput): Promise<RegisterResult> => client.register(input),
	});
}

export function useConfirmEmail() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (input: ConfirmEmailInput): Promise<ConfirmEmailResult> => {
			const result = await client.confirmEmail(input);
			setTokens(result.access, result.refresh);
			return result;
		},
	});
}

export function useCheckEmail() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (email: string): Promise<CheckEmailResult> => client.checkEmail(email),
	});
}

// Anti-enumeration: backend always returns 200; pages must show the same
// success copy on either branch. Same applies to `useForgotPassword` below.
export function useResendConfirmation() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (email: string): Promise<void> => client.resendConfirmation(email),
	});
}

export function useForgotPassword() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (input: ForgotPasswordInput): Promise<void> => client.forgotPassword(input),
	});
}

export function useResetPassword() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (input: ResetPasswordInput): Promise<void> => client.resetPassword(input),
	});
}

export function useRequestPasswordChange() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (): Promise<void> => client.requestPasswordChange(),
	});
}

export type SessionStatus = "pending" | "authed" | "anon";

/**
 * Cold-load bootstrap. Three observable states:
 *
 *  - "pending": refresh in flight; the route shell renders a splash skeleton.
 *  - "authed":  access token present (either restored from sessionStorage or
 *               freshly minted by `/auth/refresh/`); admit the protected outlet.
 *  - "anon":    refresh failed (no/expired cookie) or `AUTH_CLEARED_EVENT`
 *               fired mid-session; redirect to /login.
 *
 * Fast path: if `sessionStorage` already holds an access token, skip the
 * refresh round-trip and start in `authed` directly. Saves a network call on
 * tab reloads where the token is still good; if it turns out to be stale, the
 * next API call's 401 triggers the refresh interceptor and recovers
 * transparently. The slow path (no token → fire refresh) covers the
 * cookie-only cold load (new tab, browser restart).
 *
 * Subscribes to `AUTH_CLEARED_EVENT` so logout and 401-after-refresh-failure
 * flows transition the route tree without any caller wiring.
 */
export function useSessionBootstrap(): SessionStatus {
	const client = useSessionClient();
	const [status, setStatus] = useState<SessionStatus>(() => (getAccessToken() ? "authed" : "pending"));

	useMountEffect(() => {
		let cancelled = false;

		if (!getAccessToken()) {
			client
				.refresh()
				.then((res) => {
					if (cancelled) return;
					setTokens(res.access, res.refresh);
					setStatus("authed");
				})
				.catch(() => {
					if (cancelled) return;
					setStatus("anon");
				});
		}

		function onCleared() {
			if (cancelled) return;
			setStatus("anon");
		}
		window.addEventListener(AUTH_CLEARED_EVENT, onCleared);

		return () => {
			cancelled = true;
			window.removeEventListener(AUTH_CLEARED_EVENT, onCleared);
		};
	});

	return status;
}
