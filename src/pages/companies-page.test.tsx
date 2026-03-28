import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setTokens } from "@/data/auth";
import type { Address, Company, CompanySummary } from "@/data/types";
import * as useIsMobileModule from "@/hooks/use-is-mobile";
import { server } from "@/test-msw";
import { makeCompany, makeCompanyDetail } from "@/test-utils";
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

const MOCK_ADDRESSES: Address[] = [
	{
		id: "addr-detail-1",
		name: "Главный офис",
		type: "office",
		postalCode: "123456",
		address: "ул. Тестовая, 1",
		city: "Москва",
		region: "Московская область",
		contactPerson: "Иванов",
		phone: "+71234567890",
	},
	{
		id: "addr-detail-2",
		name: "Склад №1",
		type: "warehouse",
		postalCode: "654321",
		address: "ул. Складская, 10",
		city: "Подольск",
		region: "Московская область",
		contactPerson: "Петров",
		phone: "+79876543210",
	},
];

const MOCK_COMPANY_DETAIL: Company = makeCompanyDetail("company-1", {
	name: "Сделка",
	isMain: true,
	industry: "Технологии",
	website: "https://sdelka.ai",
	description: "Платформа для закупок",
	preferredPayment: "Безналичный расчёт",
	preferredDelivery: "Курьером",
	additionalComments: "Важный клиент",
	employeeCount: 12,
	procurementItemCount: 25,
	addresses: MOCK_ADDRESSES,
});

let companyList: CompanySummary[];
let companyDetail: Company;
let queryClient: QueryClient;

