import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceEmployeesClient } from "./clients-context";
import type {
	InviteEmployeeData,
	UpdatePermissionsData,
	UpdateWorkspaceEmployeeData,
	WorkspaceEmployee,
} from "./domains/workspace-employees";
import { toastModulePermissionDenied } from "./permission-toasts";

export function useWorkspaceEmployees(options?: { company?: string; enabled?: boolean }) {
	const client = useWorkspaceEmployeesClient();
	const company = options?.company;
	const query = useQuery({
		queryKey: company === undefined ? ["workspace-employees"] : ["workspace-employees", { company }],
		queryFn: () => client.list(company === undefined ? undefined : { company }),
		enabled: options?.enabled ?? true,
	});

	return {
		employees: query.data ?? [],
		isLoading: query.isLoading,
		error: query.error,
	};
}

export function useWorkspaceEmployeeDetail(id: string | null) {
	const client = useWorkspaceEmployeesClient();
	const query = useQuery({
		queryKey: ["workspace-employee", id],
		queryFn: () => client.get(id as string),
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
		onSuccess: (created) => {
			queryClient.setQueryData<WorkspaceEmployee[]>(["workspace-employees"], (prev) => {
				if (!prev) return created;
				const existing = new Set(prev.map((e) => e.id));
				return [...prev, ...created.filter((e) => !existing.has(e.id))];
			});
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["workspace-employees"] });
		},
	});
}

export function useDeleteWorkspaceEmployees() {
	const client = useWorkspaceEmployeesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (ids: string[]) => client.delete(ids),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["workspace-employees"] });
		},
	});
}

export function useUpdateWorkspaceEmployee() {
	const client = useWorkspaceEmployeesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceEmployeeData }) => client.update(id, data),
		onError: toastModulePermissionDenied,
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
		mutationFn: ({ id, data }: { id: string; data: UpdatePermissionsData }) => client.updatePermissions(id, data),
		onError: toastModulePermissionDenied,
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({ queryKey: ["workspace-employee", variables.id] });
		},
	});
}
