import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EmailsClient } from "./clients/emails-client";
import { useEmailsClient } from "./clients-context";
import type { AddEmailPayload } from "./domains/emails";

const EMAILS_KEY = ["workspace-emails"] as const;

function emailsKey(archived: boolean) {
	return [...EMAILS_KEY, { archived }] as const;
}

export function useEmails(options?: { enabled?: boolean; archived?: boolean }) {
	const client = useEmailsClient();
	const archived = options?.archived ?? false;
	const query = useQuery({
		queryKey: emailsKey(archived),
		queryFn: () => client.list({ archived }),
		enabled: options?.enabled ?? true,
	});

	return {
		emails: query.data ?? [],
		isLoading: query.isLoading,
		error: query.error,
	};
}

export function useAddEmail() {
	const client = useEmailsClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (payload: AddEmailPayload) => client.add(payload),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: EMAILS_KEY });
		},
	});
}

function useEmailIdsMutation(pick: (c: EmailsClient) => (ids: string[]) => Promise<void>) {
	const client = useEmailsClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (ids: string[]) => pick(client)(ids),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: EMAILS_KEY });
		},
	});
}

export const useDeleteEmails = () => useEmailIdsMutation((c) => c.delete);
export const useArchiveEmails = () => useEmailIdsMutation((c) => c.archive);
export const useDisableEmails = () => useEmailIdsMutation((c) => c.disable);
