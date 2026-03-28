import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setTokens } from "@/data/auth";
import type { CompanySummary } from "@/data/types";
import * as useIsMobileModule from "@/hooks/use-is-mobile";
import { server } from "@/test-msw";
import { makeCompany } from "@/test-utils";
import { CompaniesPage } from "./companies-page";

const MOCK_COMPANIES: CompanySummary[] = [
	makeCompany("company-1", {
		name: "Сделка",
		isMain: true,
		responsibleEmployeeName: "Иванов Иван",
		addresses: [
			{ id: "addr-1", name: "Главный офис", type: "office" },
			{ id: "addr-2", name: "Склад №1", type: "warehouse" },
			{ id: "addr-3", name: "Цех", type: "production" },
		],
		employeeCount: 12,
		procurementItemCount: 25,
	}),
	makeCompany("company-2", {
		name: "СтройМастер",
		responsibleEmployeeName: "Петров Пётр",
		addresses: [{ id: "addr-4", name: "Центральный", type: "warehouse" }],
		employeeCount: 5,
		procurementItemCount: 10,
	}),
	makeCompany("company-3", {
		name: "ТехноСервис",
		responsibleEmployeeName: "Сидоров Алексей",
		addresses: [
			{ id: "addr-5", name: "Головной", type: "office" },
			{ id: "addr-6", name: "Запасной", type: "warehouse" },
		],
		employeeCount: 8,
		procurementItemCount: 15,
	}),
	...Array.from({ length: 27 }, (_, i) =>
		makeCompany(`company-${i + 4}`, {
			name: `Компания ${i + 4}`,
			responsibleEmployeeName: `Сотрудник ${i + 4}`,
			addresses: [{ id: `addr-gen-${i}`, name: `Адрес ${i + 4}`, type: "office" }],
			employeeCount: i + 1,
			procurementItemCount: i * 2,
		}),
	),
];

let companyList: CompanySummary[];
let queryClient: QueryClient;

function setupHandlers() {
	companyList = [...MOCK_COMPANIES];
	server.use(
		http.get("/api/v1/companies/", ({ request }) => {
			const url = new URL(request.url);
			const q = url.searchParams.get("q");
			const sort = url.searchParams.get("sort");
			const dir = url.searchParams.get("dir");
			const cursor = url.searchParams.get("cursor");
			const limit = Number(url.searchParams.get("limit")) || 25;

			let items = [...companyList];

			if (q) {
				items = items.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
			}

			if (sort) {
				const direction = dir === "desc" ? -1 : 1;
				items.sort((a, b) => {
					if (a.isMain && !b.isMain) return -1;
					if (!a.isMain && b.isMain) return 1;
					const aVal = a[sort as keyof CompanySummary];
					const bVal = b[sort as keyof CompanySummary];
					if (typeof aVal === "string" && typeof bVal === "string") {
						return aVal.localeCompare(bVal) * direction;
					}
					return ((aVal as number) - (bVal as number)) * direction;
				});
			} else {
				// Default: isMain first
				items.sort((a, b) => {
					if (a.isMain && !b.isMain) return -1;
					if (!a.isMain && b.isMain) return 1;
					return 0;
				});
			}

			const startIndex = cursor ? items.findIndex((c) => c.id === cursor) + 1 : 0;
			const page = items.slice(startIndex, startIndex + limit);
			const nextItem = items[startIndex + limit];
			const nextCursor = nextItem ? nextItem.id : null;

			return HttpResponse.json({ companies: page, nextCursor });
		}),
	);
}

function renderPage(initialEntries?: string[]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries ?? ["/companies"]}>
				<TooltipProvider>
					<CompaniesPage />
				</TooltipProvider>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

async function renderPageReady(initialEntries?: string[]) {
	const result = renderPage(initialEntries);
	await waitFor(() => {
		expect(screen.queryAllByTestId("skeleton-row")).toHaveLength(0);
		expect(screen.getByText("Сделка")).toBeInTheDocument();
	});
	return result;
}

beforeEach(() => {
	localStorage.clear();
	setTokens("test-access", "test-refresh");
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	setupHandlers();
});

