import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { AUTH_CLEARED_EVENT, getAccessToken, setTokens } from "./auth";
import { useSessionClient } from "./clients-context";
import type { LoginInput, LoginResult } from "./domains/session";

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
