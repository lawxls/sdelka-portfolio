import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceEmployeesClient } from "./clients-context";
import type {
	InviteEmployeeData,
	UpdatePermissionsData,
	UpdateWorkspaceEmployeeData,
} from "./domains/workspace-employees";

export function useWorkspaceEmployees(options?: { enabled?: boolean }) {
	const client = useWorkspaceEmployeesClient();
	const query = useQuery({
		queryKey: ["workspace-employees"],
		queryFn: () => client.list(),
		enabled: options?.enabled ?? true,
	});

	return {
		employees: query.data ?? [],
		isLoading: query.isLoading,
		error: query.error,
	};
}

export function useWorkspaceEmployeeDetail(id: number | null) {
	const client = useWorkspaceEmployeesClient();
	const query = useQuery({
		queryKey: ["workspace-employee", id],
		queryFn: () => client.get(id as number),
		enabled: id != null,
	});

	return {
		employee: query.data,
		isLoading: query.isLoading,
		error: query.error,
	};
}

export function useInviteEmployees() {
	const client = useWorkspaceEmployeesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (invites: InviteEmployeeData[]) => client.invite(invites),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["workspace-employees"] });
		},
	});
}

export function useDeleteWorkspaceEmployees() {
	const client = useWorkspaceEmployeesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (ids: number[]) => client.delete(ids),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["workspace-employees"] });
		},
	});
}

export function useUpdateWorkspaceEmployee() {
	const client = useWorkspaceEmployeesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: UpdateWorkspaceEmployeeData }) => client.update(id, data),
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({ queryKey: ["workspace-employee", variables.id] });
			queryClient.invalidateQueries({ queryKey: ["workspace-employees"] });
		},
	});
}

export function useUpdateWorkspaceEmployeePermissions() {
	const client = useWorkspaceEmployeesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: UpdatePermissionsData }) => client.updatePermissions(id, data),
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({ queryKey: ["workspace-employee", variables.id] });
		},
	});
}
