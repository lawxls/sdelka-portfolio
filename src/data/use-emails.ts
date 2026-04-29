import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEmailsClient } from "./clients-context";
import type { AddEmailPayload } from "./domains/emails";

const EMAILS_KEY = ["workspace-emails"];

export function useEmails(options?: { enabled?: boolean }) {
	const client = useEmailsClient();
	const query = useQuery({
		queryKey: EMAILS_KEY,
		queryFn: () => client.list(),
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

export function useDeleteEmails() {
	const client = useEmailsClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (ids: string[]) => client.delete(ids),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: EMAILS_KEY });
		},
	});
}

export function useDisableEmails() {
	const client = useEmailsClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (ids: string[]) => client.disable(ids),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: EMAILS_KEY });
		},
	});
}