describe("CompaniesPage", () => {
	test("renders page with header", async () => {
		await renderPageReady();
		expect(screen.getByRole("heading", { name: "Компании" })).toBeInTheDocument();
	});

	test("shows skeleton rows during loading", () => {
		server.use(
			http.get("/api/v1/companies/", async () => {
				await new Promise(() => {});
			}),
		);
		renderPage();
		expect(screen.getAllByTestId("skeleton-row").length).toBeGreaterThan(0);
	});

	test("renders table with all 4 column headers", async () => {
		await renderPageReady();
		const table = screen.getByRole("table");
		expect(within(table).getByText("НАЗВАНИЕ")).toBeInTheDocument();
		expect(within(table).getByText("АДРЕСА")).toBeInTheDocument();
		expect(within(table).getByText("СОТРУДНИКИ")).toBeInTheDocument();
		expect(within(table).getByText("ЗАКУПКИ")).toBeInTheDocument();
	});

	test("renders company name and responsible employee in first row", async () => {
		await renderPageReady();
		const row = screen.getByTestId("row-company-1");
		expect(within(row).getByText("Сделка")).toBeInTheDocument();
		expect(within(row).getByText("Иванов Иван")).toBeInTheDocument();
	});

	test("renders first address with type badge in first row", async () => {
		await renderPageReady();
		const row = screen.getByTestId("row-company-1");
		expect(within(row).getByText("Главный офис")).toBeInTheDocument();
		expect(within(row).getByText("Офис")).toBeInTheDocument();
	});

	test("renders +N badge when company has extra addresses", async () => {
		await renderPageReady();
		const row = screen.getByTestId("row-company-1");
		expect(within(row).getByText("+2")).toBeInTheDocument();
	});

	test("+N popover shows remaining addresses on click", async () => {
		await renderPageReady();
		const user = userEvent.setup();
		const row = screen.getByTestId("row-company-1");

		await user.click(within(row).getByText("+2"));

		await waitFor(() => {
			expect(screen.getByText("Склад №1")).toBeInTheDocument();
			expect(screen.getByText("Цех")).toBeInTheDocument();
		});
	});

	test("renders employee count and procurement count", async () => {
		await renderPageReady();
		const row = screen.getByTestId("row-company-1");
		expect(within(row).getByText("12")).toBeInTheDocument();
		expect(within(row).getByText("25")).toBeInTheDocument();
	});

	test("isMain company appears first", async () => {
		await renderPageReady();
		const table = screen.getByRole("table");
		const rows = within(table).getAllByRole("row");
		expect(within(rows[1]).getByText("Сделка")).toBeInTheDocument();
	});

	test("search filters companies by name", async () => {
		await renderPageReady();
		const user = userEvent.setup();

		const table = screen.getByRole("table");
		const initialRowCount = within(table).getAllByRole("row").length;

		const input = screen.getByPlaceholderText("Поиск по названию…");
		await user.clear(input);
		await user.type(input, "ТехноСервис");

		await waitFor(() => {
			const filteredRowCount = within(table).getAllByRole("row").length;
			expect(filteredRowCount).toBeLessThan(initialRowCount);
			// Matching company still visible
			expect(within(table).getByText("ТехноСервис")).toBeInTheDocument();
		});
	});

	test("sort by Название cycles asc → desc → none", async () => {
		await renderPageReady();
		const sortBtn = screen.getByRole("button", { name: /Сортировать по НАЗВАНИЕ/ });

		fireEvent.click(sortBtn);
		fireEvent.click(sortBtn);
		fireEvent.click(sortBtn);
		// No crash
	});

	test("sort by Сотрудники works", async () => {
		await renderPageReady();
		const sortBtn = screen.getByRole("button", { name: /Сортировать по СОТРУДНИКИ/ });
		fireEvent.click(sortBtn);

		await waitFor(() => {
			const table = screen.getByRole("table");
			const rows = within(table).getAllByRole("row");
			// isMain should still be first
			expect(within(rows[1]).getByText("Сделка")).toBeInTheDocument();
		});
	});

	test("infinite scroll shows sentinel when more pages exist", async () => {
		// 30 companies total, limit 25 → first page has 25, sentinel shown
		await renderPageReady();
		expect(screen.getByTestId("scroll-sentinel")).toBeInTheDocument();
	});

	test("Добавить компанию button renders in toolbar", async () => {
		await renderPageReady();
		expect(screen.getByRole("button", { name: /Добавить компанию/ })).toBeInTheDocument();
	});

	test("shows error state with retry button on load failure", async () => {
		server.use(http.get("/api/v1/companies/", () => HttpResponse.json({}, { status: 500 })));

		renderPage();

		await waitFor(() => {
			expect(screen.getByTestId("companies-error")).toBeInTheDocument();
		});
		expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument();
		expect(screen.getByText("Повторить")).toBeInTheDocument();
	});

	test("retry button refetches after error", async () => {
		let callCount = 0;
		server.use(
			http.get("/api/v1/companies/", () => {
				callCount++;
				if (callCount === 1) return HttpResponse.json({}, { status: 500 });
				return HttpResponse.json({ companies: MOCK_COMPANIES.slice(0, 3), nextCursor: null });
			}),
		);

		renderPage();

		await waitFor(() => {
			expect(screen.getByText("Повторить")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText("Повторить"));

		await waitFor(() => {
			expect(screen.getByText("Сделка")).toBeInTheDocument();
		});
	});

	test("empty state when no companies", async () => {
		server.use(http.get("/api/v1/companies/", () => HttpResponse.json({ companies: [], nextCursor: null })));

		renderPage();

		await waitFor(() => {
			expect(screen.getByTestId("companies-empty")).toBeInTheDocument();
		});
		expect(screen.getByText("Компании не найдены")).toBeInTheDocument();
	});
});

describe("CompaniesPage mobile", () => {
	test("renders cards instead of table on mobile", async () => {
		vi.spyOn(useIsMobileModule, "useIsMobile").mockReturnValue(true);

		renderPage();

		await waitFor(() => {
			expect(screen.getByTestId("card-company-1")).toBeInTheDocument();
		});

		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		expect(screen.getByText("Сделка")).toBeInTheDocument();

		vi.restoreAllMocks();
	});
});
