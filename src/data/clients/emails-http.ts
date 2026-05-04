import type { AddEmailPayload, WorkspaceEmail } from "../domains/emails";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { EmailsClient } from "./emails-client";

export function createHttpEmailsClient(http: HttpClient = defaultHttpClient): EmailsClient {
	return {
		list: () => http.get<WorkspaceEmail[]>(`/workspace/emails`),

		add: (payload: AddEmailPayload) => http.post<WorkspaceEmail>(`/workspace/emails`, { body: payload }),

		delete: (ids: string[]) => http.post<void>(`/workspace/emails/delete`, { body: { ids } }),

		disable: (ids: string[]) => http.post<void>(`/workspace/emails/disable`, { body: { ids } }),
	};
}
