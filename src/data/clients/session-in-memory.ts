import type { LoginInput, LoginResult, RefreshResult, SessionUser } from "../domains/session";
import { AuthError } from "../errors";
import { delay, nextId } from "../mock-utils";
import type { SessionClient } from "./session-client";

interface SessionUserSeed {
	email: string;
	password: string;
	user: SessionUser;
	verified?: boolean;
}

const DEFAULT_SEED: SessionUserSeed[] = [
	{ email: "demo@sdelka.dev", password: "demo1234", user: { id: 1, email: "demo@sdelka.dev" } },
];

export interface InMemorySessionOptions {
	/** Replace the seeded user list — each entry maps an email/password to the
	 * SessionUser the adapter returns on successful login. Tests pass a single
	 * user with known credentials to drive happy/error paths deterministically. */
	users?: SessionUserSeed[];
	/** When true, `refresh()` resolves with a fresh access for the first seeded
	 * user — simulates a returning visitor whose refresh cookie is still valid.
	 * When false, `refresh()` rejects with AuthError(401). Defaults to false so
	 * fresh test runs match the "no session yet" boot. */
	refreshAvailable?: boolean;
}

/**
 * Build a closure-isolated in-memory session adapter. State (the active
 * "refresh cookie" presence, accessible-user set) lives in the closure — every
 * call to the factory produces an independent store. Tests mutate by passing a
 * fresh adapter rather than resetting shared module state.
 */
export function createInMemorySessionClient(options: InMemorySessionOptions = {}): SessionClient {
	const users = options.users ?? DEFAULT_SEED;
	let refreshAvailable = options.refreshAvailable ?? false;

	return {
		async login(input: LoginInput): Promise<LoginResult> {
			await delay();
			const match = users.find((u) => u.email === input.email && u.password === input.password);
			if (!match) throw new AuthError(401, { code: "invalid_credentials" });
			if (match.verified === false) throw new AuthError(403, { code: "email_not_verified" });
			refreshAvailable = true;
			return { access: nextId("access"), user: { ...match.user } };
		},

		async refresh(): Promise<RefreshResult> {
			await delay();
			if (!refreshAvailable) throw new AuthError(401, { code: "refresh_invalid" });
			return { access: nextId("access") };
		},
	};
}
