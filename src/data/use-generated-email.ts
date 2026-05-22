import { useMutation } from "@tanstack/react-query";
import type { GenerateEmailPreviewInput } from "./clients/generated-email-client";
import { useGeneratedEmailClient } from "./clients-context";

/** Step 3 of the create-inquiry wizard fires this on first entry, and again
 * on every «Перегенерировать». The component owns the loader UX and decides
 * whether to retry on error — we just surface the mutation primitives. */
export function useGenerateEmailPreview() {
	const client = useGeneratedEmailClient();
	return useMutation({
		mutationFn: (input: GenerateEmailPreviewInput) => client.preview(input),
	});
}
