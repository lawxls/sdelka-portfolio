import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, makeCompanyDetail } from "@/test-utils";
import type { CompaniesClient } from "./clients/companies-client";
import { fakeCompaniesClient, TestClientsProvider } from "./test-clients-provider";
import {
	useCompanyDetail,
	useCreateAddress,
	useCreateCompany,
	useCreateEmployee,
	useDeleteAddress,
	useDeleteCompany,
	useDeleteEmployee,
	useUpdateAddress,
	useUpdateCompany,
	useUpdateEmployee,
	useUpdateEmployeePermissions,
} from "./use-company-detail";

let queryClient: QueryClient;

function wrapperFactory(client: CompaniesClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ companies: client }}>
			{children}
		</TestClientsProvider>
	);
}

beforeEach(() => {
	queryClient = createTestQueryClient();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useCompanyDetail", () => {
	it("fetches company by id", async () => {
		const get = vi.fn().mockResolvedValue(makeCompanyDetail("c1", { name: "Альфа" }));
		const client = fakeCompaniesClient({ get });

		const { result } = renderHook(() => useCompanyDetail("c1"), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.data?.name).toBe("Альфа"));
		expect(get).toHaveBeenCalledWith("c1");
	});

	it("does not fetch when id is null", () => {
		const get = vi.fn();
		const client = fakeCompaniesClient({ get });

		const { result } = renderHook(() => useCompanyDetail(null), { wrapper: wrapperFactory(client) });

		expect(result.current.isLoading).toBe(false);
		expect(get).not.toHaveBeenCalled();
	});

	it("returns error when client throws", async () => {
		const get = vi.fn().mockRejectedValue(new Error("not found"));
		const client = fakeCompaniesClient({ get });

		const { result } = renderHook(() => useCompanyDetail("missing"), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.error).toBeTruthy());
	});
});

describe("useUpdateCompany", () => {
	it("optimistically updates the cache before the mutation resolves", async () => {
		const get = vi.fn().mockResolvedValue(makeCompanyDetail("c1", { name: "Original" }));
		const update = vi.fn(
			(_id: string, data: { name?: string }) =>
				new Promise<ReturnType<typeof makeCompanyDetail>>((resolve) =>
					setTimeout(() => resolve(makeCompanyDetail("c1", { name: data.name ?? "Original" })), 50),
				),
		);
		const client = fakeCompaniesClient({ get, update });

		const { result } = renderHook(() => ({ detail: useCompanyDetail("c1"), update: useUpdateCompany("c1") }), {
			wrapper: wrapperFactory(client),
		});

		await waitFor(() => expect(result.current.detail.data?.name).toBe("Original"));
		result.current.update.mutate({ name: "Updated" });

		await waitFor(() => expect(result.current.detail.data?.name).toBe("Updated"));
		await waitFor(() => expect(result.current.update.isSuccess).toBe(true));
	});

	it("rolls back cache on error", async () => {
		const get = vi.fn().mockResolvedValue(makeCompanyDetail("c1", { name: "Original" }));
		const update = vi.fn().mockRejectedValue(new Error("boom"));
		const client = fakeCompaniesClient({ get, update });

		const { result } = renderHook(() => ({ detail: useCompanyDetail("c1"), update: useUpdateCompany("c1") }), {
			wrapper: wrapperFactory(client),
		});

		await waitFor(() => expect(result.current.detail.data?.name).toBe("Original"));
		result.current.update.mutate({ name: "Failed" });

		await waitFor(() => expect(result.current.update.error).toBeTruthy());
		expect(result.current.detail.data?.name).toBe("Original");
	});
});

describe("useDeleteCompany", () => {
	it("calls client.delete", async () => {
		const remove = vi.fn().mockResolvedValue(undefined);
		const client = fakeCompaniesClient({ delete: remove });

		const { result } = renderHook(() => useDeleteCompany(), { wrapper: wrapperFactory(client) });
		result.current.mutate("c1");

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(remove).toHaveBeenCalledWith("c1");
	});
});

describe("useCreateCompany", () => {
	it("calls client.create with the payload", async () => {
		const create = vi.fn().mockResolvedValue(makeCompanyDetail("new-1", { name: "Новая" }));
		const client = fakeCompaniesClient({ create });

		const { result } = renderHook(() => useCreateCompany(), { wrapper: wrapperFactory(client) });
		const payload = {
			name: "Новая",
			address: { name: "Офис", address: "г. Москва", phone: "+71234567890" },
		};
		result.current.mutate(payload);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(create).toHaveBeenCalledWith(payload);
	});
});

