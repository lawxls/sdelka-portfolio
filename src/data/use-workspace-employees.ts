import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdatePermissionsData } from "./api-client";
import {
	fetchWorkspaceEmployee,
	fetchWorkspaceEmployees,
	type InviteEmployeeData,
	inviteEmployees,
	updateWorkspaceEmployeePermissions,
} from "./api-client";

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

export function useWorkspaceEmployeeDetail(id: number | null) {
	const query = useQuery({
		queryKey: ["workspace-employee", id],
		queryFn: () => fetchWorkspaceEmployee(id as number),
		enabled: id != null,
	});

	return {
		employee: query.data,
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

export function useUpdateWorkspaceEmployeePermissions() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: UpdatePermissionsData }) =>
			updateWorkspaceEmployeePermissions(id, data),
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({ queryKey: ["workspace-employee", variables.id] });
		},
	});
}
