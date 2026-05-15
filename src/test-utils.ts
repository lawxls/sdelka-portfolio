import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CurrentEmployee } from "@/data/domains/profile";
import type { Supplier } from "@/data/supplier-types";
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
		...overrides,
	};
}

export function makeCompany(id: string, overrides: Partial<CompanySummary> = {}): CompanySummary {
	return {
		id,
		name: `Company ${id}`,
		isMain: false,
		addresses: [{ id: `addr-${id}`, name: "Офис", address: "г. Москва, ул. Тестовая, д. 1", isMain: true }],
		employeeCount: 5,
		procurementItemCount: 10,
		...overrides,
	};
}

export function makeCompanyDetail(id: string, overrides: Partial<Company> = {}): Company {
	return {
		id,
		name: `Company ${id}`,
		website: "",
		description: "",
		additionalComments: "",
		isMain: false,
		employeeCount: 5,
		procurementItemCount: 10,
		addresses: [
			{
				id: `addr-${id}`,
				name: "Офис",
				address: "г. Москва, ул. Тестовая, д. 1",
				phone: "+71234567890",
				isMain: true,
			},
		],
		employees: [
			{
				id: "1",
				firstName: "Иван",
				lastName: "Иванов",
				patronymic: "Иванович",
				position: "Директор",
				role: "admin",
				phone: "+71234567890",
				email: "ivan@example.com",
				permissions: {
					id: `perm-${id}`,
					employeeId: "1",
					procurementInquiries: "edit",
					positions: "edit",
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

export function makeMe(overrides: Partial<CurrentEmployee> = {}): CurrentEmployee {
	return {
		id: 1,
		first_name: "Иван",
		last_name: "Иванов",
		email: "ivan@example.com",
		phone: "+79991234567",
		avatar_icon: "blue",
		date_joined: "2024-01-15T10:00:00Z",
		mailing_allowed: true,
		role: "admin",
		...overrides,
	};
}

export function makeSupplier(id: string, overrides: Partial<Supplier> = {}): Supplier {
	return {
		id,
		itemId: "item-1",
		procurementInquiryId: "T-001",
		companyName: `Поставщик ${id}`,
		status: "quote_requested",
		archived: false,
		inn: "0000000000",
		companyType: "manufacturer",
		region: "Москва",
		foundedYear: 2005,
		revenue: 100_000_000,
		employeeCount: 85,
		email: "info@example.ru",
		website: "https://example.ru",
		address: "г. Москва, ул. Тестовая, д. 1",
		postalCode: "101000",
		pricePerUnit: null,
		tco: null,
		deliveryCost: 1500,
		paymentType: "deferred",
		deferralDays: 14,
		leadTimeDays: 14,
		agentComment: "Тестовый комментарий агента",
		documents: [],
		chatHistory: [],
		...overrides,
	};
}

export function makeTask(id: string, overrides: Partial<Task> = {}): Task {
	return {
		id,
		name: `Task ${id}`,
		status: "assigned",
		procurementInquiry: { id: "T-001", name: "Запрос арматуры", companyId: "company-1" },
		assignee: { id: "user-1", firstName: "Алексей", lastName: "Иванов", email: "ivanov@test.com", avatarIcon: "blue" },
		createdAt: "2026-03-15T10:00:00.000Z",
		deadlineAt: "2026-04-01T18:00:00.000Z",
		description: "Test description",
		questionCount: 1,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [],
		updatedAt: "2026-03-15T10:00:00.000Z",
		...overrides,
	};
}
