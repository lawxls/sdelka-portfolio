import type { AddEmailPayload, WorkspaceEmail } from "../domains/emails";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { DrfCursorPage } from "./drf";
import { buildQueryString } from "./drf";
import type { EmailsClient } from "./emails-client";

export function createHttpEmailsClient(http: HttpClient = defaultHttpClient): EmailsClient {
	return {
		async list(opts = {}) {
			const qs = buildQueryString({
				archived: opts.archived ? "true" : undefined,
				q: opts.q,
				status: opts.status,
				type: opts.type,
			});
			const page = await http.get<DrfCursorPage<WorkspaceEmail>>(`/emails/inboxes/${qs}`);
			return page.results;
		},

		add: (payload: AddEmailPayload) => http.post<WorkspaceEmail>(`/emails/inboxes/`, { body: payload }),

		addMany: (payloads: AddEmailPayload[]) =>
			http.post<WorkspaceEmail[]>(`/emails/inboxes/bulk-create/`, { body: payloads }),

		delete: (ids: string[]) => http.post<void>(`/emails/inboxes/bulk-delete/`, { body: { ids } }),

		archive: (ids: string[]) => http.post<void>(`/emails/inboxes/bulk-archive/`, { body: { ids } }),

		unarchive: (ids: string[]) => http.post<void>(`/emails/inboxes/bulk-unarchive/`, { body: { ids } }),

		disable: (ids: string[]) => http.post<void>(`/emails/inboxes/bulk-disable/`, { body: { ids } }),
	};
}
