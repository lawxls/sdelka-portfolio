import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Task } from "@/data/task-types";
import type { Company, CompanySummary, ProcurementItem } from "@/data/types";

export function mockHostname(hostname: string) {
	vi.spyOn(window, "location", "get").mockReturnValue({
		...window.location,
		hostname,
	});
}

export function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
}

export function createQueryWrapper(queryClient: QueryClient) {
	return ({ children }: { children: ReactNode }) => QueryClientProvider({ client: queryClient, children });
}

export function TooltipWrapper({ children }: { children: ReactNode }) {
	return TooltipProvider({ children });
}

export function makeItem(id: string, overrides: Partial<ProcurementItem> = {}): ProcurementItem {
	return {
		id,
		name: `Item ${id}`,
		status: "searching",
		annualQuantity: 100,
		currentPrice: 50,
		bestPrice: 40,
		averagePrice: 45,
		folderId: null,
		companyId: "company-1",
		...overrides,
	};
}

export function makeCompany(id: string, overrides: Partial<CompanySummary> = {}): CompanySummary {
	return {
		id,
		name: `Company ${id}`,
		isMain: false,
		responsibleEmployeeName: "Иванов Иван",
		addresses: [{ id: `addr-${id}`, name: "Офис", type: "office", address: "г. Москва, ул. Тестовая, д. 1" }],
		employeeCount: 5,
		procurementItemCount: 10,
		...overrides,
	};
}

export function makeCompanyDetail(id: string, overrides: Partial<Company> = {}): Company {
	return {
		id,
		name: `Company ${id}`,
		industry: "",
		website: "",
		description: "",
		preferredPayment: "",
		preferredDelivery: "",
		additionalComments: "",
		isMain: false,
		employeeCount: 5,
		procurementItemCount: 10,
		addresses: [
			{
				id: `addr-${id}`,
				name: "Офис",
				type: "office",
				postalCode: "123456",
				address: "г. Москва, ул. Тестовая, д. 1",
				contactPerson: "Иванов",
				phone: "+71234567890",
			},
		],
		employees: [
			{
				id: `emp-${id}`,
				firstName: "Иван",
				lastName: "Иванов",
				patronymic: "Иванович",
				position: "Директор",
				role: "admin",
				phone: "+71234567890",
				email: "ivan@example.com",
				isResponsible: true,
				permissions: {
					id: `perm-${id}`,
					employeeId: `emp-${id}`,
					analytics: "edit",
					procurement: "edit",
					companies: "edit",
					tasks: "edit",
				},
			},
		],
		...overrides,
	};
}

export function makeTask(id: string, overrides: Partial<Task> = {}): Task {
	return {
		id,
		title: `Task ${id}`,
		procurementItemName: "Арматура А500С",
		status: "assigned",
		createdAt: "2026-03-15T10:00:00.000Z",
		deadline: "2026-04-01T18:00:00.000Z",
		assignee: { name: "Иванов Алексей", initials: "ИА" },
		description: "Test description",
		questionCount: 1,
		answer: null,
		attachments: [],
		...overrides,
	};
}
