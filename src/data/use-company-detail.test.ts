import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { server } from "@/test-msw";
import { createQueryWrapper, createTestQueryClient, makeCompanyDetail, mockHostname } from "@/test-utils";
import { setTokens } from "./auth";
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

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	setTokens("test-jwt", "test-refresh");
});

afterEach(() => {
	localStorage.clear();
});

describe("useCompanyDetail", () => {
	it("fetches company detail by id", async () => {
		const company = makeCompanyDetail("c1");
		server.use(http.get("/api/v1/companies/c1/", () => HttpResponse.json(company)));

		const { result } = renderHook(() => useCompanyDetail("c1"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.data).toEqual(company);
		});
	});

	it("does not fetch when id is null", () => {
		const { result } = renderHook(() => useCompanyDetail(null), {
			wrapper: createQueryWrapper(queryClient),
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
	});

	it("returns error on API failure", async () => {
		server.use(http.get("/api/v1/companies/c1/", () => HttpResponse.json({}, { status: 500 })));

		const { result } = renderHook(() => useCompanyDetail("c1"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.error).toBeTruthy();
		});
	});
});

describe("useUpdateCompany", () => {
	it("sends PATCH with updated fields", async () => {
		let capturedBody: Record<string, unknown> | undefined;
		const original = makeCompanyDetail("c1");
		const updated = makeCompanyDetail("c1", { name: "Updated" });

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(original)),
			http.patch("/api/v1/companies/c1/", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(updated);
			}),
		);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				update: useUpdateCompany("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.update.mutate({ name: "Updated" });

		await waitFor(() => expect(result.current.update.isSuccess).toBe(true));

		expect(capturedBody).toEqual({ name: "Updated" });
	});

	it("optimistically updates query cache", async () => {
		const original = makeCompanyDetail("c1", { name: "Original" });

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(original)),
			http.patch("/api/v1/companies/c1/", async () => {
				await new Promise((r) => setTimeout(r, 100));
				return HttpResponse.json(makeCompanyDetail("c1", { name: "Updated" }));
			}),
		);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				update: useUpdateCompany("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data?.name).toBe("Original"));

		result.current.update.mutate({ name: "Updated" });

		// Optimistic: cache updates before server responds
		await waitFor(() => {
			expect(result.current.detail.data?.name).toBe("Updated");
		});
	});

	it("rolls back cache on error", async () => {
		const original = makeCompanyDetail("c1", { name: "Original" });

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(original)),
			http.patch("/api/v1/companies/c1/", () => HttpResponse.json({}, { status: 500 })),
		);

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

		// Cache rolled back
		expect(result.current.detail.data?.name).toBe("Original");
	});
});

