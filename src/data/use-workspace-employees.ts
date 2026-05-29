import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceEmployeesClient } from "./clients/workspace-employees-client";
import { useWorkspaceEmployeesClient } from "./clients-context";
import type {
	InviteEmployeeData,
	UpdatePermissionsData,
	UpdateWorkspaceEmployeeData,
	WorkspaceEmployee,
} from "./domains/workspace-employees";
import { toastModulePermissionDenied, toastPermissionsMatrixError } from "./permission-toasts";

const WORKSPACE_EMPLOYEES_KEY = ["workspace-employees"] as const;
const INTERACTIVE_LIST_STALE_TIME = 0;

const employeeKeys = {
	all: () => WORKSPACE_EMPLOYEES_KEY,
	list: (filter: Record<string, unknown>) =>
		Object.keys(filter).length === 0 ? WORKSPACE_EMPLOYEES_KEY : ([...WORKSPACE_EMPLOYEES_KEY, filter] as const),
	detail: (id: string) => ["workspace-employee", id] as const,
};

export interface UseWorkspaceEmployeesOptions {
	company?: string;
	q?: string;
	role?: string;
	archived?: boolean;
	enabled?: boolean;
}

export function useWorkspaceEmployees(options: UseWorkspaceEmployeesOptions = {}) {
	const client = useWorkspaceEmployeesClient();
	const { enabled, archived, ...rest } = options;
	// `archived` is always part of the filter/key (even when false) so the
	// active and archived views are distinct cache entries and toggling «Архив»
	// switches queries. Other params are dropped when empty.
	const filter: Record<string, unknown> = Object.fromEntries(
		Object.entries(rest).filter(([, v]) => v !== undefined && v !== ""),
	);
	filter.archived = archived ?? false;
	const query = useQuery({
		queryKey: employeeKeys.list(filter),
		queryFn: () => client.list(Object.keys(filter).length > 0 ? filter : undefined),
		enabled: enabled ?? true,
		staleTime: INTERACTIVE_LIST_STALE_TIME,
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
		queryKey: id == null ? ["workspace-employee", null] : employeeKeys.detail(id),
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
			queryClient.setQueryData<WorkspaceEmployee[]>(employeeKeys.all(), (prev) => {
				if (!prev) return created;
				const existing = new Set(prev.map((e) => e.id));
				return [...prev, ...created.filter((e) => !existing.has(e.id))];
			});
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: employeeKeys.all() });
		},
	});
}

function useWorkspaceEmployeeIdsMutation<T>(pick: (c: WorkspaceEmployeesClient) => (ids: string[]) => Promise<T>) {
	const client = useWorkspaceEmployeesClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (ids: string[]) => pick(client)(ids),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: employeeKeys.all() });
		},
	});
}

export const useDeleteWorkspaceEmployees = () => useWorkspaceEmployeeIdsMutation((c) => c.delete);
export const useUnarchiveWorkspaceEmployees = () => useWorkspaceEmployeeIdsMutation((c) => c.unarchive);

export function useUpdateWorkspaceEmployee() {
	const client = useWorkspaceEmployeesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceEmployeeData }) => client.update(id, data),
		onError: toastModulePermissionDenied,
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) });
			queryClient.invalidateQueries({ queryKey: employeeKeys.all() });
		},
	});
}

export function useUpdateWorkspaceEmployeePermissions() {
	const client = useWorkspaceEmployeesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdatePermissionsData }) => client.updatePermissions(id, data),
		onError: toastPermissionsMatrixError,
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) });
		},
	});
}
