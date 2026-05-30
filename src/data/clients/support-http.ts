import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { SendSupportMessageInput, SupportClient } from "./support-client";

export function createHttpSupportClient(http: HttpClient = defaultHttpClient): SupportClient {
	return {
		send: async ({ message, attachments }: SendSupportMessageInput): Promise<void> => {
			const form = new FormData();
			form.append("message", message);
			// Repeat the same key per file; the browser sets the multipart boundary.
			for (const file of attachments ?? []) form.append("attachments", file, file.name);
			await http.postMultipart<void>(`/support/messages/`, { body: form });
		},
	};
}
