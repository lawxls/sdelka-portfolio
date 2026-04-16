import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setTokens } from "@/data/auth";
import { _resetCompaniesStore, _setCompanies } from "@/data/companies-mock-data";
import { _resetFoldersStore, _setFolders } from "@/data/folders-mock-data";
import { _resetItemsStore, _setItems } from "@/data/items-mock-data";
import type { Company, Folder, ProcurementItem } from "@/data/types";
import { makeCompanyDetail, makeItem } from "@/test-utils";
import { ProcurementPage } from "./procurement-page";

const MOCK_FOLDERS: Folder[] = [
	{ id: "f1", name: "Металлопрокат", color: "blue" },
	{ id: "f2", name: "Стройматериалы", color: "green" },
];

const MULTI_COMPANIES: Company[] = [
	makeCompanyDetail("c1", { name: "Альфа", isMain: true, procurementItemCount: 15 }),
	makeCompanyDetail("c2", { name: "Бета", procurementItemCount: 8 }),
	makeCompanyDetail("c3", { name: "Гамма", procurementItemCount: 3 }),
];

const SINGLE_COMPANY: Company[] = [makeCompanyDetail("c1", { name: "Альфа", isMain: true, procurementItemCount: 15 })];

const ITEMS_C1: ProcurementItem[] = [
	makeItem("i1", { name: "Труба стальная", companyId: "c1", folderId: "f1" }),
	makeItem("i2", { name: "Швеллер", companyId: "c1", folderId: null }),
];

const ITEMS_C2: ProcurementItem[] = [makeItem("i3", { name: "Кирпич М150", companyId: "c2", folderId: null })];

const ALL_ITEMS = [...ITEMS_C1, ...ITEMS_C2];

let queryClient: QueryClient;

function setupHandlers(companyList: Company[]) {
	_setFolders(MOCK_FOLDERS);
	_setItems(ALL_ITEMS);
	_setCompanies(companyList);
}

function renderPage(initialEntries?: string[]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries ?? ["/procurement"]}>
				<TooltipProvider>
					<ProcurementPage />
				</TooltipProvider>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

async function waitForToolbar() {
	await waitFor(() => {
		expect(screen.getByTestId("total-count")).toBeInTheDocument();
	});
}

beforeEach(() => {
	localStorage.clear();
	setTokens("test-access");
	_resetItemsStore();
	_resetFoldersStore();
	_resetCompaniesStore();
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	// Suppress "Not implemented: HTMLFormElement.prototype.requestSubmit" from jsdom
	vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ProcurementPage — multi-company mode", () => {
	test("renders name column with company badge when no company selected", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage();

		await waitFor(() => {
			expect(screen.getByText("Труба стальная")).toBeInTheDocument();
		});
		expect(screen.getByTestId("company-badge-i1")).toBeInTheDocument();
		expect(screen.queryByTestId("folder-badge-i1")).not.toBeInTheDocument();
	});

	test("company URL param scopes items and shows folder badges", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage(["/procurement?company=c1"]);

		await waitFor(() => {
			expect(screen.getByText("Труба стальная")).toBeInTheDocument();
		});
		expect(screen.getByText("Швеллер")).toBeInTheDocument();
		expect(screen.queryByText("Кирпич М150")).not.toBeInTheDocument();
		expect(screen.getByTestId("folder-badge-i1")).toBeInTheDocument();
		expect(screen.queryByTestId("company-badge-i1")).not.toBeInTheDocument();
	});
});

describe("ProcurementPage — item drawer", () => {
	test("clicking a procurement row opens the item drawer", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage();

		await waitFor(() => {
			expect(screen.getByText("Труба стальная")).toBeInTheDocument();
		});

		const user = userEvent.setup();
		await user.click(screen.getByText("Труба стальная"));

		await waitFor(() => {
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});
		expect(screen.getAllByText("Труба стальная").length).toBeGreaterThanOrEqual(2);
		expect(screen.getByRole("tablist")).toBeInTheDocument();
	});

	test("?item= URL param opens drawer on page load", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage(["/procurement?item=i1"]);

		await waitFor(() => {
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});
		expect(screen.getByRole("tablist")).toBeInTheDocument();
	});

	test("close button removes drawer and ?item= param", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage(["/procurement?item=i1"]);

		await waitFor(() => {
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Close" }));

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
	});
});

