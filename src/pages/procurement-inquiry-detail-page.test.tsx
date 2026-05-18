import { QueryClient } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("sonner", () => ({
	toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { createInMemoryFoldersClient } from "@/data/clients/folders-in-memory";
import { createInMemoryItemsClient } from "@/data/clients/items-in-memory";
import { createInMemoryProcurementInquiriesClient } from "@/data/clients/procurement-inquiries-in-memory";
import { createInMemorySuppliersClient } from "@/data/clients/suppliers-in-memory";
import { createInMemoryTasksClient } from "@/data/clients/tasks-in-memory";
import { _resetMockDelay, _setMockDelay } from "@/data/mock-utils";
import { _setSupplierMockDelay } from "@/data/supplier-mock-data";
import { TestClientsProvider } from "@/data/test-clients-provider";
import type { Folder, ProcurementInquiry, ProcurementItem } from "@/data/types";
import { makeItem, makeProcurementInquiry as makeProcurementInquiryFixture, makeTask } from "@/test-utils";
import { ProcurementInquiryDetailPage } from "./procurement-inquiry-detail-page";

const FOLDERS: Folder[] = [{ id: "folder-packaging", name: "Упаковка", color: "blue" }];

function makeProcurementInquiry(id: string, overrides: Partial<ProcurementInquiry> = {}): ProcurementInquiry {
	return makeProcurementInquiryFixture(id, { name: `Запрос ${id}`, folderId: "folder-packaging", ...overrides });
}

interface RenderOpts {
	procurementInquiries?: ProcurementInquiry[];
	items?: ProcurementItem[];
	slug: string;
}

function renderPage({ procurementInquiries = [], items = [], slug }: RenderOpts) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	// Items live on the inquiry's `items` field (the detail endpoint includes
	// them inline); seed them there instead of via the items client so the
	// detail page sees them via useProcurementInquiry(slug).data.items.
	const inquiriesWithItems = procurementInquiries.map((inquiry) => {
		const inquiryItems = items.filter((i) => i.procurementInquiryId === inquiry.id);
		return inquiryItems.length > 0 ? { ...inquiry, items: inquiryItems } : inquiry;
	});
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: createInMemoryCompaniesClient(),
				items: createInMemoryItemsClient({ seed: items }),
				suppliers: createInMemorySuppliersClient({ seedByItemId: {} }),
				tasks: createInMemoryTasksClient({ seed: [] }),
				procurementInquiries: createInMemoryProcurementInquiriesClient({ seed: inquiriesWithItems }),
				folders: createInMemoryFoldersClient({ seed: FOLDERS }),
			}}
		>
			<TooltipProvider>
				<MemoryRouter initialEntries={[`/inquiries/${slug}`]}>
					<Routes>
						<Route path="/inquiries/:slug" element={<ProcurementInquiryDetailPage />} />
						<Route path="/inquiries" element={<div data-testid="procurement-inquiries-list">Запросы</div>} />
					</Routes>
				</MemoryRouter>
			</TooltipProvider>
		</TestClientsProvider>,
	);
}

beforeEach(() => {
	_setMockDelay(0, 0);
	_setSupplierMockDelay(0, 0);
});

afterEach(() => {
	_resetMockDelay();
	vi.restoreAllMocks();
});

