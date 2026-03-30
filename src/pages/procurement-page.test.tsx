import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setTokens } from "@/data/auth";
import type { CompanySummary, Folder, ProcurementItem } from "@/data/types";
import { server } from "@/test-msw";
import { makeCompany, makeItem } from "@/test-utils";

const MOCK_FOLDERS: Folder[] = [
	{ id: "f1", name: "Металлопрокат", color: "blue" },
	{ id: "f2", name: "Стройматериалы", color: "green" },
];

const MOCK_STATS = [
	{ folderId: "f1", itemCount: 10 },
	{ folderId: "f2", itemCount: 5 },
	{ folderId: null, itemCount: 20 },
];

const MULTI_COMPANIES: CompanySummary[] = [
	makeCompany("c1", { name: "Альфа", isMain: true, procurementItemCount: 15 }),
	makeCompany("c2", { name: "Бета", procurementItemCount: 8 }),
	makeCompany("c3", { name: "Гамма", procurementItemCount: 3 }),
];

const SINGLE_COMPANY: CompanySummary[] = [makeCompany("c1", { name: "Альфа", isMain: true, procurementItemCount: 15 })];

const ITEMS_C1: ProcurementItem[] = [
	makeItem("i1", { name: "Труба стальная", companyId: "c1", folderId: "f1" }),
	makeItem("i2", { name: "Швеллер", companyId: "c1", folderId: null }),
];

const ITEMS_C2: ProcurementItem[] = [makeItem("i3", { name: "Кирпич М150", companyId: "c2", folderId: null })];

const ALL_ITEMS = [...ITEMS_C1, ...ITEMS_C2];

let queryClient: QueryClient;
let companies: CompanySummary[];

function setupHandlers(companyList: CompanySummary[]) {
	companies = companyList;
	server.use(
		http.get("/api/v1/companies/", () => HttpResponse.json({ companies, nextCursor: null })),
		http.get("/api/v1/company/items/", ({ request }) => {
			const url = new URL(request.url);
			const company = url.searchParams.get("company");
			let items = ALL_ITEMS;
			if (company) items = items.filter((i) => i.companyId === company);
			return HttpResponse.json({ items, nextCursor: null });
		}),
		http.get("/api/v1/company/items/totals", () =>
			HttpResponse.json({ itemCount: 10, totalOverpayment: "0", totalSavings: "0", totalDeviation: "0" }),
		),
		http.get("/api/v1/company/folders/", () => HttpResponse.json({ folders: MOCK_FOLDERS })),
		http.get("/api/v1/company/folders/stats", () => HttpResponse.json({ stats: MOCK_STATS, archiveCount: 2 })),
	);
}

function renderPage(initialEntries?: string[]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries ?? ["/procurement"]}>
				<TooltipProvider>
					{/* Lazy import to avoid circular deps — inline dynamic import */}
					<ProcurementPageWrapper />
				</TooltipProvider>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

// Import the actual component
import { ProcurementPage } from "./procurement-page";

function ProcurementPageWrapper() {
	return <ProcurementPage />;
}

async function waitForSidebar() {
	await waitFor(() => {
		expect(screen.queryByTestId("sidebar")).toBeInTheDocument();
	});
}

beforeEach(() => {
	localStorage.clear();
	setTokens("test-access", "test-refresh");
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	// Suppress "Not implemented: HTMLFormElement.prototype.requestSubmit" from jsdom
	vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ProcurementPage — single-company tenant", () => {
	test("renders folder sidebar without company navigator", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage();
		await waitForSidebar();

		const sidebar = screen.getByTestId("sidebar");

		// Wait for folders to load in sidebar
		await waitFor(() => {
			expect(within(sidebar).getByText("Металлопрокат")).toBeInTheDocument();
		});

		// Should show folder navigation items (standard sidebar)
		expect(within(sidebar).getByText("Все закупки")).toBeInTheDocument();
		expect(within(sidebar).getByText("Без категории")).toBeInTheDocument();
		expect(within(sidebar).getByText("Архив")).toBeInTheDocument();

		// Should NOT show company navigator
		expect(screen.queryByTestId("company-navigator")).not.toBeInTheDocument();
	});
});

