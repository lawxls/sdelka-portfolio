import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWorkspaceEmployees, type InviteEmployeeData, inviteEmployees } from "./api-client";

export function useWorkspaceEmployees() {
	const query = useQuery({
		queryKey: ["workspace-employees"],
		queryFn: fetchWorkspaceEmployees,
	});

	return {
		employees: query.data ?? [],
		isLoading: query.isLoading,
		error: query.error,
	};
}

export function useInviteEmployees() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (invites: InviteEmployeeData[]) => inviteEmployees(invites),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["workspace-employees"] });
		},
	});
}
