import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper, createTestQueryClient, mockHostname } from "@/test-utils";
import { setTokens } from "./auth";
import * as companiesMock from "./companies-mock-data";
import type { Company } from "./types";
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

function makeStored(id: string, overrides: Partial<Company> = {}): Company {
	return {
		id,
		name: `Company ${id}`,
		website: "",
		description: "",
		additionalComments: "",
		isMain: false,
		employeeCount: 1,
		procurementItemCount: 0,
		addresses: [
			{
				id: `addr-${id}-1`,
				name: "Офис",
				address: "г. Москва",
				phone: "+71234567890",
				isMain: true,
			},
		],
		employees: [
			{
				id: 1,
				firstName: "Иван",
				lastName: "Иванов",
				patronymic: "Иванович",
				position: "Директор",
				role: "admin",
				phone: "+71234567890",
				email: "ivan@example.com",
				permissions: {
					id: "perm-1",
					employeeId: 1,
					procurement: "edit",
					tasks: "edit",
					companies: "edit",
					employees: "edit",
					emails: "edit",
				},
			},
		],
		...overrides,
	};
}

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	setTokens("test-jwt");
	companiesMock._resetCompaniesStore();
});

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("useCompanyDetail", () => {
	it("fetches company detail by id", async () => {
		companiesMock._setCompanies([makeStored("c1", { name: "Альфа" })]);

		const { result } = renderHook(() => useCompanyDetail("c1"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.data?.name).toBe("Альфа");
		});
	});

	it("does not fetch when id is null", () => {
		const { result } = renderHook(() => useCompanyDetail(null), {
			wrapper: createQueryWrapper(queryClient),
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
	});

	it("returns error when company is missing", async () => {
		companiesMock._setCompanies([]);
		const { result } = renderHook(() => useCompanyDetail("missing"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.error).toBeTruthy();
		});
	});
});

