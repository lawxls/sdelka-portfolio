import { useMutation } from "@tanstack/react-query";
import type { SendSupportMessageInput } from "./clients/support-client";
import { useSupportClient } from "./clients-context";

/** The «Поддержка» dialog fires this on submit. The component owns the
 * loader/error UX (via the mutation primitives) and closes itself on success. */
export function useSendSupportMessage() {
	const client = useSupportClient();
	return useMutation({
		mutationFn: (input: SendSupportMessageInput) => client.send(input),
	});
}
