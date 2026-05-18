import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CurrentEmployee } from "@/data/domains/profile";
import type { Supplier } from "@/data/supplier-types";
import type { Task } from "@/data/task-types";
import type { Company, CompanySummary, ProcurementInquiry, ProcurementItem } from "@/data/types";

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

export function makeProcurementInquiry(id: string, overrides: Partial<ProcurementInquiry> = {}): ProcurementInquiry {
	return {
		id,
		name: `Inquiry ${id}`,
		companyId: "company-1",
		folderId: null,
		copySuppliersFromInquiryId: null,
		status: "searching",
		deadline: "2026-05-15",
		additionalInfo: "",
		deliveryAddressId: null,
		unloading: "",
		analoguesNotAllowed: false,
		cashAllowed: false,
		emailSubject: "",
		emailBody: "",
		sendRequestsAutomatically: false,
		isArchived: false,
		kpCount: 0,
		positionsCount: 0,
		tasksCount: 0,
		suppliersCount: 0,
		createdAt: "2026-04-01T00:00:00+03:00",
		updatedAt: "2026-04-01T00:00:00+03:00",
		generatedQuestions: [],
		...overrides,
	};
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
		addressesCount: 1,
		employeeCount: 5,
		procurementItemCount: 10,
		createdAt: "2026-04-01T00:00:00+03:00",
		updatedAt: "2026-04-01T00:00:00+03:00",
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
		cardFile: null,
		cardFileName: "",
		employeeCount: 5,
		procurementItemCount: 10,
		addressesCount: 1,
		createdAt: "2026-04-01T00:00:00+03:00",
		updatedAt: "2026-04-01T00:00:00+03:00",
		addresses: [
			{
				id: `addr-${id}`,
				name: "Офис",
				address: "г. Москва, ул. Тестовая, д. 1",
				phone: "+71234567890",
				isMain: true,
			},
		],
		...overrides,
	};
}

export function makeMe(overrides: Partial<CurrentEmployee> = {}): CurrentEmployee {
	return {
		id: 1,
		firstName: "Иван",
		lastName: "Иванов",
		email: "ivan@example.com",
		phone: "+79991234567",
		avatarIcon: "blue",
		dateJoined: "2024-01-15T10:00:00Z",
		mailingAllowed: true,
		emailSignature: "",
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