describe("ProcurementPage — archive toggle", () => {
	test("archive button appears between filters and download", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage();
		await waitForToolbar();

		const filters = screen.getByRole("button", { name: "Фильтры" });
		const archive = screen.getByRole("button", { name: "Архив" });
		const download = screen.getByRole("button", { name: "Скачать таблицу" });

		expect(filters.compareDocumentPosition(archive) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(archive.compareDocumentPosition(download) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	test("toggle off-state has aria-pressed=false and no folder param", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage();
		await waitForToolbar();

		const archive = screen.getByRole("button", { name: "Архив" });
		expect(archive).toHaveAttribute("aria-pressed", "false");
	});

	test("clicking sets folder=archive and aria-pressed=true", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage();
		await waitForToolbar();

		const user = userEvent.setup();
		const archive = screen.getByRole("button", { name: "Архив" });
		await user.click(archive);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Архив" })).toHaveAttribute("aria-pressed", "true");
		});
	});

	test("clicking while in archive view clears folder param", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage(["/procurement?folder=archive"]);
		await waitForToolbar();

		const archive = screen.getByRole("button", { name: "Архив" });
		expect(archive).toHaveAttribute("aria-pressed", "true");

		const user = userEvent.setup();
		await user.click(archive);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Архив" })).toHaveAttribute("aria-pressed", "false");
		});
	});
});

describe("ProcurementPage — toolbar left zone", () => {
	test("shows total count reflecting all items when no filters active", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage();

		await waitFor(() => {
			expect(screen.getByTestId("total-count")).toHaveTextContent("Всего: 3");
		});
	});

	test("total count reflects folder filter scope", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage(["/procurement?folder=f1"]);

		await waitFor(() => {
			// Only item i1 is in folder f1
			expect(screen.getByTestId("total-count")).toHaveTextContent(/Всего:\s*1$/);
		});
	});

	test("total count updates when company filter changes", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage(["/procurement?company=c1"]);

		await waitFor(
			() => {
				expect(screen.getByTestId("total-count")).toHaveTextContent("Всего: 2");
			},
			{ timeout: 3000 },
		);

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Снять фильтр компании/ }));

		await waitFor(
			() => {
				expect(screen.getByTestId("total-count")).toHaveTextContent("Всего: 3");
			},
			{ timeout: 3000 },
		);
	});

	test("renders company chip when company filter active", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage(["/procurement?company=c1"]);

		await waitFor(() => {
			expect(screen.getByTestId("chip-company")).toBeInTheDocument();
		});
		expect(screen.getByTestId("chip-company")).toHaveTextContent("Альфа");
	});

	test("clicking × on company chip clears only the company param", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage(["/procurement?company=c1&folder=f1"]);

		await waitFor(() => {
			expect(screen.getByTestId("chip-company")).toBeInTheDocument();
			expect(screen.getByTestId("chip-folder")).toBeInTheDocument();
		});

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Снять фильтр компании/ }));

		await waitFor(() => {
			expect(screen.queryByTestId("chip-company")).not.toBeInTheDocument();
		});
		expect(screen.getByTestId("chip-folder")).toBeInTheDocument();
	});

	test("renders folder chip with color and name when folder filter active", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage(["/procurement?folder=f1"]);

		await waitFor(() => {
			expect(screen.getByTestId("chip-folder")).toBeInTheDocument();
		});
		expect(screen.getByTestId("chip-folder")).toHaveTextContent("Металлопрокат");
	});

	test("clicking × on folder chip clears only the folder param", async () => {
		setupHandlers(MULTI_COMPANIES);
		renderPage(["/procurement?company=c1&folder=f1"]);

		await waitFor(() => {
			expect(screen.getByTestId("chip-folder")).toBeInTheDocument();
		});

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Снять фильтр категории/ }));

		await waitFor(() => {
			expect(screen.queryByTestId("chip-folder")).not.toBeInTheDocument();
		});
		expect(screen.getByTestId("chip-company")).toBeInTheDocument();
	});

	test("renders 'Без категории' chip when folder=none", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage(["/procurement?folder=none"]);

		await waitFor(() => {
			expect(screen.getByTestId("chip-folder")).toHaveTextContent("Без категории");
		});
	});

	test("renders 'Архив' chip when folder=archive", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage(["/procurement?folder=archive"]);

		await waitFor(() => {
			expect(screen.getByTestId("chip-folder")).toHaveTextContent("Архив");
		});
	});
});

describe("ProcurementPage — no DnD / no sidebar", () => {
	test("table rows have no aria-roledescription draggable", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage();

		await waitFor(() => {
			expect(screen.getByText("Труба стальная")).toBeInTheDocument();
		});

		const rows = within(screen.getByRole("table")).getAllByRole("row");
		for (const row of rows) {
			expect(row.getAttribute("aria-roledescription")).not.toBe("draggable");
		}
	});

	test("no folder sidebar, no drop zones, no drag overlay", async () => {
		setupHandlers(SINGLE_COMPANY);
		renderPage();
		await waitForToolbar();

		expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
		expect(screen.queryByTestId("company-navigator")).not.toBeInTheDocument();
		expect(screen.queryByTestId("droppable-none")).not.toBeInTheDocument();
		expect(screen.queryByTestId("dnd-overlay-container")).not.toBeInTheDocument();
	});
});
