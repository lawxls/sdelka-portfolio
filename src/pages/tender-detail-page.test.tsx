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
import { createInMemorySuppliersClient } from "@/data/clients/suppliers-in-memory";
import { createInMemoryTasksClient } from "@/data/clients/tasks-in-memory";
import { createInMemoryTendersClient } from "@/data/clients/tenders-in-memory";
import { _resetMockDelay, _setMockDelay } from "@/data/mock-utils";
import { _setSupplierMockDelay } from "@/data/supplier-mock-data";
import { TestClientsProvider } from "@/data/test-clients-provider";
import type { Folder, ProcurementInquiry, ProcurementItem } from "@/data/types";
import { makeItem, makeTask } from "@/test-utils";
import { TenderDetailPage } from "./tender-detail-page";

const FOLDERS: Folder[] = [{ id: "folder-packaging", name: "Упаковка", color: "blue" }];

function makeTender(id: string, overrides: Partial<ProcurementInquiry> = {}): ProcurementInquiry {
	return {
		id,
		name: `Тендер ${id}`,
		companyId: "company-1",
		folderId: "folder-packaging",
		budget: 1_000_000,
		createdAt: "2026-04-01",
		deadline: "2026-05-15",
		...overrides,
	};
}

interface RenderOpts {
	tenders?: ProcurementInquiry[];
	items?: ProcurementItem[];
	slug: string;
}

function renderPage({ tenders = [], items = [], slug }: RenderOpts) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: createInMemoryCompaniesClient(),
				items: createInMemoryItemsClient({ seed: items }),
				suppliers: createInMemorySuppliersClient({ seedByItemId: {} }),
				tasks: createInMemoryTasksClient({ seed: [] }),
				tenders: createInMemoryTendersClient({ seed: tenders }),
				folders: createInMemoryFoldersClient({ seed: FOLDERS }),
			}}
		>
			<TooltipProvider>
				<MemoryRouter initialEntries={[`/tenders/${slug}`]}>
					<Routes>
						<Route path="/tenders/:slug" element={<TenderDetailPage />} />
						<Route path="/tenders" element={<div data-testid="tenders-list">Тендеры</div>} />
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

