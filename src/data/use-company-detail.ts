import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompaniesClient } from "./clients-context";
import type {
	CreateAddressData,
	CreateCompanyPayload,
	CreateEmployeeData,
	UpdateAddressData,
	UpdateCompanyData,
	UpdateEmployeeData,
	UpdatePermissionsData,
} from "./domains/companies";
import { invalidateAfterCompanyChange, invalidateAfterEmployeePermissionsChange } from "./invalidation-policies";
import { keys } from "./query-keys";
import type { Company } from "./types";

export function useCompanyDetail(id: string | null) {
	const client = useCompaniesClient();
	return useQuery({
		queryKey: keys.companies.detail(id),
		queryFn: () => client.get(id as string),
		enabled: id != null,
	});
}

export function useUpdateCompany(id: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: UpdateCompanyData) => client.update(id, data),
		onMutate: async (newData) => {
			await queryClient.cancelQueries({ queryKey: keys.companies.detail(id) });
			const previous = queryClient.getQueryData<Company>(keys.companies.detail(id));
			if (previous) {
				queryClient.setQueryData<Company>(keys.companies.detail(id), { ...previous, ...newData });
			}
			return { previous };
		},
		onError: (_err, _newData, context) => {
			if (context?.previous) {
				queryClient.setQueryData(keys.companies.detail(id), context.previous);
			}
		},
		onSettled: () => invalidateAfterCompanyChange(queryClient, { companyId: id }),
	});
}

export function useDeleteCompany() {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => client.delete(id),
		onSettled: () => invalidateAfterCompanyChange(queryClient),
	});
}

export function useCreateCompany() {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateCompanyPayload) => client.create(data),
		onSettled: () => invalidateAfterCompanyChange(queryClient),
	});
}

export function useCreateAddress(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateAddressData) => client.createAddress(companyId, data),
		onSettled: () => invalidateAfterCompanyChange(queryClient, { companyId }),
	});
}

export function useUpdateAddress(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ addressId, data }: { addressId: string; data: UpdateAddressData }) =>
			client.updateAddress(companyId, addressId, data),
		onSettled: () => invalidateAfterCompanyChange(queryClient, { companyId }),
	});
}

export function useDeleteAddress(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (addressId: string) => client.deleteAddress(companyId, addressId),
		onSettled: () => invalidateAfterCompanyChange(queryClient, { companyId }),
	});
}

export function useCreateEmployee(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateEmployeeData) => client.createEmployee(companyId, data),
		onSettled: () => invalidateAfterCompanyChange(queryClient, { companyId }),
	});
}

export function useUpdateEmployee(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ employeeId, data }: { employeeId: number; data: UpdateEmployeeData }) =>
			client.updateEmployee(companyId, employeeId, data),
		onSettled: () => invalidateAfterCompanyChange(queryClient, { companyId }),
	});
}

export function useDeleteEmployee(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (employeeId: number) => client.deleteEmployee(companyId, employeeId),
		onSettled: () => invalidateAfterCompanyChange(queryClient, { companyId }),
	});
}

export function useUpdateEmployeePermissions(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ employeeId, data }: { employeeId: number; data: UpdatePermissionsData }) =>
			client.updateEmployeePermissions(companyId, employeeId, data),
		onSettled: () => invalidateAfterEmployeePermissionsChange(queryClient, { companyId }),
	});
}
