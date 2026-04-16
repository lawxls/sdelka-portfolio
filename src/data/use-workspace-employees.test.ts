import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createQueryWrapper, createTestQueryClient, mockHostname } from "@/test-utils";
import { useInviteEmployees, useWorkspaceEmployees } from "./use-workspace-employees";
import { _resetWorkspaceStore, _setWorkspaceEmployees, type WorkspaceEmployeeDetail } from "./workspace-mock-data";

let queryClient: QueryClient;

const mockEmployees: WorkspaceEmployeeDetail[] = [
	{
		id: 1,
		firstName: "Иван",
		lastName: "Иванов",
		patronymic: "Иванович",
		position: "Директор",
		role: "admin",
		phone: "+71234567890",
		email: "ivan@example.com",
		isResponsible: true,
		registeredAt: "2024-01-15T10:00:00Z",
		companies: [
			{
				id: "c1",
				name: "Компания А",
				isMain: true,
				responsibleEmployeeName: null,
				addresses: [],
				employeeCount: 3,
				procurementItemCount: 5,
			},
		],
		permissions: {
			id: "perm-1",
			employeeId: 1,
			analytics: "edit",
			procurement: "edit",
			companies: "edit",
			tasks: "edit",
		},
	},
	{
		id: 2,
		firstName: "Мария",
		lastName: "Петрова",
		patronymic: "Сергеевна",
		position: "Менеджер",
		role: "user",
		phone: "+79876543210",
		email: "maria@example.com",
		isResponsible: false,
		registeredAt: null,
		companies: [],
		permissions: {
			id: "perm-2",
			employeeId: 2,
			analytics: "none",
			procurement: "none",
			companies: "none",
			tasks: "none",
		},
	},
];

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	_setWorkspaceEmployees(mockEmployees);
});

afterEach(() => {
	localStorage.clear();
	_resetWorkspaceStore();
});

describe("useWorkspaceEmployees", () => {
	it("returns employee list from mock store", async () => {
		const { result } = renderHook(() => useWorkspaceEmployees(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.employees).toHaveLength(2);
		});

		expect(result.current.employees[0].email).toBe("ivan@example.com");
		expect(result.current.employees[1].email).toBe("maria@example.com");
	});

	it("includes registeredAt and companies on each employee", async () => {
		const { result } = renderHook(() => useWorkspaceEmployees(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.employees).toHaveLength(2);
		});

		expect(result.current.employees[0].registeredAt).toBe("2024-01-15T10:00:00Z");
		expect(result.current.employees[0].companies).toHaveLength(1);
		expect(result.current.employees[0].companies[0].name).toBe("Компания А");
		expect(result.current.employees[1].registeredAt).toBeNull();
		expect(result.current.employees[1].companies).toHaveLength(0);
	});
});

describe("useInviteEmployees", () => {
	it("appends invitees to the workspace store", async () => {
		const { result } = renderHook(() => useInviteEmployees(), {
			wrapper: createQueryWrapper(queryClient),
		});

		const invites = [{ email: "new@example.com", position: "Менеджер", role: "user" as const, companies: ["c1"] }];

		await act(async () => {
			await result.current.mutateAsync(invites);
		});

		const { result: listResult } = renderHook(() => useWorkspaceEmployees(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(listResult.current.employees.some((e) => e.email === "new@example.com")).toBe(true);
		});
	});

	it("resolves without error for empty invite list", async () => {
		const { result } = renderHook(() => useInviteEmployees(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await act(async () => {
			await expect(result.current.mutateAsync([])).resolves.toBeUndefined();
		});
	});
});
