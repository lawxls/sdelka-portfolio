import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/test-utils";
import type { WorkspaceEmployeesClient } from "./clients/workspace-employees-client";
import type { WorkspaceEmployee, WorkspaceEmployeeDetail } from "./domains/workspace-employees";
import { NetworkError, NotFoundError, ValidationError } from "./errors";
import { fakeWorkspaceEmployeesClient, TestClientsProvider } from "./test-clients-provider";
import {
	useDeleteWorkspaceEmployees,
	useInviteEmployees,
	useUpdateWorkspaceEmployee,
	useUpdateWorkspaceEmployeePermissions,
	useWorkspaceEmployeeDetail,
	useWorkspaceEmployees,
} from "./use-workspace-employees";

let queryClient: QueryClient;

function wrapperFactory(client: WorkspaceEmployeesClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ workspaceEmployees: client }}>
			{children}
		</TestClientsProvider>
	);
}

function makeEmployee(id: number, overrides: Partial<WorkspaceEmployee> = {}): WorkspaceEmployee {
	return {
		id,
		firstName: "Иван",
		lastName: "Иванов",
		patronymic: "Иванович",
		position: "Менеджер",
		role: "user",
		phone: "+71112223344",
		email: `e${id}@example.com`,
		registeredAt: "2024-01-15T10:00:00Z",
		companies: [],
		...overrides,
	};
}

function makeDetail(id: number, overrides: Partial<WorkspaceEmployeeDetail> = {}): WorkspaceEmployeeDetail {
	return {
		...makeEmployee(id),
		permissions: {
			id: `perm-${id}`,
			employeeId: id,
			procurement: "view",
			tasks: "view",
			companies: "none",
			employees: "none",
			emails: "none",
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

describe("useWorkspaceEmployees", () => {
	it("returns the employee list from the client", async () => {
		const list = vi.fn().mockResolvedValue([makeEmployee(1), makeEmployee(2, { firstName: "Мария" })]);
		const client = fakeWorkspaceEmployeesClient({ list });

		const { result } = renderHook(() => useWorkspaceEmployees(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.employees).toHaveLength(2);
		});
		expect(result.current.employees[0].email).toBe("e1@example.com");
		expect(result.current.employees[1].firstName).toBe("Мария");
	});

	it("returns loading state initially", () => {
		const client = fakeWorkspaceEmployeesClient({
			list: () => new Promise<WorkspaceEmployee[]>(() => {}),
		});
		const { result } = renderHook(() => useWorkspaceEmployees(), { wrapper: wrapperFactory(client) });
		expect(result.current.isLoading).toBe(true);
		expect(result.current.employees).toEqual([]);
	});

	it("does not call the client when disabled", async () => {
		const list = vi.fn().mockResolvedValue([]);
		const client = fakeWorkspaceEmployeesClient({ list });

		renderHook(() => useWorkspaceEmployees({ enabled: false }), { wrapper: wrapperFactory(client) });
		await Promise.resolve();
		expect(list).not.toHaveBeenCalled();
	});

	it("surfaces NetworkError as the query error", async () => {
		const client = fakeWorkspaceEmployeesClient({
			list: () => Promise.reject(new NetworkError(new Error("offline"))),
		});

		const { result } = renderHook(() => useWorkspaceEmployees(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(NetworkError);
		});
		expect(result.current.employees).toEqual([]);
	});
});

describe("useWorkspaceEmployeeDetail", () => {
	it("fetches detail with permissions for known id", async () => {
		const get = vi.fn().mockResolvedValue(makeDetail(7, { firstName: "Пётр" }));
		const client = fakeWorkspaceEmployeesClient({ get });

		const { result } = renderHook(() => useWorkspaceEmployeeDetail(7), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.employee).toBeDefined();
		});
		expect(get).toHaveBeenCalledWith(7);
		expect(result.current.employee?.firstName).toBe("Пётр");
		expect(result.current.employee?.permissions.employeeId).toBe(7);
	});

	it("does not fetch when id is null", async () => {
		const get = vi.fn();
		const client = fakeWorkspaceEmployeesClient({ get });

		const { result } = renderHook(() => useWorkspaceEmployeeDetail(null), { wrapper: wrapperFactory(client) });
		await Promise.resolve();
		expect(get).not.toHaveBeenCalled();
		expect(result.current.employee).toBeUndefined();
	});

	it("surfaces NotFoundError as the query error", async () => {
		const client = fakeWorkspaceEmployeesClient({
			get: () => Promise.reject(new NotFoundError({ detail: "missing" })),
		});

		const { result } = renderHook(() => useWorkspaceEmployeeDetail(99), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(NotFoundError);
		});
	});
});