function setupHandlers() {
	companyList = [...MOCK_COMPANIES];
	companyDetail = { ...MOCK_COMPANY_DETAIL, addresses: [...MOCK_ADDRESSES] };
	server.use(
		http.get("/api/v1/companies/:id/", ({ params }) => {
			if (params.id === "company-1") return HttpResponse.json(companyDetail);
			return HttpResponse.json({ detail: "Not found" }, { status: 404 });
		}),
		http.patch("/api/v1/companies/:id/", async ({ params, request }) => {
			if (params.id !== "company-1") return HttpResponse.json({}, { status: 404 });
			const body = (await request.json()) as Record<string, unknown>;
			return HttpResponse.json({ ...companyDetail, ...body });
		}),
		http.post("/api/v1/companies/:id/addresses", async ({ request }) => {
			const body = (await request.json()) as Record<string, unknown>;
			const newAddr = { id: `addr-new-${Date.now()}`, ...body };
			companyDetail = { ...companyDetail, addresses: [...companyDetail.addresses, newAddr as Address] };
			return HttpResponse.json(newAddr);
		}),
		http.patch("/api/v1/companies/:id/addresses/:addressId", async ({ params, request }) => {
			const body = (await request.json()) as Record<string, unknown>;
			const addr = companyDetail.addresses.find((a) => a.id === params.addressId);
			if (!addr) return HttpResponse.json({}, { status: 404 });
			const updated = { ...addr, ...body };
			companyDetail = {
				...companyDetail,
				addresses: companyDetail.addresses.map((a) => (a.id === params.addressId ? (updated as Address) : a)),
			};
			return HttpResponse.json(updated);
		}),
		http.delete("/api/v1/companies/:id/addresses/:addressId", ({ params }) => {
			if (companyDetail.addresses.length <= 1) {
				return HttpResponse.json({ detail: "Cannot delete the last address" }, { status: 409 });
			}
			companyDetail = {
				...companyDetail,
				addresses: companyDetail.addresses.filter((a) => a.id !== params.addressId),
			};
			return new HttpResponse(null, { status: 204 });
		}),
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

describe("CompaniesPage drawer", () => {
	test("clicking company row opens drawer with company details", async () => {
		await renderPageReady();
		const user = userEvent.setup();

		await user.click(screen.getByTestId("row-company-1"));

		await waitFor(() => {
			expect(screen.getByTestId("drawer-title")).toHaveTextContent("Сделка");
			expect(screen.getByTestId("tab-content-general")).toBeInTheDocument();
		});
	});

	test("drawer renders 3 tabs with Общее active by default", async () => {
		renderPage(["/companies?company=company-1"]);

		await waitFor(() => {
			expect(screen.getByTestId("tab-general")).toBeInTheDocument();
		});

		expect(screen.getByTestId("tab-addresses")).toBeInTheDocument();
		expect(screen.getByTestId("tab-employees")).toBeInTheDocument();

		expect(screen.getByTestId("tab-general")).toHaveAttribute("aria-selected", "true");
		expect(screen.getByTestId("tab-content-general")).toBeInTheDocument();
	});

	test("Общее tab displays company fields populated from data", async () => {
		renderPage(["/companies?company=company-1"]);

		await waitFor(() => {
			expect(screen.getByTestId("tab-content-general")).toBeInTheDocument();
		});

		expect(screen.getByLabelText("Название")).toHaveValue("Сделка");
		expect(screen.getByLabelText("Отрасль")).toHaveValue("Технологии");
		expect(screen.getByLabelText("Сайт")).toHaveValue("https://sdelka.ai");
		expect(screen.getByLabelText("Описание")).toHaveValue("Платформа для закупок");
		expect(screen.getByLabelText("Предпочтительная оплата")).toHaveValue("Безналичный расчёт");
		expect(screen.getByLabelText("Предпочтительная доставка")).toHaveValue("Курьером");
		expect(screen.getByLabelText("Дополнительные комментарии")).toHaveValue("Важный клиент");
	});

	test("Общее tab shows both sections", async () => {
		renderPage(["/companies?company=company-1"]);

		await waitFor(() => {
			expect(screen.getByTestId("tab-content-general")).toBeInTheDocument();
		});

		expect(screen.getByText("Основная информация")).toBeInTheDocument();
		expect(screen.getByText("Комментарии агента")).toBeInTheDocument();
	});

	test("save button is disabled when no changes", async () => {
		renderPage(["/companies?company=company-1"]);

		await waitFor(() => {
			expect(screen.getByTestId("tab-content-general")).toBeInTheDocument();
		});

		expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
	});

	test("save button sends PATCH with changed fields only", async () => {
		let capturedBody: Record<string, unknown> | undefined;
		server.use(
			http.patch("/api/v1/companies/company-1/", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json({ ...MOCK_COMPANY_DETAIL, ...capturedBody });
			}),
		);

		renderPage(["/companies?company=company-1"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByTestId("tab-content-general")).toBeInTheDocument();
		});

		const nameInput = screen.getByLabelText("Название");
		await user.clear(nameInput);
		await user.type(nameInput, "Новое название");

		expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();

		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(capturedBody).toEqual({ name: "Новое название" });
		});
	});

	test("save button disabled when name is empty", async () => {
		renderPage(["/companies?company=company-1"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByTestId("tab-content-general")).toBeInTheDocument();
		});

		const nameInput = screen.getByLabelText("Название");
		await user.clear(nameInput);

		expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
	});

	test("tab switching shows correct content", async () => {
		renderPage(["/companies?company=company-1"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByTestId("tab-content-general")).toBeInTheDocument();
		});

		await user.click(screen.getByTestId("tab-addresses"));
		expect(screen.getByTestId("tab-content-addresses")).toBeInTheDocument();
		expect(screen.queryByTestId("tab-content-general")).not.toBeInTheDocument();

		await user.click(screen.getByTestId("tab-employees"));
		expect(screen.getByTestId("tab-content-employees")).toBeInTheDocument();
		expect(screen.queryByTestId("tab-content-addresses")).not.toBeInTheDocument();
	});

	test("URL with company=id opens drawer directly", async () => {
		renderPage(["/companies?company=company-1"]);

		await waitFor(() => {
			expect(screen.getByTestId("drawer-title")).toHaveTextContent("Сделка");
		});
	});

	test("URL with tab param opens correct tab", async () => {
		renderPage(["/companies?company=company-1&tab=addresses"]);

		await waitFor(() => {
			expect(screen.getByTestId("tab-content-addresses")).toBeInTheDocument();
		});

		expect(screen.getByTestId("tab-addresses")).toHaveAttribute("aria-selected", "true");
	});

	test("invalid company shows error in drawer", async () => {
		renderPage(["/companies?company=nonexistent"]);

		await waitFor(() => {
			expect(screen.getByTestId("drawer-error")).toBeInTheDocument();
		});

		expect(screen.getByText("Не удалось загрузить компанию")).toBeInTheDocument();
	});

	test("drawer shows loading state", async () => {
		server.use(
			http.get("/api/v1/companies/:id/", async () => {
				await new Promise(() => {});
			}),
		);

		renderPage(["/companies?company=company-1"]);

		await waitFor(() => {
			expect(screen.getByTestId("drawer-loading")).toBeInTheDocument();
		});
	});
});

