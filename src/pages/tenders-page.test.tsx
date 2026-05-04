import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { createInMemoryFoldersClient } from "@/data/clients/folders-in-memory";
import { createInMemoryItemsClient } from "@/data/clients/items-in-memory";
import { createInMemoryTendersClient } from "@/data/clients/tenders-in-memory";
import { _resetMockDelay, _setMockDelay } from "@/data/mock-utils";
import { TestClientsProvider } from "@/data/test-clients-provider";
import type { Folder, ProcurementInquiry } from "@/data/types";
import { makeCompanyDetail } from "@/test-utils";
import { TendersPage } from "./tenders-page";

const FOLDERS: Folder[] = [
	{ id: "folder-packaging", name: "Упаковка", color: "blue" },
	{ id: "folder-fillings", name: "Наполнители", color: "green" },
];

const TENDERS: ProcurementInquiry[] = [
	{
		id: "T-001",
		name: "Тестовый запрос 1",
		companyId: "company-1",
		folderId: "folder-packaging",
		budget: 10_000_000,
		createdAt: "2026-04-01",
		deadline: "2026-05-15",
	},
	{
		id: "T-002",
		name: "Тестовый запрос 2",
		companyId: "company-1",
		folderId: "folder-fillings",
		budget: 5_000_000,
		createdAt: "2026-04-15",
		deadline: "2026-05-25",
	},
];

function renderPage(initialEntries: string[] = ["/inquiries"], tenders: ProcurementInquiry[] = TENDERS) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: createInMemoryCompaniesClient([makeCompanyDetail("company-1", { name: "Альфа", isMain: true })]),
				items: createInMemoryItemsClient({ seed: [] }),
				tenders: createInMemoryTendersClient({ seed: tenders }),
				folders: createInMemoryFoldersClient({ seed: FOLDERS }),
			}}
		>
			<TooltipProvider>
				<MemoryRouter initialEntries={initialEntries}>
					<Routes>
						<Route path="/inquiries" element={<TendersPage />} />
					</Routes>
				</MemoryRouter>
			</TooltipProvider>
		</TestClientsProvider>,
	);
}

beforeEach(() => {
	_setMockDelay(0, 0);
});

afterEach(() => {
	_resetMockDelay();
	vi.restoreAllMocks();
});

describe("TendersPage", () => {
	test("renders the «Запросы» heading", async () => {
		renderPage();
		expect(screen.getByRole("heading", { name: "Запросы" })).toBeInTheDocument();
	});

	test("renders all 6 column headers", async () => {
		renderPage();
		const headers = await screen.findAllByRole("columnheader");
		expect(headers).toHaveLength(6);
		const labels = headers.map((h) => h.textContent ?? "");
		expect(labels[0]).toBe("№");
		expect(labels[1]).toBe("НАЗВАНИЕ");
		expect(labels[2]).toBe("ВСЕГО ПОСТАВЩИКОВ");
		expect(labels[3]).toBe("ПОЛУЧЕНО КП");
		expect(labels[4]).toBe("ДАТА СОЗДАНИЯ");
		expect(labels[5]).toBe("ДЕДЛАЙН");
	});

	test("renders one row per seeded tender, sorted by createdAt desc", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByTestId("tender-row-T-001")).toBeInTheDocument();
		});
		const rows = screen.getAllByRole("row").filter((r) => r.getAttribute("data-testid")?.startsWith("tender-row-"));
		expect(rows.map((r) => r.getAttribute("data-testid"))).toEqual(["tender-row-T-002", "tender-row-T-001"]);
	});

	test("each row exposes row number, name, and category badge", async () => {
		renderPage();
		// Sorted by createdAt desc: T-002 is row #1, T-001 is row #2.
		const row = await screen.findByTestId("tender-row-T-001");
		expect(within(row).getByText("2")).toBeInTheDocument();
		expect(within(row).getByText("Тестовый запрос 1")).toBeInTheDocument();
		expect(within(row).getByText("Упаковка")).toBeInTheDocument();
	});

	test("does not render «Отклонение / переплата» filters", async () => {
		renderPage();
		await screen.findByTestId("tender-row-T-001");
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Фильтры" }));
		expect(screen.queryByText("Отклонение")).not.toBeInTheDocument();
		expect(screen.queryByText("С переплатой")).not.toBeInTheDocument();
		expect(screen.queryByText("С экономией")).not.toBeInTheDocument();
	});

	test("deadline filter exposes a date range and a Просрочены preset inside the Фильтры popover", async () => {
		renderPage();
		await screen.findByTestId("tender-row-T-001");
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Фильтры" }));
		expect(screen.getByLabelText("Дедлайн с")).toBeInTheDocument();
		expect(screen.getByLabelText("Дедлайн по")).toBeInTheDocument();
		expect(screen.getByTestId("deadline-filter-overdue")).toBeInTheDocument();
		expect(screen.queryByTestId("deadline-filter-soon")).not.toBeInTheDocument();
	});

	test("archive toggle button has aria-pressed and toggles folder=archive", async () => {
		renderPage();
		await screen.findByTestId("tender-row-T-001");

		const archive = screen.getByRole("button", { name: "Архив" });
		expect(archive).toHaveAttribute("aria-pressed", "false");

		const user = userEvent.setup();
		await user.click(archive);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Архив" })).toHaveAttribute("aria-pressed", "true");
		});
	});

	test("archive view shows only archived tenders; active view excludes them", async () => {
		const SEED: ProcurementInquiry[] = [
			...TENDERS,
			{
				id: "T-099",
				name: "Архивный запрос",
				companyId: "company-1",
				folderId: null,
				budget: 0,
				createdAt: "2026-04-20",
				deadline: "2026-05-10",
				isArchived: true,
			},
		];
		renderPage(["/inquiries"], SEED);
		await screen.findByTestId("tender-row-T-001");
		expect(screen.queryByTestId("tender-row-T-099")).not.toBeInTheDocument();

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Архив" }));

		await waitFor(() => {
			expect(screen.getByTestId("tender-row-T-099")).toBeInTheDocument();
		});
		expect(screen.queryByTestId("tender-row-T-001")).not.toBeInTheDocument();
		expect(screen.queryByTestId("tender-row-T-002")).not.toBeInTheDocument();
	});
});
