import { useMutation } from "@tanstack/react-query";
import type { GenerateQuestionsPreviewInput } from "./clients/generated-questions-client";
import { useGeneratedQuestionsClient } from "./clients-context";

/** Step 2 of the create-inquiry wizard fires this on every Step 1→2
 * transition (and on retry from the error state). Not cached — the mock
 * backend returns a different random subset each call, and the real LLM will
 * eventually base its output on the latest positions/folder/additionalInfo. */
export function useGeneratePreview() {
	const client = useGeneratedQuestionsClient();
	return useMutation({
		mutationFn: (input: GenerateQuestionsPreviewInput) => client.preview(input),
	});
}
