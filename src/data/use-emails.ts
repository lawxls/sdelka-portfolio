import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type AddEmailPayload,
	addEmailMock as addEmail,
	deleteEmailsMock as deleteEmails,
	disableEmailsMock as disableEmails,
	fetchEmailsMock as fetchEmails,
} from "./emails-mock-data";

const EMAILS_KEY = ["workspace-emails"];

export function useEmails(options?: { enabled?: boolean }) {
	const query = useQuery({
		queryKey: EMAILS_KEY,
		queryFn: fetchEmails,
		enabled: options?.enabled ?? true,
	});

	return {
		emails: query.data ?? [],
		isLoading: query.isLoading,
		error: query.error,
	};
}

export function useAddEmail() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (payload: AddEmailPayload) => addEmail(payload),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: EMAILS_KEY });
		},
	});
}

export function useDeleteEmails() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (ids: string[]) => deleteEmails(ids),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: EMAILS_KEY });
		},
	});
}

export function useDisableEmails() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (ids: string[]) => disableEmails(ids),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: EMAILS_KEY });
		},
	});
}