describe("ProcurementPage — multi-company, no selection", () => {
	test("renders company navigator in sidebar", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage();

		// Wait for companies to load and company navigator to appear
		await waitFor(() => {
			expect(screen.getByTestId("company-navigator")).toBeInTheDocument();
		});

		const nav = screen.getByTestId("company-navigator");
		expect(within(nav).getByText("Все закупки")).toBeInTheDocument();
		expect(within(nav).getByText("Альфа")).toBeInTheDocument();
		expect(within(nav).getByText("Бета")).toBeInTheDocument();
		expect(within(nav).getByText("Гамма")).toBeInTheDocument();

		// Should NOT show folder items in sidebar
		const sidebar = screen.getByTestId("sidebar");
		expect(within(sidebar).queryByText("Без категории")).not.toBeInTheDocument();
		expect(within(sidebar).queryByText("Архив")).not.toBeInTheDocument();
	});

	test("company rows show procurement counts", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage();

		await waitFor(() => {
			expect(screen.getByTestId("company-navigator")).toBeInTheDocument();
		});

		const nav = screen.getByTestId("company-navigator");
		expect(within(nav).getByText("26")).toBeInTheDocument(); // total: 15+8+3
		expect(within(nav).getByText("15")).toBeInTheDocument();
		expect(within(nav).getByText("8")).toBeInTheDocument();
		expect(within(nav).getByText("3")).toBeInTheDocument();
	});

	test("name column shows company badge instead of folder badge", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage();

		// Wait for items to load
		await waitFor(() => {
			expect(screen.getByText("Труба стальная")).toBeInTheDocument();
		});
		expect(screen.getByTestId("company-badge-i1")).toBeInTheDocument();
		// Should NOT have folder badges in all-companies mode
		expect(screen.queryByTestId("folder-badge-i1")).not.toBeInTheDocument();
	});
});

describe("ProcurementPage — multi-company, company selected", () => {
	async function selectCompanyFromNavigator(companyName: string) {
		await waitFor(() => {
			expect(screen.getByTestId("company-navigator")).toBeInTheDocument();
		});
		const nav = screen.getByTestId("company-navigator");
		const user = userEvent.setup();
		await user.click(within(nav).getByText(companyName));
		return user;
	}

	test("selecting a company shows folder sidebar with back button", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage();

		await selectCompanyFromNavigator("Альфа");

		// Should now show folder sidebar with back affordance
		await waitFor(() => {
			expect(screen.getByTestId("company-back-button")).toBeInTheDocument();
		});
		const sidebar = screen.getByTestId("sidebar");
		expect(within(sidebar).getByText("Без категории")).toBeInTheDocument();
		expect(within(sidebar).getByText("Архив")).toBeInTheDocument();

		// Should NOT show other companies in sidebar
		expect(within(sidebar).queryByText("Бета")).not.toBeInTheDocument();
	});

	test("selecting a company scopes item list", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage();

		await selectCompanyFromNavigator("Альфа");

		// Should only show items from company c1
		await waitFor(() => {
			expect(screen.getByText("Труба стальная")).toBeInTheDocument();
		});
		expect(screen.getByText("Швеллер")).toBeInTheDocument();
		expect(screen.queryByText("Кирпич М150")).not.toBeInTheDocument();
	});

	test("name column shows folder badge in selected-company mode", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage();

		await selectCompanyFromNavigator("Альфа");

		// Items with folders should show folder badges now
		await waitFor(() => {
			expect(screen.getByTestId("folder-badge-i1")).toBeInTheDocument();
		});
		// Should NOT have company badges
		expect(screen.queryByTestId("company-badge-i1")).not.toBeInTheDocument();
	});

	test("back button returns to all-companies mode", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage();

		const user = await selectCompanyFromNavigator("Альфа");
		await waitFor(() => {
			expect(screen.getByTestId("company-back-button")).toBeInTheDocument();
		});

		await user.click(screen.getByTestId("company-back-button"));

		await waitFor(() => {
			expect(screen.getByTestId("company-navigator")).toBeInTheDocument();
		});
		const nav = screen.getByTestId("company-navigator");
		expect(within(nav).getByText("Бета")).toBeInTheDocument();
	});

	test("changing company clears folder param", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage(["/procurement?company=c1&folder=f1"]);

		// Wait for sidebar with back button (company is pre-selected)
		await waitFor(() => {
			expect(screen.getByTestId("company-back-button")).toBeInTheDocument();
		});

		const user = userEvent.setup();

		// Go back to all-companies
		await user.click(screen.getByTestId("company-back-button"));

		await waitFor(() => {
			expect(screen.getByTestId("company-navigator")).toBeInTheDocument();
		});

		// Select a different company
		const nav = screen.getByTestId("company-navigator");
		await user.click(within(nav).getByText("Бета"));

		// Folder should be cleared — folder sidebar shows without active folder
		await waitFor(() => {
			expect(screen.getByTestId("company-back-button")).toBeInTheDocument();
		});
		const sidebar = screen.getByTestId("sidebar");
		expect(within(sidebar).getByText("Без категории")).toBeInTheDocument();
	});
});

describe("ProcurementPage — URL state", () => {
	test("company URL param opens in selected-company mode", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage(["/procurement?company=c1"]);

		// Should be in folder navigation mode for c1 (company pre-selected via URL)
		await waitFor(() => {
			expect(screen.getByTestId("company-back-button")).toBeInTheDocument();
		});
		expect(screen.getByText("Без категории")).toBeInTheDocument();
	});
});
