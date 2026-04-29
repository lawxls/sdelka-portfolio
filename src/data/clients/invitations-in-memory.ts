import type { VerifyInvitationCodeResponse } from "../domains/invitations";
import { delay } from "../mock-utils";
import type { InvitationsClient } from "./invitations-client";

export interface InMemoryInvitationsOptions {
	/** Override the verify result for tests that need to surface an invalid
	 * code without relying on `verify` rejecting. Defaults to always-valid,
	 * matching the legacy `verifyInvitationCodeMock`. */
	isValid?: (code: string) => boolean;
}

/**
 * Build a closure-isolated in-memory invitations adapter. The verify rule is
 * a pure function — there's no underlying invitation roster to wrap, so this
 * adapter doesn't share any state with other domains.
 */
export function createInMemoryInvitationsClient(options: InMemoryInvitationsOptions = {}): InvitationsClient {
	const isValid = options.isValid ?? (() => true);
	return {
		async verify(code: string): Promise<VerifyInvitationCodeResponse> {
			await delay();
			return { valid: isValid(code) };
		},
	};
}
