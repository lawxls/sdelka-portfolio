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

/**
 * Mutation hook for the login form. On success stores the access token in
 * `sessionStorage` (the refresh cookie is set server-side and is not
 * accessible to JS) and resolves with the user record so callers can route
 * post-login. Errors propagate untouched — the caller translates them via
 * `extractFormErrors` to surface field-level UI.
 */
export function useLogin() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (input: LoginInput): Promise<LoginResult> => {
			const result = await client.login(input);
			setTokens(result.access);
			return result;
		},
	});
}

/**
 * Sign the user out. Local cleanup runs unconditionally — even if the backend
 * call fails (network down, refresh cookie already expired) we still drop the
 * access token, wipe the cached query data, and dispatch `AUTH_CLEARED_EVENT`.
 * The next interaction in any open tab transitions to /login because
 * `useSessionBootstrap` listens to the same event.
 */
export function useLogout() {
	const client = useSessionClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (): Promise<void> => {
			try {
				await client.logout();
			} catch {
				// Backend rejected the call (cookie missing, throttled, server down).
				// We still want the user logged out locally — the refresh cookie may
				// linger until expiry, but this tab can't use it without an access
				// token, and the next refresh attempt will hit a 401 and redirect.
			}
			clearTokens();
			queryClient.clear();
		},
	});
}

/**
 * Mutation hook for the register form. Resolves with the new user record but
 * does NOT store tokens — the user must confirm their email before they can
 * sign in (auto-login happens in `useConfirmEmail`). Errors propagate untouched
 * so the caller can pivot through `extractFormErrors` for field-level UI.
 */
export function useRegister() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (input: RegisterInput): Promise<RegisterResult> => client.register(input),
	});
}

/**
 * Mutation hook for the email-confirmation page. On success stores the access
 * token in `sessionStorage` (the refresh cookie is set server-side) so the
 * caller can navigate the user straight into the protected app — they land
 * signed in without ever seeing the login form.
 */
export function useConfirmEmail() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (input: ConfirmEmailInput): Promise<ConfirmEmailResult> => {
			const result = await client.confirmEmail(input);
			setTokens(result.access);
			return result;
		},
	});
}

/**
 * Pre-check whether an email is already registered, so the register form's
 * stage 1 can surface a "this email is taken" hint before the user fills out
 * the rest of the details. Modeled as a mutation because the form fires it
 * imperatively on submit, not on every keystroke.
 */
export function useCheckEmail() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (email: string): Promise<CheckEmailResult> => client.checkEmail(email),
	});
}

/**
 * Mutation hook for the resend-confirmation page and the /login → 403
 * `email_not_verified` recovery flow. Anti-enumeration: the backend always
 * returns 200, so callers should always render the same generic "если аккаунт
 * существует, мы отправили письмо" success copy regardless of outcome.
 */
export function useResendConfirmation() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (email: string): Promise<void> => client.resendConfirmation(email),
	});
}

/**
 * Mutation hook for the forgot-password page. Anti-enumeration: the backend
 * always returns 200 regardless of whether the email matches a known account,
 * so the page renders the same generic success copy on success and on
 * (unexpected) failure. The hook surfaces errors normally — the page swallows
 * them in `onError` to keep the user-facing surface opaque.
 */
export function useForgotPassword() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (input: ForgotPasswordInput): Promise<void> => client.forgotPassword(input),
	});
}

/**
 * Mutation hook for the reset-password page. Submits uid + token + new password
 * + confirmation; on success the user is NOT auto-logged-in (they re-enter via
 * /login with the new password). Errors propagate untouched so the caller can
 * pivot through `extractFormErrors` for a `invalid_or_expired_link` banner or
 * password-validator field errors.
 */
export function useResetPassword() {
	const client = useSessionClient();

	return useMutation({
		mutationFn: async (input: ResetPasswordInput): Promise<void> => client.resetPassword(input),
	});
}

/**
 * Mutation hook for the in-app "change password" CTA in settings. Authed-only
 * — fires `client.requestPasswordChange()` (no body; backend pulls the email
 * from the session) so the user receives an email-link they can land on
 * `/reset-password` with. The user stays signed in throughout; clearing the
 * session only happens after they actually consume the link.
 */
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
					setTokens(res.access);
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