describe("useInviteEmployees", () => {
	it("invites and triggers refetch via invalidation", async () => {
		const list = vi
			.fn()
			.mockResolvedValueOnce([makeEmployee(1)])
			.mockResolvedValueOnce([makeEmployee(1), makeEmployee(2, { email: "new@example.com" })]);
		const invite = vi.fn().mockResolvedValue(undefined);
		const client = fakeWorkspaceEmployeesClient({ list, invite });

		const { result: read } = renderHook(() => useWorkspaceEmployees(), { wrapper: wrapperFactory(client) });
		const { result: mut } = renderHook(() => useInviteEmployees(), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(read.current.employees).toHaveLength(1));

		const invites = [
			{
				email: "new@example.com",
				firstName: "",
				lastName: "",
				patronymic: "",
				position: "Менеджер",
				role: "user" as const,
				companies: [],
			},
		];

		await act(async () => {
			await mut.current.mutateAsync(invites);
		});

		expect(invite).toHaveBeenCalledWith(invites);
		await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(read.current.employees).toHaveLength(2));
	});

	it("surfaces ValidationError with fieldErrors on rejected invite", async () => {
		const fieldErrors = { email: ["already exists"] };
		const invite = vi.fn().mockRejectedValue(new ValidationError(fieldErrors));
		const client = fakeWorkspaceEmployeesClient({ invite });

		const { result } = renderHook(() => useInviteEmployees(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await expect(
				result.current.mutateAsync([
					{
						email: "dup@example.com",
						firstName: "",
						lastName: "",
						patronymic: "",
						position: "X",
						role: "user",
						companies: [],
					},
				]),
			).rejects.toBeInstanceOf(ValidationError);
		});

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(ValidationError);
		});
		expect((result.current.error as ValidationError).fieldErrors).toEqual(fieldErrors);
	});
});

describe("useDeleteWorkspaceEmployees", () => {
	it("deletes the given ids and triggers refetch via invalidation", async () => {
		const list = vi
			.fn()
			.mockResolvedValueOnce([makeEmployee(1), makeEmployee(2)])
			.mockResolvedValueOnce([makeEmployee(2)]);
		const deleteFn = vi.fn().mockResolvedValue(undefined);
		const client = fakeWorkspaceEmployeesClient({ list, delete: deleteFn });

		const { result: read } = renderHook(() => useWorkspaceEmployees(), { wrapper: wrapperFactory(client) });
		const { result: del } = renderHook(() => useDeleteWorkspaceEmployees(), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(read.current.employees).toHaveLength(2));

		await act(async () => {
			await del.current.mutateAsync([1]);
		});

		expect(deleteFn).toHaveBeenCalledWith([1]);
		await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(read.current.employees).toHaveLength(1));
	});
});

describe("useUpdateWorkspaceEmployee", () => {
	it("updates an employee and invalidates both list and detail caches", async () => {
		const update = vi.fn().mockResolvedValue(makeDetail(3, { position: "Старший менеджер" }));
		const client = fakeWorkspaceEmployeesClient({ update });

		queryClient.setQueryData(["workspace-employee", 3], makeDetail(3));
		queryClient.setQueryData(["workspace-employees"], [makeEmployee(3)]);

		const { result } = renderHook(() => useUpdateWorkspaceEmployee(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync({ id: 3, data: { position: "Старший менеджер" } });
		});

		expect(update).toHaveBeenCalledWith(3, { position: "Старший менеджер" });
		expect(queryClient.getQueryState(["workspace-employee", 3])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["workspace-employees"])?.isInvalidated).toBe(true);
	});
});

describe("useUpdateWorkspaceEmployeePermissions", () => {
	it("patches permissions and invalidates the detail cache only", async () => {
		const updatePermissions = vi.fn().mockResolvedValue({
			id: "perm-3",
			employeeId: 3,
			procurement: "edit" as const,
			tasks: "view" as const,
			companies: "none" as const,
			employees: "none" as const,
			emails: "none" as const,
		});
		const client = fakeWorkspaceEmployeesClient({ updatePermissions });

		queryClient.setQueryData(["workspace-employee", 3], makeDetail(3));
		queryClient.setQueryData(["workspace-employees"], [makeEmployee(3)]);

		const { result } = renderHook(() => useUpdateWorkspaceEmployeePermissions(), {
			wrapper: wrapperFactory(client),
		});

		await act(async () => {
			await result.current.mutateAsync({ id: 3, data: { procurement: "edit" } });
		});

		expect(updatePermissions).toHaveBeenCalledWith(3, { procurement: "edit" });
		expect(queryClient.getQueryState(["workspace-employee", 3])?.isInvalidated).toBe(true);
		// list cache stays fresh — permissions don't surface in the table.
		expect(queryClient.getQueryState(["workspace-employees"])?.isInvalidated).toBe(false);
	});
});
