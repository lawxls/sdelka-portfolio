import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EmployeePermissions } from "./types";
import { fetchWorkspaceEmployees, inviteEmployees, updateWorkspaceEmployeePermissions } from "./workspace-api";
import type { InvitePayload } from "./workspace-types";

export function useWorkspaceEmployees() {
	return useQuery({
		queryKey: ["workspace-employees"],
		queryFn: fetchWorkspaceEmployees,
	});
}

export function useInviteEmployees() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (invites: InvitePayload[]) => inviteEmployees(invites),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["workspace-employees"] });
		},
	});
}

export function useUpdateWorkspaceEmployeePermissions(employeeId: number) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Partial<Pick<EmployeePermissions, "analytics" | "procurement" | "companies" | "tasks">>) =>
			updateWorkspaceEmployeePermissions(employeeId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["workspace-employees"] });
		},
	});
}
