/**
 * Public seam for the procurement generated-email domain. The wizard's
 * Step 3 calls this client on mount and on «Перегенерировать»; the BE
 * routes the same payload through Mock or Gemini depending on
 * `settings.PROCUREMENT_AI_BACKEND`.
 */

import type { GenerateQuestionsPreviewInput } from "./generated-questions-client";

/** A single Step 2 question + the buyer's answer, forwarded as context.
 * Empty `answer` is meaningful (asked, skipped) — keep the row. */
export interface GenerateEmailPreviewQuestionInput {
	questionText: string;
	suggests: string[];
	answer: string;
}

export interface GenerateEmailPreviewInput extends GenerateQuestionsPreviewInput {
	/** ISO date string (YYYY-MM-DD) when set. */
	deadline?: string | null;
	/** Folder name (not just id) so the mock generator can categorise the
	 * email («Запрос КП — Металлопрокат»). The BE doesn't dereference
	 * folder_id to a row, so the FE has to send the text directly. */
	folderName?: string;
	generatedQuestions?: GenerateEmailPreviewQuestionInput[];
	/** Drives the mock generator's variant rotation; ignored by Gemini. */
	regenerateIndex?: number;
}

export interface GenerateEmailPreviewResponse {
	subject: string;
	body: string;
}

export interface GeneratedEmailClient {
	preview(input: GenerateEmailPreviewInput): Promise<GenerateEmailPreviewResponse>;
}