describe("useUpdateCompany", () => {
	it("persists patched fields to the mock store", async () => {
		companiesMock._setCompanies([makeStored("c1", { name: "Original" })]);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				update: useUpdateCompany("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data?.name).toBe("Original"));

		result.current.update.mutate({ name: "Updated" });

		await waitFor(() => expect(result.current.update.isSuccess).toBe(true));
		expect(companiesMock._getCompanies().find((c) => c.id === "c1")?.name).toBe("Updated");
	});

	it("optimistically updates query cache", async () => {
		companiesMock._setCompanies([makeStored("c1", { name: "Original" })]);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				update: useUpdateCompany("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data?.name).toBe("Original"));

		result.current.update.mutate({ name: "Updated" });

		// Optimistic: cache updates synchronously before the mock resolves
		await waitFor(() => {
			expect(result.current.detail.data?.name).toBe("Updated");
		});
	});

	it("rolls back cache on error", async () => {
		companiesMock._setCompanies([makeStored("c1", { name: "Original" })]);
		vi.spyOn(companiesMock, "updateCompanyMock").mockRejectedValue(new Error("boom"));

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				update: useUpdateCompany("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data?.name).toBe("Original"));

		result.current.update.mutate({ name: "Failed" });

		await waitFor(() => {
			expect(result.current.update.error).toBeTruthy();
		});
		expect(result.current.detail.data?.name).toBe("Original");
	});
});

describe("useDeleteCompany", () => {
	it("removes the company from the store", async () => {
		companiesMock._setCompanies([makeStored("c1"), makeStored("c2")]);

		const { result } = renderHook(() => useDeleteCompany(), {
			wrapper: createQueryWrapper(queryClient),
		});

		result.current.mutate("c1");

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(companiesMock._getCompanies().map((c) => c.id)).toEqual(["c2"]);
	});

	it("returns error when delete fails", async () => {
		vi.spyOn(companiesMock, "deleteCompanyMock").mockRejectedValue(new Error("boom"));

		const { result } = renderHook(() => useDeleteCompany(), {
			wrapper: createQueryWrapper(queryClient),
		});

		result.current.mutate("c1");

		await waitFor(() => expect(result.current.error).toBeTruthy());
	});
});

describe("useCreateCompany", () => {
	it("appends a new company with nested address", async () => {
		companiesMock._setCompanies([]);

		const { result } = renderHook(() => useCreateCompany(), {
			wrapper: createQueryWrapper(queryClient),
		});

		result.current.mutate({
			name: "Новая компания",
			address: {
				name: "Офис",
				address: "г. Москва, ул. Тестовая, д. 1",
				phone: "+71234567890",
			},
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		const all = companiesMock._getCompanies();
		expect(all).toHaveLength(1);
		expect(all[0].name).toBe("Новая компания");
		expect(all[0].addresses).toHaveLength(1);
	});
});

describe("useCreateAddress", () => {
	it("appends an address to the company", async () => {
		companiesMock._setCompanies([makeStored("c1")]);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				create: useCreateAddress("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.create.mutate({
			name: "Новый офис",
			address: "г. Москва, ул. Новая, д. 5",
			phone: "+79001234567",
		});

		await waitFor(() => expect(result.current.create.isSuccess).toBe(true));
		expect(companiesMock._getCompanies()[0].addresses).toHaveLength(2);
	});
});

describe("useUpdateAddress", () => {
	it("patches address fields", async () => {
		companiesMock._setCompanies([makeStored("c1")]);
		const addressId = companiesMock._getCompanies()[0].addresses[0].id;

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				update: useUpdateAddress("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.update.mutate({ addressId, data: { name: "Обновлённый" } });

		await waitFor(() => expect(result.current.update.isSuccess).toBe(true));
		expect(companiesMock._getCompanies()[0].addresses[0].name).toBe("Обновлённый");
	});
});

describe("useDeleteAddress", () => {
	it("removes the address from the company", async () => {
		companiesMock._setCompanies([
			makeStored("c1", {
				addresses: [
					{ id: "a1", name: "Офис 1", address: "", phone: "", isMain: true },
					{ id: "a2", name: "Офис 2", address: "", phone: "", isMain: false },
				],
			}),
		]);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				remove: useDeleteAddress("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.remove.mutate("a1");

		await waitFor(() => expect(result.current.remove.isSuccess).toBe(true));
		expect(companiesMock._getCompanies()[0].addresses.map((a) => a.id)).toEqual(["a2"]);
	});
});

describe("useCreateEmployee", () => {
	it("appends an employee with default permissions", async () => {
		companiesMock._setCompanies([makeStored("c1", { employees: [] })]);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				create: useCreateEmployee("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.create.mutate({
			firstName: "Пётр",
			lastName: "Петров",
			patronymic: "Петрович",
			position: "Менеджер",
			role: "user",
			phone: "+79001234567",
			email: "petr@example.com",
		});

		await waitFor(() => expect(result.current.create.isSuccess).toBe(true));
		expect(companiesMock._getCompanies()[0].employees).toHaveLength(1);
		expect(companiesMock._getCompanies()[0].employees[0].permissions.procurement).toBe("none");
	});
});

describe("useUpdateEmployee", () => {
	it("patches employee fields", async () => {
		companiesMock._setCompanies([makeStored("c1")]);
		const empId = companiesMock._getCompanies()[0].employees[0].id;

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				update: useUpdateEmployee("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.update.mutate({ employeeId: empId, data: { position: "Директор по продажам" } });

		await waitFor(() => expect(result.current.update.isSuccess).toBe(true));
		expect(companiesMock._getCompanies()[0].employees[0].position).toBe("Директор по продажам");
	});
});

describe("useDeleteEmployee", () => {
	it("removes employee from company", async () => {
		companiesMock._setCompanies([
			makeStored("c1", {
				employees: [
					{
						id: 1,
						firstName: "Иван",
						lastName: "Иванов",
						patronymic: "",
						position: "Директор",
						role: "admin",
						phone: "",
						email: "",
						permissions: {
							id: "p1",
							employeeId: 1,
							procurement: "edit",
							tasks: "edit",
							companies: "edit",
							employees: "edit",
							emails: "edit",
						},
					},
					{
						id: 2,
						firstName: "Пётр",
						lastName: "Петров",
						patronymic: "",
						position: "Менеджер",
						role: "user",
						phone: "",
						email: "",
						permissions: {
							id: "p2",
							employeeId: 2,
							procurement: "none",
							tasks: "none",
							companies: "none",
							employees: "none",
							emails: "none",
						},
					},
				],
			}),
		]);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				remove: useDeleteEmployee("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.remove.mutate(2);

		await waitFor(() => expect(result.current.remove.isSuccess).toBe(true));
		expect(companiesMock._getCompanies()[0].employees.map((e) => e.id)).toEqual([1]);
	});
});

describe("useUpdateEmployeePermissions", () => {
	it("patches permission levels", async () => {
		companiesMock._setCompanies([makeStored("c1")]);
		const empId = companiesMock._getCompanies()[0].employees[0].id;

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				updatePerms: useUpdateEmployeePermissions("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.updatePerms.mutate({ employeeId: empId, data: { employees: "view" } });

		await waitFor(() => expect(result.current.updatePerms.isSuccess).toBe(true));
		expect(companiesMock._getCompanies()[0].employees[0].permissions.employees).toBe("view");
	});
});
