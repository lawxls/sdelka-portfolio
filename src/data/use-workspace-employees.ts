import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	deleteWorkspaceEmployeesMock as deleteWorkspaceEmployees,
	fetchWorkspaceEmployeeMock as fetchWorkspaceEmployee,
	fetchWorkspaceEmployeesMock as fetchWorkspaceEmployees,
	type InviteEmployeeData,
	inviteEmployeesMock as inviteEmployees,
	type UpdatePermissionsData,
	updateWorkspaceEmployeePermissionsMock as updateWorkspaceEmployeePermissions,
} from "./workspace-mock-data";

export function useWorkspaceEmployees(options?: { enabled?: boolean }) {
	const query = useQuery({
		queryKey: ["workspace-employees"],
		queryFn: fetchWorkspaceEmployees,
		enabled: options?.enabled ?? true,
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

export function useDeleteWorkspaceEmployees() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (ids: number[]) => deleteWorkspaceEmployees(ids),
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