describe("useCreateAddress", () => {
	it("calls client.createAddress with companyId and data", async () => {
		const createAddress = vi
			.fn()
			.mockResolvedValue({ id: "a1", name: "Склад", address: "г. Москва", phone: "", isMain: false });
		const client = fakeCompaniesClient({ createAddress });

		const { result } = renderHook(() => useCreateAddress("c1"), { wrapper: wrapperFactory(client) });
		result.current.mutate({ name: "Склад", address: "г. Москва", phone: "+71234567890" });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(createAddress).toHaveBeenCalledWith("c1", {
			name: "Склад",
			address: "г. Москва",
			phone: "+71234567890",
		});
	});
});

describe("useUpdateAddress", () => {
	it("calls client.updateAddress with addressId and data", async () => {
		const updateAddress = vi.fn().mockResolvedValue({ id: "a1", name: "x", address: "y", phone: "z", isMain: false });
		const client = fakeCompaniesClient({ updateAddress });

		const { result } = renderHook(() => useUpdateAddress("c1"), { wrapper: wrapperFactory(client) });
		result.current.mutate({ addressId: "a1", data: { name: "Обновлённый" } });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(updateAddress).toHaveBeenCalledWith("c1", "a1", { name: "Обновлённый" });
	});
});

describe("useDeleteAddress", () => {
	it("calls client.deleteAddress", async () => {
		const deleteAddress = vi.fn().mockResolvedValue(undefined);
		const client = fakeCompaniesClient({ deleteAddress });

		const { result } = renderHook(() => useDeleteAddress("c1"), { wrapper: wrapperFactory(client) });
		result.current.mutate("a1");

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(deleteAddress).toHaveBeenCalledWith("c1", "a1");
	});
});

describe("useCreateEmployee", () => {
	it("calls client.createEmployee with companyId and data", async () => {
		const createEmployee = vi.fn().mockResolvedValue(makeCompanyDetail("c1").employees[0]);
		const client = fakeCompaniesClient({ createEmployee });

		const { result } = renderHook(() => useCreateEmployee("c1"), { wrapper: wrapperFactory(client) });
		const data = {
			firstName: "Анна",
			lastName: "Сидорова",
			patronymic: "Викторовна",
			position: "Менеджер",
			role: "user" as const,
			phone: "+79991234567",
			email: "anna@example.com",
		};
		result.current.mutate(data);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(createEmployee).toHaveBeenCalledWith("c1", data);
	});
});

describe("useUpdateEmployee", () => {
	it("calls client.updateEmployee with employeeId and data", async () => {
		const updateEmployee = vi.fn().mockResolvedValue(makeCompanyDetail("c1").employees[0]);
		const client = fakeCompaniesClient({ updateEmployee });

		const { result } = renderHook(() => useUpdateEmployee("c1"), { wrapper: wrapperFactory(client) });
		result.current.mutate({ employeeId: 1, data: { position: "CEO" } });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(updateEmployee).toHaveBeenCalledWith("c1", 1, { position: "CEO" });
	});
});

describe("useDeleteEmployee", () => {
	it("calls client.deleteEmployee", async () => {
		const deleteEmployee = vi.fn().mockResolvedValue(undefined);
		const client = fakeCompaniesClient({ deleteEmployee });

		const { result } = renderHook(() => useDeleteEmployee("c1"), { wrapper: wrapperFactory(client) });
		result.current.mutate(1);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(deleteEmployee).toHaveBeenCalledWith("c1", 1);
	});
});

describe("useUpdateEmployeePermissions", () => {
	it("calls client.updateEmployeePermissions with data", async () => {
		const updateEmployeePermissions = vi.fn().mockResolvedValue({
			id: "p1",
			employeeId: 1,
			procurement: "edit",
			tasks: "edit",
			companies: "edit",
			employees: "view",
			emails: "edit",
		});
		const client = fakeCompaniesClient({ updateEmployeePermissions });

		const { result } = renderHook(() => useUpdateEmployeePermissions("c1"), { wrapper: wrapperFactory(client) });
		result.current.mutate({ employeeId: 1, data: { employees: "view" } });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(updateEmployeePermissions).toHaveBeenCalledWith("c1", 1, { employees: "view" });
	});
});
