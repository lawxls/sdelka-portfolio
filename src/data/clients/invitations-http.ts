import type { VerifyInvitationCodeResponse } from "../domains/invitations";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { InvitationsClient } from "./invitations-client";

export function createHttpInvitationsClient(http: HttpClient = defaultHttpClient): InvitationsClient {
	return {
		verify: (code) => http.post<VerifyInvitationCodeResponse>(`/api/invitations/verify`, { body: { code } }),
	};
}
