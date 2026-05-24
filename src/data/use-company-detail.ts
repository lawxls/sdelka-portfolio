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

const INN_LEGAL_ENTITY_LEN = 10;
const INN_INDIVIDUAL_LEN = 12;

/** True for either INN-10 (legal entity) or INN-12 (sole proprietor). The
 * lookup hook only fires when this returns `true`, so we don't pester
 * DaData on partial input. */
export function isValidCompanyInnLength(inn: string): boolean {
	return inn.length === INN_LEGAL_ENTITY_LEN || inn.length === INN_INDIVIDUAL_LEN;
}

/** Lookup company identity by INN via DaData. Returns `null` on miss (404),
 * throws on upstream errors so the drawer can render its retry banner. */
export function useCompanyLookupByInn(inn: string, options?: { enabled?: boolean }) {
	const client = useCompaniesClient();
	const enabled = (options?.enabled ?? true) && isValidCompanyInnLength(inn);
	return useQuery({
		queryKey: ["company-lookup", inn],
		queryFn: () => client.lookupByInn(inn),
		enabled,
		// Cached for a minute so backtracking the INN doesn't re-fetch.
		staleTime: 60_000,
		// 404 ("не найдено") is data, not an error; retrying it is pointless.
		// Upstream errors (502) propagate but should NOT be retried automatically —
		// the drawer surfaces a manual retry button for that case.
		retry: false,
	});
}
