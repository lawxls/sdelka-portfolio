import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type CreateAddressData,
	type CreateEmployeeData,
	createAddress,
	createEmployee,
	deleteAddress,
	deleteCompany,
	deleteEmployee,
	fetchCompany,
	type UpdateAddressData,
	type UpdateCompanyData,
	type UpdateEmployeeData,
	type UpdatePermissionsData,
	updateAddress,
	updateCompany,
	updateEmployee,
	updateEmployeePermissions,
} from "./api-client";
import type { Company } from "./types";

export function useCompanyDetail(id: string | null) {
	return useQuery({
		queryKey: ["company", id],
		queryFn: () => fetchCompany(id as string),
		enabled: id != null,
	});
}

export function useUpdateCompany(id: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: UpdateCompanyData) => updateCompany(id, data),
		onMutate: async (newData) => {
			await queryClient.cancelQueries({ queryKey: ["company", id] });
			const previous = queryClient.getQueryData<Company>(["company", id]);
			if (previous) {
				queryClient.setQueryData<Company>(["company", id], { ...previous, ...newData });
			}
			return { previous };
		},
		onError: (_err, _newData, context) => {
			if (context?.previous) {
				queryClient.setQueryData(["company", id], context.previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", id] });
			queryClient.invalidateQueries({ queryKey: ["companies"] });
		},
	});
}

export function useDeleteCompany() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deleteCompany(id),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["companies"] });
		},
	});
}

export function useCreateAddress(companyId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateAddressData) => createAddress(companyId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", companyId] });
			queryClient.invalidateQueries({ queryKey: ["companies"] });
		},
	});
}

export function useUpdateAddress(companyId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ addressId, data }: { addressId: string; data: UpdateAddressData }) =>
			updateAddress(companyId, addressId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", companyId] });
			queryClient.invalidateQueries({ queryKey: ["companies"] });
		},
	});
}

export function useDeleteAddress(companyId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (addressId: string) => deleteAddress(companyId, addressId),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", companyId] });
			queryClient.invalidateQueries({ queryKey: ["companies"] });
		},
	});
}

// --- Employees ---

export function useCreateEmployee(companyId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateEmployeeData) => createEmployee(companyId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", companyId] });
			queryClient.invalidateQueries({ queryKey: ["companies"] });
		},
	});
}

export function useUpdateEmployee(companyId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ employeeId, data }: { employeeId: string; data: UpdateEmployeeData }) =>
			updateEmployee(companyId, employeeId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", companyId] });
			queryClient.invalidateQueries({ queryKey: ["companies"] });
		},
	});
}

export function useDeleteEmployee(companyId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (employeeId: string) => deleteEmployee(companyId, employeeId),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", companyId] });
			queryClient.invalidateQueries({ queryKey: ["companies"] });
		},
	});
}

export function useUpdateEmployeePermissions(companyId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ employeeId, data }: { employeeId: string; data: UpdatePermissionsData }) =>
			updateEmployeePermissions(companyId, employeeId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", companyId] });
		},
	});
}
