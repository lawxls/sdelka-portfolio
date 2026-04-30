import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createInMemoryFoldersClient } from "@/data/clients/folders-in-memory";
import { createInMemoryTendersClient } from "@/data/clients/tenders-in-memory";
import { _resetMockDelay, _setMockDelay } from "@/data/mock-utils";
import { TestClientsProvider } from "@/data/test-clients-provider";
import type { Folder, ProcurementInquiry } from "@/data/types";
import { TendersPage } from "./tenders-page";

const FOLDERS: Folder[] = [
	{ id: "folder-packaging", name: "Упаковка", color: "blue" },
	{ id: "folder-fillings", name: "Наполнители", color: "green" },
];

const TENDERS: ProcurementInquiry[] = [
	{
		id: "T-001",
		name: "Тестовый тендер 1",
		companyId: "company-1",
		folderId: "folder-packaging",
		budget: 10_000_000,
		createdAt: "2026-04-01",
		deadline: "2026-05-15",
	},
	{
		id: "T-002",
		name: "Тестовый тендер 2",
		companyId: "company-1",
		folderId: "folder-fillings",
		budget: 5_000_000,
		createdAt: "2026-04-15",
		deadline: "2026-05-25",
	},
];

function renderPage() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				tenders: createInMemoryTendersClient({ seed: TENDERS }),
				folders: createInMemoryFoldersClient({ seed: FOLDERS }),
			}}
		>
			<TooltipProvider>
				<MemoryRouter initialEntries={["/tenders"]}>
					<Routes>
						<Route path="/tenders" element={<TendersPage />} />
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
	test("renders the «Тендеры» heading", async () => {
		renderPage();
		expect(screen.getByRole("heading", { name: "Тендеры" })).toBeInTheDocument();
	});

	test("renders all 7 column headers", async () => {
		renderPage();
		const headers = await screen.findAllByRole("columnheader");
		expect(headers).toHaveLength(7);
		const labels = headers.map((h) => h.textContent ?? "");
		expect(labels[0]).toBe("№");
		expect(labels[1]).toBe("НАЗВАНИЕ");
		expect(labels[2]).toMatch(/БЮДЖЕТ/);
		expect(labels[3]).toMatch(/КОЛ-ВО ПОЗИЦИЙ/);
		expect(labels[4]).toMatch(/КОЛ-ВО КП/);
		expect(labels[5]).toBe("ДАТА СОЗДАНИЯ");
		expect(labels[6]).toBe("ДЕДЛАЙН");
	});

	test("renders one row per seeded tender, sorted by createdAt desc", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByTestId("tender-row-T-001")).toBeInTheDocument();
		});
		const rows = screen.getAllByRole("row").filter((r) => r.getAttribute("data-testid")?.startsWith("tender-row-"));
		expect(rows.map((r) => r.getAttribute("data-testid"))).toEqual(["tender-row-T-002", "tender-row-T-001"]);
	});

	test("each row exposes id, name, and category badge", async () => {
		renderPage();
		const row = await screen.findByTestId("tender-row-T-001");
		expect(within(row).getByText("T-001")).toBeInTheDocument();
		expect(within(row).getByText("Тестовый тендер 1")).toBeInTheDocument();
		expect(within(row).getByText("Упаковка")).toBeInTheDocument();
	});
});
