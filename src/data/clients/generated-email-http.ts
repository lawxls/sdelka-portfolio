import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type {
	GeneratedEmailClient,
	GenerateEmailPreviewInput,
	GenerateEmailPreviewResponse,
} from "./generated-email-client";

export function createHttpGeneratedEmailClient(http: HttpClient = defaultHttpClient): GeneratedEmailClient {
	return {
		preview: (input: GenerateEmailPreviewInput) =>
			http.post<GenerateEmailPreviewResponse>(`/procurement/generated-email/preview/`, { body: input }),
	};
}
