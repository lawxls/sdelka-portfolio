import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompaniesClient } from "./clients-context";
import type {
	CreateAddressData,
	CreateCompanyPayload,
	UpdateAddressData,
	UpdateCompanyData,
} from "./domains/companies";
import { invalidateAfterCompanyChange } from "./invalidation-policies";
import { applyOptimistic, rollbackOptimistic } from "./optimistic";
import { keys } from "./query-keys";
import { detail } from "./shape-adapters";
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
		onMutate: (newData) =>
			applyOptimistic(queryClient, [
				{
					queryKey: keys.companies.detail(id),
					update: detail<Company>((company) => ({ ...company, ...newData })),
				},
			]),
		onError: (_err, _newData, context) => rollbackOptimistic(queryClient, context),
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

export function useArchiveCompany() {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => client.archive(id),
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
		onSuccess: (created) => {
			queryClient.setQueryData<Company>(keys.companies.detail(companyId), (prev) =>
				prev ? { ...prev, addresses: [...prev.addresses, created] } : prev,
			);
		},
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

export function useUploadCompanyCard(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (file: File) => client.uploadCard(companyId, file),
		onSuccess: (company) => queryClient.setQueryData(keys.companies.detail(companyId), company),
	});
}

export function useDeleteCompanyCard(companyId: string) {
	const client = useCompaniesClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => client.deleteCard(companyId),
		onSuccess: (company) => queryClient.setQueryData(keys.companies.detail(companyId), company),
	});
}
