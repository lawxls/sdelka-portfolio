import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type {
	GeneratedQuestionsClient,
	GenerateQuestionsPreviewInput,
	GenerateQuestionsPreviewResponse,
} from "./generated-questions-client";

export function createHttpGeneratedQuestionsClient(http: HttpClient = defaultHttpClient): GeneratedQuestionsClient {
	return {
		preview: (input: GenerateQuestionsPreviewInput) =>
			http.post<GenerateQuestionsPreviewResponse>(`/procurement/generated-questions/preview/`, { body: input }),
	};
}
