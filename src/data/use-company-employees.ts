import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEmployeesClient } from "./clients-context";
import type { CreateEmployeeData, UpdateEmployeeData, UpdatePermissionsData } from "./domains/employees";
import { invalidateAfterEmployeeChange } from "./invalidation-policies";
import { keys } from "./query-keys";

export function useCompanyEmployees(companyId: string | null) {
	const client = useEmployeesClient();
	return useQuery({
		queryKey: keys.employees.byCompany(companyId ?? "__none__"),
		queryFn: () => client.listByCompany(companyId as string),
		enabled: companyId != null,
	});
}

export function useCreateEmployee(companyId: string) {
	const client = useEmployeesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateEmployeeData) => client.create(companyId, data),
		onSettled: () => invalidateAfterEmployeeChange(queryClient, { companyId }),
	});
}

export function useUpdateEmployee(companyId: string) {
	const client = useEmployeesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ employeeId, data }: { employeeId: string; data: UpdateEmployeeData }) =>
			client.update(companyId, employeeId, data),
		onSettled: () => invalidateAfterEmployeeChange(queryClient, { companyId }),
	});
}

export function useDeleteEmployee(companyId: string) {
	const client = useEmployeesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (employeeId: string) => client.delete(companyId, employeeId),
		onSettled: () => invalidateAfterEmployeeChange(queryClient, { companyId }),
	});
}

export function useUpdateEmployeePermissions(companyId: string) {
	const client = useEmployeesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ employeeId, data }: { employeeId: string; data: UpdatePermissionsData }) =>
			client.updatePermissions(companyId, employeeId, data),
		onSettled: () => invalidateAfterEmployeeChange(queryClient, { companyId }),
	});
}
