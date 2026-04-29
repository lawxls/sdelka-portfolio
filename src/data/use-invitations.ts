import { useQuery } from "@tanstack/react-query";
import { useInvitationsClient } from "./clients-context";

/**
 * Verify an invitation code. Returns a query whose `data.valid` indicates
 * whether the code is acceptable. Disabled when no code is provided so the
 * register-page can short-circuit to "/login" without firing a request.
 */
export function useVerifyInvitationCode(code: string | null) {
	const client = useInvitationsClient();
	return useQuery({
		queryKey: ["invitations", "verify", code],
		queryFn: () => client.verify(code as string),
		enabled: code !== null,
		staleTime: 5 * 60_000,
	});
}
