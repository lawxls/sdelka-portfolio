import { useMutation } from "@tanstack/react-query";
import type { GenerateQuestionsPreviewInput } from "./clients/generated-questions-client";
import { useGeneratedQuestionsClient } from "./clients-context";

/** Step 2 of the create-inquiry wizard fires this once per flow — on the
 * first Step 1→2 transition and on retry from the error state. Subsequent
 * re-entries (Назад → Далее) reuse the cached questions held in form state,
 * so any answers the user already typed aren't wiped by a re-fetch. */
export function useGeneratePreview() {
	const client = useGeneratedQuestionsClient();
	return useMutation({
		mutationFn: (input: GenerateQuestionsPreviewInput) => client.preview(input),
	});
}
