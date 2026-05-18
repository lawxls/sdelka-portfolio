import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/test-utils";
import type { EmployeesClient } from "./clients/employees-client";
import type { EmployeeWithPermissions } from "./domains/employees";
import { fakeEmployeesClient, TestClientsProvider } from "./test-clients-provider";
import {
	useCompanyEmployees,
	useCreateEmployee,
	useDeleteEmployee,
	useUpdateEmployee,
	useUpdateEmployeePermissions,
} from "./use-company-employees";

let queryClient: QueryClient;

function wrapperFactory(client: EmployeesClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ employees: client }}>
			{children}
		</TestClientsProvider>
	);
}

function makeEmployee(id: string, overrides: Partial<EmployeeWithPermissions> = {}): EmployeeWithPermissions {
	return {
		id,
		firstName: "Иван",
		lastName: "Иванов",
		patronymic: "Иванович",
		position: "Директор",
		role: "admin",
		phone: "+71234567890",
		email: "ivan@example.com",
		permissions: {
			id: `perm-${id}`,
			employeeId: id,
			procurementInquiries: "edit",
			positions: "edit",
			tasks: "edit",
			companies: "edit",
			employees: "edit",
			emails: "edit",
		},
		...overrides,
	};
}

beforeEach(() => {
	queryClient = createTestQueryClient();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useCompanyEmployees", () => {
	it("fetches employees by company", async () => {
		const listByCompany = vi.fn().mockResolvedValue([makeEmployee("1")]);
		const client = fakeEmployeesClient({ listByCompany });

		const { result } = renderHook(() => useCompanyEmployees("c1"), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.data).toHaveLength(1));
		expect(listByCompany).toHaveBeenCalledWith("c1");
	});

	it("does not fetch when companyId is null", () => {
		const listByCompany = vi.fn();
		const client = fakeEmployeesClient({ listByCompany });

		const { result } = renderHook(() => useCompanyEmployees(null), { wrapper: wrapperFactory(client) });

		expect(result.current.isLoading).toBe(false);
		expect(listByCompany).not.toHaveBeenCalled();
	});
});

describe("useCreateEmployee", () => {
	it("calls client.create with companyId and data", async () => {
		const create = vi.fn().mockResolvedValue(makeEmployee("1"));
		const client = fakeEmployeesClient({ create });

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
		expect(create).toHaveBeenCalledWith("c1", data);
	});
});

describe("useUpdateEmployee", () => {
	it("calls client.update with employeeId and data", async () => {
		const update = vi.fn().mockResolvedValue(makeEmployee("1"));
		const client = fakeEmployeesClient({ update });

		const { result } = renderHook(() => useUpdateEmployee("c1"), { wrapper: wrapperFactory(client) });
		result.current.mutate({ employeeId: "1", data: { position: "CEO" } });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(update).toHaveBeenCalledWith("c1", "1", { position: "CEO" });
	});
});

describe("useDeleteEmployee", () => {
	it("calls client.delete", async () => {
		const del = vi.fn().mockResolvedValue(undefined);
		const client = fakeEmployeesClient({ delete: del });

		const { result } = renderHook(() => useDeleteEmployee("c1"), { wrapper: wrapperFactory(client) });
		result.current.mutate("1");

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(del).toHaveBeenCalledWith("c1", "1");
	});
});

describe("useUpdateEmployeePermissions", () => {
	it("calls client.updatePermissions with employeeId and data", async () => {
		const updatePermissions = vi.fn().mockResolvedValue({
			id: "p1",
			employeeId: "1",
			procurementInquiries: "edit",
			positions: "edit",
			tasks: "edit",
			companies: "edit",
			employees: "view",
			emails: "edit",
		});
		const client = fakeEmployeesClient({ updatePermissions });

		const { result } = renderHook(() => useUpdateEmployeePermissions("c1"), { wrapper: wrapperFactory(client) });
		result.current.mutate({ employeeId: "1", data: { employees: "view" } });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(updatePermissions).toHaveBeenCalledWith("c1", "1", { employees: "view" });
	});
});