describe("useDeleteCompany", () => {
	it("sends DELETE and invalidates companies list", async () => {
		let deletedId: string | undefined;

		server.use(
			http.delete("/api/v1/companies/:id/", ({ params }) => {
				deletedId = params.id as string;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		const { result } = renderHook(() => useDeleteCompany(), {
			wrapper: createQueryWrapper(queryClient),
		});

		result.current.mutate("c1");

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(deletedId).toBe("c1");
	});

	it("returns error for isMain company (403)", async () => {
		server.use(
			http.delete("/api/v1/companies/:id/", () =>
				HttpResponse.json({ detail: "Cannot delete main company" }, { status: 403 }),
			),
		);

		const { result } = renderHook(() => useDeleteCompany(), {
			wrapper: createQueryWrapper(queryClient),
		});

		result.current.mutate("c1");

		await waitFor(() => expect(result.current.error).toBeTruthy());
	});

	it("returns error for company with active procurement (409)", async () => {
		server.use(
			http.delete("/api/v1/companies/:id/", () =>
				HttpResponse.json({ detail: "Company has active procurement items" }, { status: 409 }),
			),
		);

		const { result } = renderHook(() => useDeleteCompany(), {
			wrapper: createQueryWrapper(queryClient),
		});

		result.current.mutate("c1");

		await waitFor(() => expect(result.current.error).toBeTruthy());
	});
});

describe("useCreateCompany", () => {
	it("sends POST with nested payload", async () => {
		let capturedBody: Record<string, unknown> | undefined;
		const created = makeCompanyDetail("new-1", { name: "Новая компания" });

		server.use(
			http.post("/api/v1/companies/", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(created);
			}),
		);

		const { result } = renderHook(() => useCreateCompany(), {
			wrapper: createQueryWrapper(queryClient),
		});

		const payload = {
			name: "Новая компания",
			address: {
				name: "Офис",
				type: "office" as const,
				postalCode: "123456",
				address: "ул. Тестовая, 1",
				city: "Москва",
				region: "Московская область",
				contactPerson: "Иванов",
				phone: "+71234567890",
			},
			employee: {
				firstName: "Иван",
				lastName: "Иванов",
				patronymic: "Иванович",
				position: "Директор",
				role: "admin" as const,
				phone: "+71234567890",
				email: "ivan@example.com",
				isResponsible: true,
			},
		};

		result.current.mutate(payload);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(capturedBody).toEqual(payload);
	});

	it("returns error on server failure", async () => {
		server.use(http.post("/api/v1/companies/", () => HttpResponse.json({ detail: "Server error" }, { status: 500 })));

		const { result } = renderHook(() => useCreateCompany(), {
			wrapper: createQueryWrapper(queryClient),
		});

		result.current.mutate({
			name: "Fail",
			address: {
				name: "Офис",
				type: "office" as const,
				postalCode: "",
				address: "",
				city: "",
				region: "",
				contactPerson: "",
				phone: "",
			},
			employee: {
				firstName: "Тест",
				lastName: "Тестов",
				patronymic: "",
				position: "",
				role: "user" as const,
				phone: "",
				email: "",
				isResponsible: true,
			},
		});

		await waitFor(() => expect(result.current.error).toBeTruthy());
	});
});

describe("useCreateAddress", () => {
	it("sends POST and invalidates company cache", async () => {
		let capturedBody: Record<string, unknown> | undefined;
		const company = makeCompanyDetail("c1");
		const newAddress = {
			id: "addr-new",
			name: "Новый офис",
			type: "office" as const,
			postalCode: "111111",
			address: "ул. Новая, 5",
			city: "Москва",
			region: "Московская область",
			contactPerson: "Петров",
			phone: "+79001234567",
		};

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(company)),
			http.post("/api/v1/companies/c1/addresses", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(newAddress);
			}),
		);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				create: useCreateAddress("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		const { id: _, ...createData } = newAddress;
		result.current.create.mutate(createData);

		await waitFor(() => expect(result.current.create.isSuccess).toBe(true));

		expect(capturedBody).toEqual(createData);
	});
});

describe("useUpdateAddress", () => {
	it("sends PATCH with updated fields", async () => {
		let capturedBody: Record<string, unknown> | undefined;
		const company = makeCompanyDetail("c1");

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(company)),
			http.patch("/api/v1/companies/c1/addresses/:addressId", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json({ ...company.addresses[0], ...capturedBody });
			}),
		);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				update: useUpdateAddress("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.update.mutate({ addressId: company.addresses[0].id, data: { name: "Обновлённый" } });

		await waitFor(() => expect(result.current.update.isSuccess).toBe(true));

		expect(capturedBody).toEqual({ name: "Обновлённый" });
	});
});

describe("useDeleteAddress", () => {
	it("sends DELETE and invalidates company cache", async () => {
		let deletedId: string | undefined;
		const company = makeCompanyDetail("c1", {
			addresses: [
				{
					id: "addr-1",
					name: "Офис 1",
					type: "office",
					postalCode: "",
					address: "",
					city: "",
					region: "",
					contactPerson: "",
					phone: "",
				},
				{
					id: "addr-2",
					name: "Офис 2",
					type: "office",
					postalCode: "",
					address: "",
					city: "",
					region: "",
					contactPerson: "",
					phone: "",
				},
			],
		});

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(company)),
			http.delete("/api/v1/companies/c1/addresses/:addressId", ({ params }) => {
				deletedId = params.addressId as string;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				remove: useDeleteAddress("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.remove.mutate("addr-1");

		await waitFor(() => expect(result.current.remove.isSuccess).toBe(true));

		expect(deletedId).toBe("addr-1");
	});

	it("returns error when deleting last address (409)", async () => {
		const company = makeCompanyDetail("c1");

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(company)),
			http.delete("/api/v1/companies/c1/addresses/:addressId", () =>
				HttpResponse.json({ detail: "Cannot delete the last address" }, { status: 409 }),
			),
		);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				remove: useDeleteAddress("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.remove.mutate(company.addresses[0].id);

		await waitFor(() => expect(result.current.remove.error).toBeTruthy());
	});
});

describe("useCreateEmployee", () => {
	it("sends POST with employee data", async () => {
		let capturedBody: Record<string, unknown> | undefined;
		const company = makeCompanyDetail("c1");
		const newEmployee = {
			id: "emp-new",
			firstName: "Пётр",
			lastName: "Петров",
			patronymic: "Петрович",
			position: "Менеджер",
			role: "user" as const,
			phone: "+79001234567",
			email: "petr@example.com",
			isResponsible: false,
			permissions: {
				id: "perm-new",
				employeeId: "emp-new",
				analytics: "none" as const,
				procurement: "none" as const,
				companies: "none" as const,
				tasks: "none" as const,
			},
		};

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(company)),
			http.post("/api/v1/companies/c1/employees", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(newEmployee);
			}),
		);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				create: useCreateEmployee("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		const { id: _, permissions: __, ...createData } = newEmployee;
		result.current.create.mutate(createData);

		await waitFor(() => expect(result.current.create.isSuccess).toBe(true));

		expect(capturedBody).toEqual(createData);
	});
});

