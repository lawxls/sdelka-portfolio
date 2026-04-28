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
import type { Company } from "./types";

export function useCompanyDetail(id: string | null) {
	const client = useCompaniesClient();
	return useQuery({
		queryKey: ["company", id],
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
			queryClient.invalidateQueries({ queryKey: ["companies-global"] });
		},
	});
}

export function useDeleteCompany() {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => client.delete(id),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["companies"] });
			queryClient.invalidateQueries({ queryKey: ["companies-global"] });
		},
	});
}

export function useCreateCompany() {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateCompanyPayload) => client.create(data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["companies"] });
			queryClient.invalidateQueries({ queryKey: ["companies-global"] });
		},
	});
}

export function useCreateAddress(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateAddressData) => client.createAddress(companyId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", companyId] });
			queryClient.invalidateQueries({ queryKey: ["companies"] });
			queryClient.invalidateQueries({ queryKey: ["companies-global"] });
		},
	});
}

export function useUpdateAddress(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ addressId, data }: { addressId: string; data: UpdateAddressData }) =>
			client.updateAddress(companyId, addressId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", companyId] });
			queryClient.invalidateQueries({ queryKey: ["companies"] });
			queryClient.invalidateQueries({ queryKey: ["companies-global"] });
		},
	});
}

export function useDeleteAddress(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (addressId: string) => client.deleteAddress(companyId, addressId),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", companyId] });
			queryClient.invalidateQueries({ queryKey: ["companies"] });
			queryClient.invalidateQueries({ queryKey: ["companies-global"] });
		},
	});
}

export function useCreateEmployee(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateEmployeeData) => client.createEmployee(companyId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", companyId] });
			queryClient.invalidateQueries({ queryKey: ["companies"] });
			queryClient.invalidateQueries({ queryKey: ["companies-global"] });
		},
	});
}

export function useUpdateEmployee(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ employeeId, data }: { employeeId: number; data: UpdateEmployeeData }) =>
			client.updateEmployee(companyId, employeeId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", companyId] });
			queryClient.invalidateQueries({ queryKey: ["companies"] });
			queryClient.invalidateQueries({ queryKey: ["companies-global"] });
		},
	});
}

export function useDeleteEmployee(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (employeeId: number) => client.deleteEmployee(companyId, employeeId),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", companyId] });
			queryClient.invalidateQueries({ queryKey: ["companies"] });
			queryClient.invalidateQueries({ queryKey: ["companies-global"] });
		},
	});
}

export function useUpdateEmployeePermissions(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ employeeId, data }: { employeeId: number; data: UpdatePermissionsData }) =>
			client.updateEmployeePermissions(companyId, employeeId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", companyId] });
		},
	});
}
