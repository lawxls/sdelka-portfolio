import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EmailsClient, ListEmailsFilter } from "./clients/emails-client";
import { useEmailsClient } from "./clients-context";
import type { AddEmailPayload } from "./domains/emails";

const EMAILS_KEY = ["workspace-emails"] as const;

export interface UseEmailsOptions extends ListEmailsFilter {
	enabled?: boolean;
}

export function useEmails(options: UseEmailsOptions = {}) {
	const client = useEmailsClient();
	const { enabled, ...rest } = options;
	const filter: ListEmailsFilter = {
		archived: rest.archived ?? false,
		q: rest.q,
		status: rest.status,
		type: rest.type,
	};
	const query = useQuery({
		queryKey: [...EMAILS_KEY, filter],
		queryFn: () => client.list(filter),
		enabled: enabled ?? true,
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

export function useAddEmails() {
	const client = useEmailsClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (payloads: AddEmailPayload[]) => client.addMany(payloads),
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
export const useUnarchiveEmails = () => useEmailIdsMutation((c) => c.unarchive);
export const useDisableEmails = () => useEmailIdsMutation((c) => c.disable);