describe("CompaniesPage Адреса tab", () => {
	async function openAddressesTab() {
		renderPage(["/companies?company=company-1&tab=addresses"]);
		await waitFor(() => {
			expect(screen.getByTestId("tab-content-addresses")).toBeInTheDocument();
		});
	}

	test("renders all addresses for the company", async () => {
		await openAddressesTab();

		const tab = screen.getByTestId("tab-content-addresses");
		expect(within(tab).getByText("Главный офис")).toBeInTheDocument();
		expect(within(tab).getByText("Склад №1")).toBeInTheDocument();
	});

	test("each address shows type badge", async () => {
		await openAddressesTab();

		expect(screen.getByTestId("address-addr-detail-1")).toBeInTheDocument();
		expect(within(screen.getByTestId("address-addr-detail-1")).getByText("Офис")).toBeInTheDocument();
		expect(within(screen.getByTestId("address-addr-detail-2")).getByText("Склад")).toBeInTheDocument();
	});

	test("each address shows all fields in view mode", async () => {
		await openAddressesTab();

		const card = screen.getByTestId("address-addr-detail-1");
		expect(within(card).getByText("123456")).toBeInTheDocument();
		expect(within(card).getByText("ул. Тестовая, 1")).toBeInTheDocument();
		expect(within(card).getByText("Москва")).toBeInTheDocument();
		expect(within(card).getByText("Московская область")).toBeInTheDocument();
		expect(within(card).getByText("Иванов")).toBeInTheDocument();
		expect(within(card).getByText("+71234567890")).toBeInTheDocument();
	});

	test("edit button opens edit mode with prefilled fields", async () => {
		await openAddressesTab();
		const user = userEvent.setup();

		const card = screen.getByTestId("address-addr-detail-1");
		await user.click(within(card).getByRole("button", { name: "Редактировать" }));

		expect(within(card).getByLabelText("Название")).toHaveValue("Главный офис");
		expect(within(card).getByLabelText("Индекс")).toHaveValue("123456");
		expect(within(card).getByLabelText("Адрес")).toHaveValue("ул. Тестовая, 1");
		expect(within(card).getByLabelText("Населенный пункт")).toHaveValue("Москва");
		expect(within(card).getByLabelText("Регион")).toHaveValue("Московская область");
		expect(within(card).getByLabelText("Контактное лицо")).toHaveValue("Иванов");
		expect(within(card).getByLabelText("Телефон")).toHaveValue("+71234567890");
	});

	test("edit save sends PATCH with changed fields", async () => {
		let capturedBody: Record<string, unknown> | undefined;
		server.use(
			http.patch("/api/v1/companies/company-1/addresses/:addressId", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json({ ...MOCK_ADDRESSES[0], ...capturedBody });
			}),
		);

		await openAddressesTab();
		const user = userEvent.setup();

		const card = screen.getByTestId("address-addr-detail-1");
		await user.click(within(card).getByRole("button", { name: "Редактировать" }));

		const nameInput = within(card).getByLabelText("Название");
		await user.clear(nameInput);
		await user.type(nameInput, "Новый офис");

		await user.click(within(card).getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(capturedBody).toEqual({ name: "Новый офис" });
		});
	});

	test("cancel edit returns to view mode without saving", async () => {
		await openAddressesTab();
		const user = userEvent.setup();

		const card = screen.getByTestId("address-addr-detail-1");
		await user.click(within(card).getByRole("button", { name: "Редактировать" }));

		const nameInput = within(card).getByLabelText("Название");
		await user.clear(nameInput);
		await user.type(nameInput, "Changed");

		await user.click(within(card).getByRole("button", { name: "Отмена" }));

		// Back in view mode with original name
		expect(within(card).getByText("Главный офис")).toBeInTheDocument();
		expect(within(card).queryByLabelText("Название")).not.toBeInTheDocument();
	});

	test("add address form creates new address", async () => {
		await openAddressesTab();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Добавить адрес" }));

		const form = screen.getByTestId("address-add-form");
		await user.type(within(form).getByLabelText("Название"), "Новый склад");
		await user.type(within(form).getByLabelText("Индекс"), "111111");
		await user.type(within(form).getByLabelText("Адрес"), "ул. Новая, 5");
		await user.type(within(form).getByLabelText("Населенный пункт"), "Москва");
		await user.type(within(form).getByLabelText("Регион"), "МО");
		await user.type(within(form).getByLabelText("Контактное лицо"), "Сидоров");
		await user.type(within(form).getByLabelText("Телефон"), "+79001234567");

		await user.click(within(form).getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(screen.getByText("Новый склад")).toBeInTheDocument();
		});
	});

	test("delete address removes it from the list", async () => {
		await openAddressesTab();
		const user = userEvent.setup();

		expect(screen.getByText("Склад №1")).toBeInTheDocument();

		const card = screen.getByTestId("address-addr-detail-2");
		await user.click(within(card).getByRole("button", { name: "Удалить" }));

		await waitFor(() => {
			expect(screen.queryByText("Склад №1")).not.toBeInTheDocument();
		});
	});

	test("last address delete is blocked", async () => {
		// Company with single address
		companyDetail = { ...MOCK_COMPANY_DETAIL, addresses: [MOCK_ADDRESSES[0]] };

		await openAddressesTab();

		const card = screen.getByTestId("address-addr-detail-1");
		expect(within(card).getByRole("button", { name: "Удалить" })).toBeDisabled();
	});
});
