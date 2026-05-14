import { QueryClient } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useSearchParams } from "react-router";
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
import { _setMockDelay } from "@/data/mock-utils";
import { SEED_PROCUREMENT_INQUIRIES } from "@/data/seeds/procurement-inquiries";
import { ORMATEK_SUPPLIERS } from "@/data/seeds/suppliers-ormatek";
import { _setSupplierMockDelay } from "@/data/supplier-mock-data";
import type { SupplierSeed } from "@/data/supplier-types";
import { TestClientsProvider } from "@/data/test-clients-provider";

import type { ProcurementItem } from "@/data/types";
import { mockHostname } from "@/test-utils";

// Cherry-pick a compact, deterministic seed: 3 quote_received (rename one to ТД СОМ) + 7 others = 10 seeds.
// Auto-generated pipeline candidates (15, 1 pre-archived) are appended on load per item.
const TEST_SUPPLIERS: SupplierSeed[] = [
	{ ...ORMATEK_SUPPLIERS[9], companyName: "ТД СОМ" },
	ORMATEK_SUPPLIERS[10],
	ORMATEK_SUPPLIERS[25],
	ORMATEK_SUPPLIERS[0],
	ORMATEK_SUPPLIERS[1],
	ORMATEK_SUPPLIERS[2],
	ORMATEK_SUPPLIERS[3],
	ORMATEK_SUPPLIERS[4],
	ORMATEK_SUPPLIERS[5],
	ORMATEK_SUPPLIERS[6],
];

const SEED_KP_COUNT = TEST_SUPPLIERS.filter((s) => s.status === "quote_received").length;

import { ProcurementItemDrawer } from "./procurement-item-drawer";

const TEST_ITEM: ProcurementItem = {
	id: "item-1",
	name: "Полотно ПВД 2600 мм",
	status: "completed",
	annualQuantity: 180_000,
	currentPrice: 1776,
	bestPrice: null,
	averagePrice: null,
	procurementInquiryId: "T-001",
	currentSupplier: {
		companyName: "ПолимерПром",
		inn: "6164012345",
		paymentType: "prepayment",
		deferralDays: 0,
		pricePerUnit: 1776,
	},
};

let queryClient: QueryClient;

function UrlSpy() {
	const [params] = useSearchParams();
	return <div data-testid="url-spy">{params.toString()}</div>;
}

function renderDrawer(initialEntries: string[] = ["/positions?item=item-1"]) {
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: createInMemoryCompaniesClient(),
				items: createInMemoryItemsClient({ seed: [TEST_ITEM] }),
				suppliers: createInMemorySuppliersClient({ seedByItemId: { "item-1": TEST_SUPPLIERS } }),
				tasks: createInMemoryTasksClient({ seed: [] }),
				procurementInquiries: createInMemoryProcurementInquiriesClient({ seed: SEED_PROCUREMENT_INQUIRIES }),
				folders: createInMemoryFoldersClient(),
			}}
		>
			<TooltipProvider>
				<MemoryRouter initialEntries={initialEntries}>
					<ProcurementItemDrawer item={TEST_ITEM} />
					<UrlSpy />
				</MemoryRouter>
			</TooltipProvider>
		</TestClientsProvider>,
	);
}

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	mockHostname("acme.localhost");
	sessionStorage.setItem("auth-access-token", "test-token");
	_setSupplierMockDelay(0, 0);
	_setMockDelay(0, 0);
	vi.clearAllMocks();
});

afterEach(() => {
	localStorage.clear();
});

