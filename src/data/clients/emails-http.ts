import type { AddEmailPayload, WorkspaceEmail } from "../domains/emails";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { EmailsClient } from "./emails-client";

export function createHttpEmailsClient(http: HttpClient = defaultHttpClient): EmailsClient {
	return {
		list: () => http.get<WorkspaceEmail[]>(`/api/workspace/emails`),

		add: (payload: AddEmailPayload) => http.post<WorkspaceEmail>(`/api/workspace/emails`, { body: payload }),

		delete: (ids: string[]) => http.post<void>(`/api/workspace/emails/delete`, { body: { ids } }),

		disable: (ids: string[]) => http.post<void>(`/api/workspace/emails/disable`, { body: { ids } }),
	};
}