describe("ProcurementInquiryDetailPage", () => {
	test("renders inquiry name in toolbar and all 4 tabs", async () => {
		renderPage({
			procurementInquiries: [makeProcurementInquiry("T-001", { name: "Упаковочные материалы Q2" })],
			items: [makeItem("item-1", { procurementInquiryId: "T-001", name: "Полотно ПВД" })],
			slug: "T-001",
		});

		await screen.findByRole("heading", { name: "Упаковочные материалы Q2" });
		expect(screen.getByText("№1")).toBeInTheDocument();

		const tabs = screen.getAllByRole("tab");
		expect(tabs.map((t) => t.getAttribute("aria-label"))).toEqual([
			"Поставщики",
			"Предложения",
			"Вопросы",
			"Информация",
		]);
	});

	test("default tab is Поставщики; switching to Информация renders inquiry meta + items", async () => {
		renderPage({
			procurementInquiries: [makeProcurementInquiry("T-001")],
			items: [
				makeItem("item-1", { procurementInquiryId: "T-001", name: "Позиция 1", currentPrice: 100, annualQuantity: 50 }),
				makeItem("item-2", { procurementInquiryId: "T-001", name: "Позиция 2", currentPrice: 200, annualQuantity: 30 }),
			],
			slug: "T-001",
		});

		await screen.findByRole("heading", { name: "Запрос T-001" });
		expect(screen.getByTestId("procurement-inquiry-tab-suppliers")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("tab", { name: "Информация" }));

		await waitFor(() => expect(screen.getByTestId("procurement-inquiry-tab-details")).toBeInTheDocument());
		expect(screen.getByTestId("procurement-inquiry-item-item-1")).toBeInTheDocument();
		expect(screen.getByTestId("procurement-inquiry-item-item-2")).toBeInTheDocument();
	});

	test("Вопросы tab renders tasks for the procurementInquiry; clicking a row opens the task drawer", async () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
		});
		const taskForT1 = makeTask("task-T1-1", {
			name: "Согласовать спецификацию",
			procurementInquiry: { id: "T-001", name: "Упаковочные материалы Q2", companyId: "company-1" },
		});
		const taskForOther = makeTask("task-other", {
			name: "Не наш вопрос",
			procurementInquiry: { id: "T-002", name: "Другой запрос", companyId: "company-1" },
		});
		render(
			<TestClientsProvider
				queryClient={queryClient}
				clients={{
					companies: createInMemoryCompaniesClient(),
					items: createInMemoryItemsClient({ seed: [makeItem("item-1", { procurementInquiryId: "T-001" })] }),
					suppliers: createInMemorySuppliersClient({ seedByItemId: {} }),
					tasks: createInMemoryTasksClient({ seed: [taskForT1, taskForOther] }),
					procurementInquiries: createInMemoryProcurementInquiriesClient({ seed: [makeProcurementInquiry("T-001")] }),
					folders: createInMemoryFoldersClient({ seed: FOLDERS }),
				}}
			>
				<TooltipProvider>
					<MemoryRouter initialEntries={["/inquiries/T-001"]}>
						<Routes>
							<Route path="/inquiries/:slug" element={<ProcurementInquiryDetailPage />} />
							<Route path="/inquiries" element={<div data-testid="procurement-inquiries-list">Запросы</div>} />
						</Routes>
					</MemoryRouter>
				</TooltipProvider>
			</TestClientsProvider>,
		);

		await screen.findByRole("heading", { name: "Запрос T-001" });
		fireEvent.click(screen.getByRole("tab", { name: "Вопросы" }));

		await waitFor(() => expect(screen.getByTestId("procurement-inquiry-tab-tasks")).toBeInTheDocument());
		await waitFor(() => expect(screen.getByText("Согласовать спецификацию")).toBeInTheDocument());
		// Tasks belonging to a different inquiry stay out of this tab.
		expect(screen.queryByText("Не наш вопрос")).not.toBeInTheDocument();

		fireEvent.click(screen.getByText("Согласовать спецификацию"));
		await waitFor(() => {
			expect(
				screen.getByText("Согласовать спецификацию", { selector: "[data-slot='sheet-title']" }),
			).toBeInTheDocument();
		});
	});

	test("header shows inquiry number beside name and supplier metrics in place of TCO", async () => {
		renderPage({
			procurementInquiries: [makeProcurementInquiry("T-001", { name: "Упаковочные материалы Q2" })],
			items: [makeItem("item-1", { procurementInquiryId: "T-001", currentPrice: 1776, annualQuantity: 100 })],
			slug: "T-001",
		});

		await screen.findByRole("heading", { name: "Упаковочные материалы Q2" });
		expect(screen.getByText("№1")).toBeInTheDocument();
		expect(screen.queryByTestId("procurement-inquiry-tco-headline")).not.toBeInTheDocument();
		expect(screen.getByTestId("procurement-inquiry-metric-contacted")).toBeInTheDocument();
		expect(screen.getByTestId("procurement-inquiry-metric-quotes")).toBeInTheDocument();
		expect(screen.getByTestId("procurement-inquiry-metric-refusals")).toBeInTheDocument();
	});

	test("renders «Запрос не найден» on unknown slug", async () => {
		renderPage({ procurementInquiries: [makeProcurementInquiry("T-001")], slug: "T-999" });

		await waitFor(() => expect(screen.getByTestId("procurement-inquiry-not-found")).toBeInTheDocument());
		expect(screen.getByText("Запрос не найден")).toBeInTheDocument();
	});

	test("archived inquiry still shows its positions in detail (cascade does not hide them here)", async () => {
		renderPage({
			procurementInquiries: [makeProcurementInquiry("T-001", { isArchived: true })],
			items: [
				makeItem("item-1", {
					procurementInquiryId: "T-001",
					name: "Полотно ПВД",
					currentPrice: 100,
					annualQuantity: 50,
				}),
				makeItem("item-2", { procurementInquiryId: "T-001", name: "Скотч", currentPrice: 200, annualQuantity: 30 }),
			],
			slug: "T-001",
		});

		await screen.findByRole("heading", { name: "Запрос T-001" });
		fireEvent.click(screen.getByRole("tab", { name: "Информация" }));

		await waitFor(() => expect(screen.getByTestId("procurement-inquiry-tab-details")).toBeInTheDocument());
		expect(screen.getByTestId("procurement-inquiry-item-item-1")).toBeInTheDocument();
		expect(screen.getByTestId("procurement-inquiry-item-item-2")).toBeInTheDocument();
	});
});