describe("ProcurementItemDrawer — open/close", () => {
	test("opens when ?item= param is present", () => {
		renderDrawer(["/positions?item=item-1"]);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Полотно ПВД 2600 мм")).toBeInTheDocument();
	});

	test("stays closed when ?item= param is absent", () => {
		renderDrawer(["/positions"]);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	test("close button removes ?item= and ?tab= from URL", async () => {
		const user = userEvent.setup();
		renderDrawer(["/positions?item=item-1&tab=details"]);
		await user.click(screen.getByRole("button", { name: "Close" }));
		const urlText = screen.getByTestId("url-spy").textContent ?? "";
		expect(urlText).not.toContain("item=");
		expect(urlText).not.toContain("tab=");
	});
});

describe("ProcurementItemDrawer — tabs", () => {
	test("renders three tabs with Поставщики as default (no Вопросы)", () => {
		renderDrawer();
		const tabs = screen.getAllByRole("tab");
		expect(tabs).toHaveLength(3);
		expect(tabs[0]).toHaveTextContent("Поставщики");
		expect(tabs[1]).toHaveTextContent("Предложения");
		expect(tabs[2]).toHaveTextContent("Информация");
		expect(screen.queryByRole("tab", { name: "Вопросы" })).not.toBeInTheDocument();
		expect(tabs[0]).toHaveAttribute("aria-selected", "true");
	});

	test("Поставщики tab omits &tab= (default)", async () => {
		const user = userEvent.setup();
		renderDrawer(["/positions?item=item-1&tab=details"]);
		await user.click(screen.getByRole("tab", { name: "Поставщики" }));
		expect(screen.getByTestId("url-spy")).toHaveTextContent("item=item-1");
		expect(screen.getByTestId("url-spy").textContent).not.toContain("tab=");
	});

	test("Предложения tab sets &tab=offers", async () => {
		const user = userEvent.setup();
		renderDrawer(["/positions?item=item-1"]);
		await user.click(screen.getByRole("tab", { name: "Предложения" }));
		expect(screen.getByTestId("url-spy")).toHaveTextContent("item=item-1&tab=offers");
	});

	test("Информация tab sets &tab=details", async () => {
		const user = userEvent.setup();
		renderDrawer(["/positions?item=item-1"]);
		await user.click(screen.getByRole("tab", { name: "Информация" }));
		expect(screen.getByTestId("url-spy")).toHaveTextContent("item=item-1&tab=details");
	});

	test("invalid tab param defaults to Поставщики", () => {
		renderDrawer(["/positions?item=item-1&tab=bogus"]);
		expect(screen.getByRole("tab", { name: "Поставщики" })).toHaveAttribute("aria-selected", "true");
	});

	test("renders panel content for each tab", async () => {
		const user = userEvent.setup();
		renderDrawer();
		expect(screen.getByTestId("tab-panel-suppliers")).toBeInTheDocument();

		await user.click(screen.getByRole("tab", { name: "Предложения" }));
		expect(screen.getByTestId("tab-panel-offers")).toBeInTheDocument();

		await user.click(screen.getByRole("tab", { name: "Информация" }));
		expect(screen.getByTestId("tab-panel-details")).toBeInTheDocument();
	});
});

describe("ProcurementItemDrawer — Поставщики (pipeline) tab", () => {
	test("renders pipeline columns (no status column)", async () => {
		renderDrawer(["/positions?item=item-1"]);
		await waitFor(() => {
			expect(screen.getByText("КОМПАНИЯ")).toBeInTheDocument();
		});
		expect(screen.getByText("ТИП")).toBeInTheDocument();
		expect(screen.getByText("РЕГИОН")).toBeInTheDocument();
		expect(screen.getByText("САЙТ")).toBeInTheDocument();
		expect(screen.getByText("ВЫРУЧКА")).toBeInTheDocument();
		expect(screen.getByText("ВОЗРАСТ")).toBeInTheDocument();
	});

	test("shows ИНН under company name", async () => {
		renderDrawer(["/positions?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByText(/ИНН:/).length).toBeGreaterThan(0);
		});
	});

	test("does NOT render «Отправить запросы» action (KP requests live at the inquiry level)", async () => {
		renderDrawer(["/positions?item=item-1"]);
		// Wait for the panel to render so the negative assertion is meaningful.
		await waitFor(() => {
			expect(screen.getByTestId("tab-panel-suppliers")).toBeInTheDocument();
		});
		expect(screen.queryByRole("button", { name: "Отправить запросы" })).not.toBeInTheDocument();
	});

	test("does NOT render per-row «Запросить КП» button (KP requests live at the inquiry level)", async () => {
		renderDrawer(["/positions?item=item-1"]);
		await waitFor(() => {
			// Status indicators replace the КП button on `new` rows.
			expect(screen.getAllByTestId(/^supplier-state-/).length).toBeGreaterThan(0);
		});
		expect(screen.queryAllByRole("button", { name: "Запросить КП" })).toHaveLength(0);
	});
});

describe("ProcurementItemDrawer — Предложения (offers) tab", () => {
	test("renders offer columns with «Получено» date under company name (no status column)", async () => {
		renderDrawer(["/positions?item=item-1&tab=offers"]);
		await waitFor(() => {
			expect(screen.getByText("КОМПАНИЯ")).toBeInTheDocument();
		});
		expect(screen.getByText("ТСО/ЕД.")).toBeInTheDocument();
		expect(screen.getByText("СТОИМОСТЬ")).toBeInTheDocument();
		expect(screen.queryByText("СТАТУС")).not.toBeInTheDocument();
		await waitFor(() => {
			expect(screen.getAllByText(/Получено:/).length).toBeGreaterThan(0);
		});
	});

	test("only shows quote_received suppliers (plus pinned current-supplier row)", async () => {
		renderDrawer(["/positions?item=item-1&tab=offers"]);
		await waitFor(() => {
			// Header + 1 pinned current-supplier + SEED_KP_COUNT КП rows.
			const rows = screen.getAllByRole("row");
			expect(rows.length).toBe(SEED_KP_COUNT + 2);
		});
	});

	test("clicking offer row opens supplier detail drawer with &supplier= in URL", async () => {
		const user = userEvent.setup();
		renderDrawer(["/positions?item=item-1&tab=offers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(SEED_KP_COUNT + 2);
		});
		// rows[0]=header, rows[1]=pinned (not clickable to open drawer), rows[2..]=КП data rows
		await user.click(screen.getAllByRole("row")[2]);
		await waitFor(() => {
			const url = screen.getByTestId("url-spy").textContent ?? "";
			expect(url).toContain("supplier=");
			expect(url).toContain("supplier_tab=offers");
		});
	});

	test("clicking a Поставщики row opens drawer with supplier_tab=info", async () => {
		const user = userEvent.setup();
		renderDrawer(["/positions?item=item-1"]);
		// Wait for the first data row to render, then click it. The exact first-page supplier
		// depends on the default alphabetical sort across the full candidate pool, so we don't
		// pin the test to a specific company name.
		await waitFor(() => {
			const panel = screen.getByTestId("tab-panel-suppliers");
			expect(within(panel).getAllByTestId(/^send-request-|^supplier-state-/).length).toBeGreaterThan(0);
		});
		const panel = screen.getByTestId("tab-panel-suppliers");
		const firstRow = within(panel).getAllByRole("row")[1];
		await user.click(firstRow);
		await waitFor(() => {
			const url = screen.getByTestId("url-spy").textContent ?? "";
			expect(url).toContain("supplier=");
			expect(url).toContain("supplier_tab=info");
		});
	});
});

describe("ProcurementItemDrawer — Информация (details) tab", () => {
	test("deep link shows read-only view", async () => {
		renderDrawer(["/positions?item=item-1&tab=details"]);
		await waitFor(() => {
			expect(screen.getByTestId("tab-panel-details")).toBeInTheDocument();
		});
	});
});

describe("ProcurementItemDrawer — supplier select dialog", () => {
	test("context menu «Выбрать текущего поставщика» opens confirmation dialog", async () => {
		const user = userEvent.setup();
		renderDrawer(["/positions?item=item-1&tab=offers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(SEED_KP_COUNT + 2);
		});
		// rows[0]=header, rows[1]=pinned, rows[2]=first data row
		fireEvent.contextMenu(screen.getAllByRole("row")[2]);
		const menuItem = await screen.findByText("Выбрать текущего поставщика");
		await user.click(menuItem);
		await waitFor(() => {
			expect(screen.getByRole("alertdialog")).toBeInTheDocument();
		});
		const dialog = screen.getByRole("alertdialog");
		expect(within(dialog).getByText(/Выбрать поставщика/i)).toBeInTheDocument();
	});
});