describe("TenderDetailPage", () => {
	test("renders tender name in toolbar and all 4 tabs", async () => {
		renderPage({
			tenders: [makeTender("T-001", { name: "Упаковочные материалы Q2" })],
			items: [makeItem("item-1", { tenderId: "T-001", name: "Полотно ПВД" })],
			slug: "T-001",
		});

		await screen.findByRole("heading", { name: "Упаковочные материалы Q2" });
		expect(screen.getByText("T-001")).toBeInTheDocument();

		const tabs = screen.getAllByRole("tab");
		expect(tabs.map((t) => t.getAttribute("aria-label"))).toEqual([
			"Поставщики",
			"Предложения",
			"Задачи",
			"Информация",
		]);
	});

	test("default tab is Поставщики; switching to Информация renders tender meta + items", async () => {
		renderPage({
			tenders: [makeTender("T-001", { budget: 350_000_000 })],
			items: [
				makeItem("item-1", { tenderId: "T-001", name: "Позиция 1", currentPrice: 100, annualQuantity: 50 }),
				makeItem("item-2", { tenderId: "T-001", name: "Позиция 2", currentPrice: 200, annualQuantity: 30 }),
			],
			slug: "T-001",
		});

		await screen.findByRole("heading", { name: "Тендер T-001" });
		expect(screen.getByTestId("tender-tab-suppliers")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("tab", { name: "Информация" }));

		await waitFor(() => expect(screen.getByTestId("tender-tab-details")).toBeInTheDocument());
		expect(screen.getByTestId("tender-item-item-1")).toBeInTheDocument();
		expect(screen.getByTestId("tender-item-item-2")).toBeInTheDocument();
	});

	test("Задачи tab renders tasks for the tender; clicking a row opens the task drawer", async () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
		});
		const taskForT1 = makeTask("task-T1-1", {
			name: "Согласовать спецификацию",
			tender: { id: "T-001", name: "Упаковочные материалы Q2", companyId: "company-1" },
		});
		const taskForOther = makeTask("task-other", {
			name: "Не наша задача",
			tender: { id: "T-002", name: "Другой тендер", companyId: "company-1" },
		});
		render(
			<TestClientsProvider
				queryClient={queryClient}
				clients={{
					companies: createInMemoryCompaniesClient(),
					items: createInMemoryItemsClient({ seed: [makeItem("item-1", { tenderId: "T-001" })] }),
					suppliers: createInMemorySuppliersClient({ seedByItemId: {} }),
					tasks: createInMemoryTasksClient({ seed: [taskForT1, taskForOther] }),
					tenders: createInMemoryTendersClient({ seed: [makeTender("T-001")] }),
					folders: createInMemoryFoldersClient({ seed: FOLDERS }),
				}}
			>
				<TooltipProvider>
					<MemoryRouter initialEntries={["/tenders/T-001"]}>
						<Routes>
							<Route path="/tenders/:slug" element={<TenderDetailPage />} />
							<Route path="/tenders" element={<div data-testid="tenders-list">Тендеры</div>} />
						</Routes>
					</MemoryRouter>
				</TooltipProvider>
			</TestClientsProvider>,
		);

		await screen.findByRole("heading", { name: "Тендер T-001" });
		fireEvent.click(screen.getByRole("tab", { name: "Задачи" }));

		await waitFor(() => expect(screen.getByTestId("tender-tab-tasks")).toBeInTheDocument());
		await waitFor(() => expect(screen.getByText("Согласовать спецификацию")).toBeInTheDocument());
		// Tasks belonging to a different tender stay out of this tab.
		expect(screen.queryByText("Не наша задача")).not.toBeInTheDocument();

		fireEvent.click(screen.getByTestId("tender-task-row-task-T1-1"));
		await waitFor(() => {
			expect(
				screen.getByText("Согласовать спецификацию", { selector: "[data-slot='sheet-title']" }),
			).toBeInTheDocument();
		});
	});

	test("single-item tender shows ТСО / ед. headline = item.currentPrice", async () => {
		renderPage({
			tenders: [makeTender("T-001")],
			items: [makeItem("item-1", { tenderId: "T-001", currentPrice: 1776, annualQuantity: 100 })],
			slug: "T-001",
		});

		const headline = await screen.findByTestId("tender-tco-headline");
		expect(headline).toHaveTextContent("ТСО / ед.");
		expect(headline).toHaveTextContent(/1\s?776/);
	});

	test("multi-item tender hides ТСО / ед. and shows total ТСО (sum of annualQuantity × currentPrice)", async () => {
		renderPage({
			tenders: [makeTender("T-001")],
			items: [
				makeItem("item-1", { tenderId: "T-001", currentPrice: 100, annualQuantity: 50 }), // 5 000
				makeItem("item-2", { tenderId: "T-001", currentPrice: 200, annualQuantity: 30 }), // 6 000
			],
			slug: "T-001",
		});

		const headline = await screen.findByTestId("tender-tco-headline");
		expect(headline).toHaveTextContent("Итого ТСО");
		expect(headline).not.toHaveTextContent("ТСО / ед.");
		// 5000 + 6000 = 11 000 ₽
		expect(headline).toHaveTextContent(/11\s?000/);
	});

	test("renders «Тендер не найден» on unknown slug", async () => {
		renderPage({ tenders: [makeTender("T-001")], slug: "T-999" });

		await waitFor(() => expect(screen.getByTestId("tender-not-found")).toBeInTheDocument());
		expect(screen.getByText("Тендер не найден")).toBeInTheDocument();
	});

	test("archived tender still shows its positions in detail (cascade does not hide them here)", async () => {
		renderPage({
			tenders: [makeTender("T-001", { isArchived: true })],
			items: [
				makeItem("item-1", { tenderId: "T-001", name: "Полотно ПВД", currentPrice: 100, annualQuantity: 50 }),
				makeItem("item-2", { tenderId: "T-001", name: "Скотч", currentPrice: 200, annualQuantity: 30 }),
			],
			slug: "T-001",
		});

		await screen.findByRole("heading", { name: "Тендер T-001" });
		fireEvent.click(screen.getByRole("tab", { name: "Информация" }));

		await waitFor(() => expect(screen.getByTestId("tender-tab-details")).toBeInTheDocument());
		expect(screen.getByTestId("tender-item-item-1")).toBeInTheDocument();
		expect(screen.getByTestId("tender-item-item-2")).toBeInTheDocument();

		const headline = screen.getByTestId("tender-tco-headline");
		expect(headline).toHaveTextContent("Итого ТСО");
		expect(headline).toHaveTextContent(/11\s?000/);
	});
});
