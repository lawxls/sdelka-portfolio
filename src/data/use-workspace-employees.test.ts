import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { server } from "@/test-msw";
import { createQueryWrapper, createTestQueryClient, mockHostname } from "@/test-utils";
import { useInviteEmployees, useWorkspaceEmployees } from "./use-workspace-employees";

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	localStorage.setItem("auth-refresh-token", "test-refresh");
});

afterEach(() => {
	localStorage.clear();
});

const mockEmployees = [
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
	},
];

describe("useWorkspaceEmployees", () => {
	it("returns employee list from MSW", async () => {
		server.use(
			http.get("/api/v1/workspace/employees/", () => {
				return HttpResponse.json(mockEmployees);
			}),
		);

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
		server.use(
			http.get("/api/v1/workspace/employees/", () => {
				return HttpResponse.json(mockEmployees);
			}),
		);

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
	it("posts correct bulk payload to invite endpoint", async () => {
		let capturedBody: unknown = null;

		server.use(
			http.post("/api/v1/workspace/employees/invite/", async ({ request }) => {
				capturedBody = await request.json();
				return new HttpResponse(null, { status: 201 });
			}),
		);

		const { result } = renderHook(() => useInviteEmployees(), {
			wrapper: createQueryWrapper(queryClient),
		});

		const invites = [{ email: "new@example.com", position: "Менеджер", role: "user" as const, companies: ["c1"] }];

		await act(async () => {
			await result.current.mutateAsync(invites);
		});

		expect(capturedBody).toEqual({ invites });
	});

	it("returns 201 and resolves without error", async () => {
		server.use(
			http.post("/api/v1/workspace/employees/invite/", () => {
				return new HttpResponse(null, { status: 201 });
			}),
		);

		const { result } = renderHook(() => useInviteEmployees(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await act(async () => {
			await expect(result.current.mutateAsync([])).resolves.toBeUndefined();
		});
	});
});
