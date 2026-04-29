/**
 * Invitations domain types — invitation lifecycle (verification at acceptance
 * time). Backs `useVerifyInvitationCode` and the register-page mount flow.
 *
 * Invitation *creation* happens on `WorkspaceEmployeesClient.invite()` (a row
 * with `registeredAt: null` is a pending invitation in that domain). Invitation
 * *acceptance* (registration with an invitation code) is part of the auth
 * adapter, which the PRD keeps explicitly out of scope. What lives here is the
 * lifecycle in between: looking up an invitation by its code to confirm it's
 * still valid before showing the registration form.
 */

export interface VerifyInvitationCodeResponse {
	valid: boolean;
}
