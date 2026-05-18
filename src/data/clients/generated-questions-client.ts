/**
 * Public seam for the procurement generated-questions domain. The wizard's
 * Step 2 fetches clarifying questions via this client. Today the backend
 * returns 3–5 mock questions; future versions will route through an LLM.
 * The wire surface stays the same regardless.
 */

/** One question + its suggested answer chips as returned by the backend. */
export interface GeneratedQuestion {
	questionText: string;
	suggests: string[];
}

export interface GenerateQuestionsPreviewInput {
	positions: Array<{ name: string; description?: string }>;
	folderId?: string | null;
	additionalInfo?: string;
}

export interface GenerateQuestionsPreviewResponse {
	questions: GeneratedQuestion[];
}

export interface GeneratedQuestionsClient {
	preview(input: GenerateQuestionsPreviewInput): Promise<GenerateQuestionsPreviewResponse>;
}