describe("useUpdateEmployee", () => {
	it("sends PATCH with updated fields", async () => {
		let capturedBody: Record<string, unknown> | undefined;
		const company = makeCompanyDetail("c1");

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(company)),
			http.patch("/api/v1/companies/c1/employees/:employeeId", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json({ ...company.employees[0], ...capturedBody });
			}),
		);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				update: useUpdateEmployee("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.update.mutate({
			employeeId: company.employees[0].id,
			data: { position: "Директор по продажам" },
		});

		await waitFor(() => expect(result.current.update.isSuccess).toBe(true));

		expect(capturedBody).toEqual({ position: "Директор по продажам" });
	});
});

describe("useDeleteEmployee", () => {
	it("sends DELETE and invalidates cache", async () => {
		let deletedId: string | undefined;
		const company = makeCompanyDetail("c1", {
			employees: [
				{
					id: "emp-1",
					firstName: "Иван",
					lastName: "Иванов",
					patronymic: "Иванович",
					position: "Директор",
					role: "admin",
					phone: "+71234567890",
					email: "ivan@example.com",
					isResponsible: true,
					permissions: {
						id: "p1",
						employeeId: "emp-1",
						analytics: "edit",
						procurement: "edit",
						companies: "edit",
						tasks: "edit",
					},
				},
				{
					id: "emp-2",
					firstName: "Пётр",
					lastName: "Петров",
					patronymic: "Петрович",
					position: "Менеджер",
					role: "user",
					phone: "+79001234567",
					email: "petr@example.com",
					isResponsible: false,
					permissions: {
						id: "p2",
						employeeId: "emp-2",
						analytics: "none",
						procurement: "none",
						companies: "none",
						tasks: "none",
					},
				},
			],
		});

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(company)),
			http.delete("/api/v1/companies/c1/employees/:employeeId", ({ params }) => {
				deletedId = params.employeeId as string;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				remove: useDeleteEmployee("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.remove.mutate("emp-2");

		await waitFor(() => expect(result.current.remove.isSuccess).toBe(true));

		expect(deletedId).toBe("emp-2");
	});

	it("returns error when deleting only responsible employee (409)", async () => {
		const company = makeCompanyDetail("c1");

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(company)),
			http.delete("/api/v1/companies/c1/employees/:employeeId", () =>
				HttpResponse.json({ detail: "Cannot delete the only responsible employee" }, { status: 409 }),
			),
		);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				remove: useDeleteEmployee("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.remove.mutate(company.employees[0].id);

		await waitFor(() => expect(result.current.remove.error).toBeTruthy());
	});
});

describe("useUpdateEmployeePermissions", () => {
	it("sends PATCH with permission changes", async () => {
		let capturedBody: Record<string, unknown> | undefined;
		const company = makeCompanyDetail("c1");

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(company)),
			http.patch("/api/v1/companies/c1/employees/:employeeId/permissions", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json({ ...company.employees[0].permissions, ...capturedBody });
			}),
		);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				updatePerms: useUpdateEmployeePermissions("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.updatePerms.mutate({
			employeeId: company.employees[0].id,
			data: { analytics: "view" },
		});

		await waitFor(() => expect(result.current.updatePerms.isSuccess).toBe(true));

		expect(capturedBody).toEqual({ analytics: "view" });
	});
});
