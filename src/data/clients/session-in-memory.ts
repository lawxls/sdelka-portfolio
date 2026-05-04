import type {
	CheckEmailResult,
	ConfirmEmailInput,
	ConfirmEmailResult,
	LoginInput,
	LoginResult,
	RefreshResult,
	RegisterInput,
	RegisterResult,
	SessionUser,
} from "../domains/session";
import { AuthError, ValidationError } from "../errors";
import { delay, nextId } from "../mock-utils";
import type { SessionClient } from "./session-client";

interface SessionUserSeed {
	email: string;
	password: string;
	user: SessionUser;
	verified?: boolean;
	/** Pending confirmation token. The "uid" is the user's numeric id stringified;
	 * tokens are issued at register time and consumed by `confirmEmail`. The
	 * real backend issues opaque uid+token pairs in the email link; this stand-in
	 * just uses the user id and a generated token so tests can drive the flow. */
	confirmationToken?: string;
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
	/** Override the confirmation-token generator. Tests fix the token to a known
	 * value so they can drive `confirmEmail` deterministically. */
	generateConfirmationToken?: () => string;
}

/**
 * Build a closure-isolated in-memory session adapter. State (the active
 * "refresh cookie" presence, accessible-user set, pending confirmation tokens)
 * lives in the closure — every call to the factory produces an independent
 * store. Tests mutate by passing a fresh adapter rather than resetting shared
 * module state.
 */
export function createInMemorySessionClient(options: InMemorySessionOptions = {}): SessionClient {
	const users: SessionUserSeed[] = (options.users ?? DEFAULT_SEED).map((u) => ({ ...u }));
	let refreshAvailable = options.refreshAvailable ?? false;
	const genToken = options.generateConfirmationToken ?? (() => nextId("token"));
	let nextUserId = users.reduce((max, u) => Math.max(max, u.user.id), 0) + 1;

	function findByUid(uid: string): SessionUserSeed | undefined {
		return users.find((u) => String(u.user.id) === uid);
	}

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

		async logout(): Promise<void> {
			await delay();
			refreshAvailable = false;
		},

		async register(input: RegisterInput): Promise<RegisterResult> {
			await delay();
			if (input.password !== input.password_confirm) {
				throw new ValidationError(
					{},
					{ password_confirm: [{ code: "passwords_do_not_match", message: "Passwords do not match" }] },
				);
			}
			if (users.some((u) => u.email === input.email)) {
				throw new ValidationError({}, { email: [{ code: "unique", message: "This email is already in use" }] });
			}
			const id = nextUserId++;
			const created: SessionUserSeed = {
				email: input.email,
				password: input.password,
				user: { id, email: input.email },
				verified: false,
				confirmationToken: genToken(),
			};
			users.push(created);
			return { user: { ...created.user } };
		},

		async confirmEmail(input: ConfirmEmailInput): Promise<ConfirmEmailResult> {
			await delay();
			const match = findByUid(input.uid);
			if (!match || match.confirmationToken !== input.token) {
				throw new ValidationError({}, { code: "invalid_or_expired_link" });
			}
			match.verified = true;
			match.confirmationToken = undefined;
			refreshAvailable = true;
			return { access: nextId("access"), user: { ...match.user } };
		},

		async checkEmail(email: string): Promise<CheckEmailResult> {
			await delay();
			return { exists: users.some((u) => u.email === email) };
		},
	};
}
