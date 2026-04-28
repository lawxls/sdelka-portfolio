import type { VerifyInvitationCodeResponse } from "../domains/invitations";

/**
 * Public seam for the invitations domain. Backs `useVerifyInvitationCode`
 * (the only invitation-related hook today; the register-page calls it on
 * mount before showing the registration form).
 *
 * Creation lives on `WorkspaceEmployeesClient.invite()` and acceptance is
 * part of auth (out of scope per PRD). What this client owns is the
 * lookup-by-code lifecycle between those two endpoints.
 */
export interface InvitationsClient {
	verify(code: string): Promise<VerifyInvitationCodeResponse>;
}
