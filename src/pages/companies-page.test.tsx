import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setTokens } from "@/data/auth";
import type { Address, Company, CompanySummary, Employee, EmployeePermissions } from "@/data/types";
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
			{
				id: "addr-1",
				name: "Главный офис",
				type: "office",
				address: "г. Москва, ул. Ленина, д. 15, оф. 301",
				isMain: true,
			},
			{
				id: "addr-2",
				name: "Склад №1",
				type: "warehouse",
				address: "Московская обл., г. Подольск, ул. Складская, д. 10",
				isMain: false,
			},
			{
				id: "addr-3",
				name: "Цех",
				type: "production",
				address: "Московская обл., г. Химки, ул. Промышленная, д. 5",
				isMain: false,
			},
		],
		employeeCount: 12,
		procurementItemCount: 25,
	}),
	makeCompany("company-2", {
		name: "СтройМастер",
		responsibleEmployeeName: "Петров Пётр",
		addresses: [
			{
				id: "addr-4",
				name: "Центральный",
				type: "warehouse",
				address: "г. Казань, ул. Центральная, д. 3",
				isMain: true,
			},
		],
		employeeCount: 5,
		procurementItemCount: 10,
	}),
	makeCompany("company-3", {
		name: "ТехноСервис",
		responsibleEmployeeName: "Сидоров Алексей",
		addresses: [
			{
				id: "addr-5",
				name: "Головной",
				type: "office",
				address: "г. Новосибирск, пр. Мира, д. 20, оф. 5",
				isMain: true,
			},
			{
				id: "addr-6",
				name: "Запасной",
				type: "warehouse",
				address: "г. Новосибирск, ул. Запасная, д. 8",
				isMain: false,
			},
		],
		employeeCount: 8,
		procurementItemCount: 15,
	}),
	...Array.from({ length: 27 }, (_, i) =>
		makeCompany(`company-${i + 4}`, {
			name: `Компания ${i + 4}`,
			responsibleEmployeeName: `Сотрудник ${i + 4}`,
			addresses: [
				{
					id: `addr-gen-${i}`,
					name: `Адрес ${i + 4}`,
					type: "office",
					address: `г. Москва, ул. Тестовая, д. ${i + 4}`,
					isMain: true,
				},
			],
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
		address: "г. Москва, ул. Ленина, д. 15, оф. 301",
		contactPerson: "Иванов",
		phone: "+71234567890",
		isMain: true,
	},
	{
		id: "addr-detail-2",
		name: "Склад №1",
		type: "warehouse",
		postalCode: "654321",
		address: "Московская обл., г. Подольск, ул. Складская, д. 10",
		contactPerson: "Петров",
		phone: "+79876543210",
		isMain: false,
	},
];

const MOCK_EMPLOYEES: (Employee & { permissions: EmployeePermissions })[] = [
	{
		id: "emp-1",
		firstName: "Иван",
		lastName: "Иванов",
		patronymic: "Иванович",
		position: "Директор",
		role: "admin",
		phone: "+71234567890",
		email: "ivan@example.com",
		isResponsible: true,
		permissions: {
			id: "perm-1",
			employeeId: "emp-1",
			analytics: "edit",
			procurement: "edit",
			companies: "edit",
			tasks: "edit",
		},
	},
	{
		id: "emp-2",
		firstName: "Пётр",
		lastName: "Петров",
		patronymic: "Петрович",
		position: "Менеджер",
		role: "user",
		phone: "+79001234567",
		email: "petr@example.com",
		isResponsible: false,
		permissions: {
			id: "perm-2",
			employeeId: "emp-2",
			analytics: "none",
			procurement: "view",
			companies: "none",
			tasks: "none",
		},
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
	employees: MOCK_EMPLOYEES,
});

let companyList: CompanySummary[];
let companyDetail: Company;
let queryClient: QueryClient;

function setupHandlers() {
	companyList = [...MOCK_COMPANIES];
	companyDetail = { ...MOCK_COMPANY_DETAIL, addresses: [...MOCK_ADDRESSES], employees: [...MOCK_EMPLOYEES] };
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
		http.post("/api/v1/companies/:id/employees", async ({ request }) => {
			const body = (await request.json()) as Record<string, unknown>;
			const newEmp = {
				id: `emp-new-${Date.now()}`,
				...body,
				permissions: {
					id: `perm-new-${Date.now()}`,
					employeeId: `emp-new-${Date.now()}`,
					analytics: body.role === "admin" ? "edit" : "none",
					procurement: body.role === "admin" ? "edit" : "none",
					companies: body.role === "admin" ? "edit" : "none",
					tasks: body.role === "admin" ? "edit" : "none",
				},
			};
			companyDetail = {
				...companyDetail,
				employees: [...companyDetail.employees, newEmp as Employee & { permissions: EmployeePermissions }],
			};
			return HttpResponse.json(newEmp);
		}),
		http.patch("/api/v1/companies/:id/employees/:employeeId", async ({ params, request }) => {
			const body = (await request.json()) as Record<string, unknown>;
			const emp = companyDetail.employees.find((e) => e.id === params.employeeId);
			if (!emp) return HttpResponse.json({}, { status: 404 });
			// Handle isResponsible radio behavior
			if (body.isResponsible === true) {
				companyDetail = {
					...companyDetail,
					employees: companyDetail.employees.map((e) =>
						e.id === params.employeeId ? { ...e, ...body, isResponsible: true } : { ...e, isResponsible: false },
					) as (Employee & { permissions: EmployeePermissions })[],
				};
			} else {
				companyDetail = {
					...companyDetail,
					employees: companyDetail.employees.map((e) =>
						e.id === params.employeeId ? { ...e, ...body } : e,
					) as (Employee & { permissions: EmployeePermissions })[],
				};
			}
			return HttpResponse.json(companyDetail.employees.find((e) => e.id === params.employeeId));
		}),
		http.delete("/api/v1/companies/:id/employees/:employeeId", ({ params }) => {
			const emp = companyDetail.employees.find((e) => e.id === params.employeeId);
			if (emp?.isResponsible && companyDetail.employees.filter((e) => e.isResponsible).length <= 1) {
				return HttpResponse.json({ detail: "Cannot delete the only responsible employee" }, { status: 409 });
			}
			companyDetail = {
				...companyDetail,
				employees: companyDetail.employees.filter((e) => e.id !== params.employeeId),
			};
			return new HttpResponse(null, { status: 204 });
		}),
		http.patch("/api/v1/companies/:id/employees/:employeeId/permissions", async ({ params, request }) => {
			const body = (await request.json()) as Record<string, unknown>;
			companyDetail = {
				...companyDetail,
				employees: companyDetail.employees.map((e) =>
					e.id === params.employeeId ? { ...e, permissions: { ...e.permissions, ...body } } : e,
				),
			};
			const emp = companyDetail.employees.find((e) => e.id === params.employeeId);
			return HttpResponse.json(emp?.permissions);
		}),
		http.post("/api/v1/companies/", async ({ request }) => {
			const body = (await request.json()) as Record<string, unknown>;
			const id = `company-new-${Date.now()}`;
			const created = makeCompanyDetail(id, { name: body.name as string });
			const summary = makeCompany(id, { name: body.name as string, responsibleEmployeeName: "" });
			companyList = [...companyList, summary];
			return HttpResponse.json(created);
		}),
		http.delete("/api/v1/companies/:id/", ({ params }) => {
			const id = params.id as string;
			const company = companyList.find((c) => c.id === id);
			if (!company) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
			if (company.isMain) return HttpResponse.json({ detail: "Cannot delete main company" }, { status: 403 });
			if (company.procurementItemCount > 0)
				return HttpResponse.json({ detail: "Company has active procurement items" }, { status: 409 });
			companyList = companyList.filter((c) => c.id !== id);
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

	test("renders table with all 5 column headers", async () => {
		await renderPageReady();
		const table = screen.getByRole("table");
		expect(within(table).getByText("№")).toBeInTheDocument();
		expect(within(table).getByText("НАЗВАНИЕ")).toBeInTheDocument();
		expect(within(table).getByText("СОТРУДНИКИ")).toBeInTheDocument();
		expect(within(table).getByText("ЗАКУПКИ")).toBeInTheDocument();
		expect(within(table).getByText("АДРЕС")).toBeInTheDocument();
	});

	test("renders company name and responsible employee in first row", async () => {
		await renderPageReady();
		const row = screen.getByTestId("row-company-1");
		expect(within(row).getByText("Сделка")).toBeInTheDocument();
		expect(within(row).getByText("Ответственный: Иванов Иван")).toBeInTheDocument();
	});

	test("renders row number and address field in first row", async () => {
		await renderPageReady();
		const row = screen.getByTestId("row-company-1");
		expect(within(row).getByText("1")).toBeInTheDocument();
		expect(within(row).getByText("г. Москва, ул. Ленина, д. 15, оф. 301")).toBeInTheDocument();
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

	test("Общее tab displays company fields as text in view mode", async () => {
		renderPage(["/companies?company=company-1"]);

		await waitFor(() => {
			expect(screen.getByTestId("tab-content-general")).toBeInTheDocument();
		});

		const tab = screen.getByTestId("tab-content-general");
		expect(within(tab).getByText("Сделка")).toBeInTheDocument();
		expect(within(tab).getByText("Технологии")).toBeInTheDocument();
		expect(within(tab).getByText("https://sdelka.ai")).toBeInTheDocument();
		expect(within(tab).getByText("Платформа для закупок")).toBeInTheDocument();
		expect(within(tab).getByText("Безналичный расчёт")).toBeInTheDocument();
		expect(within(tab).getByText("Курьером")).toBeInTheDocument();
		expect(within(tab).getByText("Важный клиент")).toBeInTheDocument();
		expect(within(tab).getByRole("button", { name: "Редактировать основную информацию" })).toBeInTheDocument();
		expect(within(tab).getByRole("button", { name: "Редактировать дополнительную информацию" })).toBeInTheDocument();
	});

	test("Общее tab shows both sections", async () => {
		renderPage(["/companies?company=company-1"]);

		await waitFor(() => {
			expect(screen.getByTestId("tab-content-general")).toBeInTheDocument();
		});

		expect(screen.getByText("Основная информация")).toBeInTheDocument();
		expect(screen.getByText("Дополнительная информация для агента")).toBeInTheDocument();
	});

	test("save button is disabled when no changes in edit mode", async () => {
		renderPage(["/companies?company=company-1"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByTestId("tab-content-general")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

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

		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

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

		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

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
		expect(within(card).getByText("г. Москва, ул. Ленина, д. 15, оф. 301")).toBeInTheDocument();
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
		expect(within(card).getByLabelText("Адрес")).toHaveValue("г. Москва, ул. Ленина, д. 15, оф. 301");
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
		await user.type(within(form).getByLabelText("Адрес"), "г. Москва, ул. Новая, д. 5");
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

describe("CompaniesPage Сотрудники tab", () => {
	async function openEmployeesTab() {
		renderPage(["/companies?company=company-1&tab=employees"]);
		await waitFor(() => {
			expect(screen.getByTestId("tab-content-employees")).toBeInTheDocument();
		});
	}

	test("renders employee cards with name, position, and role", async () => {
		await openEmployeesTab();

		const tab = screen.getByTestId("tab-content-employees");
		expect(within(tab).getByText("Иванов Иван Иванович")).toBeInTheDocument();
		expect(within(tab).getByText("Петров Пётр Петрович")).toBeInTheDocument();
		expect(within(tab).getByText("Директор")).toBeInTheDocument();
		expect(within(tab).getByText("Менеджер")).toBeInTheDocument();
		expect(within(tab).getByText("Администратор")).toBeInTheDocument();
		expect(within(tab).getByText("Пользователь")).toBeInTheDocument();
	});

	test("responsible employee shows badge", async () => {
		await openEmployeesTab();

		const card = screen.getByTestId("employee-emp-1");
		expect(within(card).getByText("Ответственный")).toBeInTheDocument();
	});

	test("expand card shows profile fields in view mode and permissions matrix", async () => {
		await openEmployeesTab();
		const user = userEvent.setup();

		await user.click(screen.getByTestId("employee-toggle-emp-1"));

		const card = screen.getByTestId("employee-emp-1");
		// View mode fields
		expect(within(card).getByText("+71234567890")).toBeInTheDocument();
		expect(within(card).getByText("ivan@example.com")).toBeInTheDocument();
		expect(within(card).getByRole("button", { name: "Редактировать сотрудника" })).toBeInTheDocument();

		// Permissions matrix
		expect(within(card).getByTestId("permissions-matrix")).toBeInTheDocument();
		expect(within(card).getByTestId("perm-row-analytics")).toBeInTheDocument();
		expect(within(card).getByTestId("perm-row-procurement")).toBeInTheDocument();
		expect(within(card).getByTestId("perm-row-companies")).toBeInTheDocument();
		expect(within(card).getByTestId("perm-row-tasks")).toBeInTheDocument();
	});

	test("collapse card hides expanded content", async () => {
		await openEmployeesTab();
		const user = userEvent.setup();

		await user.click(screen.getByTestId("employee-toggle-emp-1"));
		expect(screen.getByTestId("permissions-matrix")).toBeInTheDocument();

		await user.click(screen.getByTestId("employee-toggle-emp-1"));
		expect(screen.queryByTestId("permissions-matrix")).not.toBeInTheDocument();
	});

	test("explicit save sends PATCH with changed fields", async () => {
		let capturedBody: Record<string, unknown> | undefined;
		server.use(
			http.patch("/api/v1/companies/company-1/employees/:employeeId", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				const emp = companyDetail.employees.find((e) => e.id === "emp-1");
				return HttpResponse.json({ ...emp, ...capturedBody });
			}),
		);

		await openEmployeesTab();
		const user = userEvent.setup();

		await user.click(screen.getByTestId("employee-toggle-emp-1"));

		const card = screen.getByTestId("employee-emp-1");
		await user.click(within(card).getByRole("button", { name: "Редактировать сотрудника" }));

		const posInput = within(card).getByLabelText("Должность");
		await user.clear(posInput);
		await user.type(posInput, "Генеральный директор");

		await user.click(within(card).getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(capturedBody).toEqual({ position: "Генеральный директор" });
		});
	});

	test("permission segment toggle sends immediate PATCH", async () => {
		let capturedBody: Record<string, unknown> | undefined;
		server.use(
			http.patch("/api/v1/companies/company-1/employees/:employeeId/permissions", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				const emp = companyDetail.employees.find((e) => e.id === "emp-2");
				return HttpResponse.json({ ...emp?.permissions, ...capturedBody });
			}),
		);

		await openEmployeesTab();
		const user = userEvent.setup();

		await user.click(screen.getByTestId("employee-toggle-emp-2"));

		const card = screen.getByTestId("employee-emp-2");
		await user.click(within(card).getByRole("button", { name: "Редактировать права доступа" }));
		await user.click(within(card).getByTestId("perm-analytics-edit"));

		await waitFor(() => {
			expect(capturedBody).toEqual({ analytics: "edit" });
		});
	});

	test("permissions matrix shows all 4 module icons in view mode", async () => {
		await openEmployeesTab();
		const user = userEvent.setup();

		await user.click(screen.getByTestId("employee-toggle-emp-1"));

		const matrix = screen.getByTestId("permissions-matrix");
		expect(within(matrix).getByTestId("perm-row-analytics")).toBeInTheDocument();
		expect(within(matrix).getByTestId("perm-row-procurement")).toBeInTheDocument();
		expect(within(matrix).getByTestId("perm-row-companies")).toBeInTheDocument();
		expect(within(matrix).getByTestId("perm-row-tasks")).toBeInTheDocument();
		expect(within(matrix).getByRole("button", { name: "Редактировать права доступа" })).toBeInTheDocument();
	});

	test("isResponsible checkbox has radio behavior", async () => {
		let capturedBody: Record<string, unknown> | undefined;
		server.use(
			http.patch("/api/v1/companies/company-1/employees/:employeeId", async ({ params, request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				// Apply isResponsible radio behavior in mock
				if (capturedBody.isResponsible === true) {
					companyDetail = {
						...companyDetail,
						employees: companyDetail.employees.map((e) =>
							e.id === params.employeeId ? { ...e, isResponsible: true } : { ...e, isResponsible: false },
						) as (Employee & { permissions: EmployeePermissions })[],
					};
				}
				return HttpResponse.json(companyDetail.employees.find((e) => e.id === params.employeeId));
			}),
		);

		await openEmployeesTab();
		const user = userEvent.setup();

		// Expand second employee (not responsible), enter edit mode, click responsible checkbox
		await user.click(screen.getByTestId("employee-toggle-emp-2"));

		const card = screen.getByTestId("employee-emp-2");
		await user.click(within(card).getByRole("button", { name: "Редактировать сотрудника" }));
		await user.click(within(card).getByRole("checkbox", { name: "Ответственный" }));

		await waitFor(() => {
			expect(capturedBody).toEqual({ isResponsible: true });
		});
	});

	test("cannot delete only responsible employee", async () => {
		await openEmployeesTab();
		const user = userEvent.setup();

		// Expand the responsible employee (emp-1) and enter edit mode
		await user.click(screen.getByTestId("employee-toggle-emp-1"));

		const card = screen.getByTestId("employee-emp-1");
		await user.click(within(card).getByRole("button", { name: "Редактировать сотрудника" }));
		expect(within(card).getByRole("button", { name: "Удалить сотрудника" })).toBeDisabled();
	});

	test("add employee form creates new employee", async () => {
		await openEmployeesTab();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить сотрудника/ }));

		const form = screen.getByTestId("employee-add-form");
		await user.type(within(form).getByLabelText("Фамилия"), "Сидоров");
		await user.type(within(form).getByLabelText("Имя"), "Алексей");
		await user.type(within(form).getByLabelText("Отчество"), "Сергеевич");
		await user.type(within(form).getByLabelText("Должность"), "Инженер");
		await user.type(within(form).getByLabelText("Телефон"), "+79005551234");
		await user.type(within(form).getByLabelText("Электронная почта"), "alex@example.com");

		await user.click(within(form).getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(screen.getByText("Сидоров Алексей Сергеевич")).toBeInTheDocument();
		});
	});

	test("delete non-responsible employee removes from list", async () => {
		await openEmployeesTab();
		const user = userEvent.setup();

		expect(screen.getByText("Петров Пётр Петрович")).toBeInTheDocument();

		await user.click(screen.getByTestId("employee-toggle-emp-2"));

		const card = screen.getByTestId("employee-emp-2");
		await user.click(within(card).getByRole("button", { name: "Редактировать сотрудника" }));
		await user.click(within(card).getByRole("button", { name: "Удалить сотрудника" }));

		await waitFor(() => {
			expect(screen.queryByText("Петров Пётр Петрович")).not.toBeInTheDocument();
		});
	});

	test("admin role prefills permissions to Редактирование", async () => {
		let permsCaptured: Record<string, unknown> | undefined;
		let profileCaptured: Record<string, unknown> | undefined;
		server.use(
			http.patch("/api/v1/companies/company-1/employees/:employeeId/permissions", async ({ request }) => {
				permsCaptured = (await request.json()) as Record<string, unknown>;
				const emp = companyDetail.employees.find((e) => e.id === "emp-2");
				return HttpResponse.json({ ...emp?.permissions, ...permsCaptured });
			}),
			http.patch("/api/v1/companies/company-1/employees/:employeeId", async ({ params, request }) => {
				profileCaptured = (await request.json()) as Record<string, unknown>;
				const emp = companyDetail.employees.find((e) => e.id === params.employeeId);
				return HttpResponse.json({ ...emp, ...profileCaptured });
			}),
		);

		await openEmployeesTab();
		const user = userEvent.setup();

		await user.click(screen.getByTestId("employee-toggle-emp-2"));

		const card = screen.getByTestId("employee-emp-2");
		await user.click(within(card).getByRole("button", { name: "Редактировать сотрудника" }));

		// Change role to admin via select
		await user.click(within(card).getByLabelText("Роль"));
		await user.click(screen.getByRole("option", { name: "Администратор" }));

		// Save the profile change
		await user.click(within(card).getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(profileCaptured).toEqual({ role: "admin" });
			expect(permsCaptured).toEqual({ analytics: "edit", procurement: "edit", companies: "edit", tasks: "edit" });
		});
	});
});

describe("CompaniesPage context menu", () => {
	test("right-click on company row shows context menu", async () => {
		await renderPageReady();
		const user = userEvent.setup();

		const row = screen.getByTestId("row-company-2");
		await user.pointer({ keys: "[MouseRight]", target: row });

		await waitFor(() => {
			expect(screen.getByRole("menuitem", { name: "Просмотреть закупки" })).toBeInTheDocument();
			expect(screen.getByRole("menuitem", { name: "Добавить сотрудника" })).toBeInTheDocument();
			expect(screen.getByRole("menuitem", { name: "Удалить" })).toBeInTheDocument();
		});
	});

	test("Добавить сотрудника opens drawer on Сотрудники tab with add form", async () => {
		await renderPageReady();
		const user = userEvent.setup();

		const row = screen.getByTestId("row-company-1");
		await user.pointer({ keys: "[MouseRight]", target: row });

		await waitFor(() => {
			expect(screen.getByRole("menuitem", { name: "Добавить сотрудника" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("menuitem", { name: "Добавить сотрудника" }));

		await waitFor(() => {
			expect(screen.getByTestId("tab-content-employees")).toBeInTheDocument();
			expect(screen.getByTestId("tab-employees")).toHaveAttribute("aria-selected", "true");
			expect(screen.getByTestId("employee-add-form")).toBeInTheDocument();
		});
	});

	test("Удалить is hidden for isMain company", async () => {
		await renderPageReady();
		const user = userEvent.setup();

		const row = screen.getByTestId("row-company-1");
		await user.pointer({ keys: "[MouseRight]", target: row });

		await waitFor(() => {
			expect(screen.getByRole("menuitem", { name: "Просмотреть закупки" })).toBeInTheDocument();
		});

		expect(screen.queryByRole("menuitem", { name: "Удалить" })).not.toBeInTheDocument();
	});

	test("Удалить shows confirmation dialog", async () => {
		await renderPageReady();
		const user = userEvent.setup();

		const row = screen.getByTestId("row-company-2");
		await user.pointer({ keys: "[MouseRight]", target: row });

		await waitFor(() => {
			expect(screen.getByRole("menuitem", { name: "Удалить" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("menuitem", { name: "Удалить" }));

		await waitFor(() => {
			expect(screen.getByText("Удалить компанию?")).toBeInTheDocument();
		});
	});

	test("confirmed deletion removes company from list", async () => {
		// company-2 has procurementItemCount: 10, need a deletable company
		companyList = companyList.map((c) => (c.id === "company-2" ? { ...c, procurementItemCount: 0 } : c));

		await renderPageReady();
		const user = userEvent.setup();

		expect(screen.getByText("СтройМастер")).toBeInTheDocument();

		const row = screen.getByTestId("row-company-2");
		await user.pointer({ keys: "[MouseRight]", target: row });

		await waitFor(() => {
			expect(screen.getByRole("menuitem", { name: "Удалить" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("menuitem", { name: "Удалить" }));

		await waitFor(() => {
			expect(screen.getByText("Удалить компанию?")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Удалить" }));

		await waitFor(() => {
			expect(screen.queryByText("СтройМастер")).not.toBeInTheDocument();
		});
	});

	test("drawer closes if deleted company was open", async () => {
		// Make company-2 deletable
		companyList = companyList.map((c) => (c.id === "company-2" ? { ...c, procurementItemCount: 0 } : c));
		// Set up detail handler for company-2
		server.use(
			http.get("/api/v1/companies/:id/", ({ params }) => {
				if (params.id === "company-1") return HttpResponse.json(companyDetail);
				if (params.id === "company-2")
					return HttpResponse.json(makeCompanyDetail("company-2", { name: "СтройМастер" }));
				return HttpResponse.json({ detail: "Not found" }, { status: 404 });
			}),
		);

		await renderPageReady();
		const user = userEvent.setup();

		// Open drawer by clicking the row
		await user.click(screen.getByTestId("row-company-2"));

		await waitFor(() => {
			expect(screen.getByTestId("drawer-title")).toHaveTextContent("СтройМастер");
		});

		// Right-click on the row (use fireEvent because Sheet overlay blocks pointer-events in JSDOM)
		fireEvent.contextMenu(screen.getByTestId("row-company-2"));

		await waitFor(() => {
			expect(screen.getByRole("menuitem", { name: "Удалить" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("menuitem", { name: "Удалить" }));

		await waitFor(() => {
			expect(screen.getByText("Удалить компанию?")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Удалить" }));

		await waitFor(() => {
			expect(screen.queryByTestId("drawer-title")).not.toBeInTheDocument();
		});
	});

	test("company with active procurement items shows error on delete (409)", async () => {
		// company-2 has procurementItemCount: 10, so delete will return 409
		await renderPageReady();
		const user = userEvent.setup();

		const row = screen.getByTestId("row-company-2");
		await user.pointer({ keys: "[MouseRight]", target: row });

		await waitFor(() => {
			expect(screen.getByRole("menuitem", { name: "Удалить" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("menuitem", { name: "Удалить" }));

		await waitFor(() => {
			expect(screen.getByText("Удалить компанию?")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Удалить" }));

		await waitFor(() => {
			// Company should still be in the list
			expect(screen.getByText("СтройМастер")).toBeInTheDocument();
		});
	});
});

describe("CompaniesPage company creation", () => {
	test("Добавить компанию button opens creation sheet", async () => {
		await renderPageReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить компанию/ }));

		await waitFor(() => {
			expect(screen.getByText("Новая компания")).toBeInTheDocument();
			expect(screen.getByTestId("creation-form")).toBeInTheDocument();
		});
	});

	test("creation form has company fields and address card", async () => {
		await renderPageReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить компанию/ }));

		await waitFor(() => {
			expect(screen.getByTestId("creation-form")).toBeInTheDocument();
		});

		const form = screen.getByTestId("creation-form");
		// Company fields
		expect(within(form).getByLabelText("Название компании")).toBeInTheDocument();
		expect(within(form).getByLabelText("Отрасль")).toBeInTheDocument();
		expect(within(form).getByLabelText("Сайт")).toBeInTheDocument();
		expect(within(form).getByLabelText("Описание")).toBeInTheDocument();
		expect(within(form).getByLabelText("Предпочтительная оплата")).toBeInTheDocument();
		// Address card
		expect(within(form).getByTestId("address-row-0")).toBeInTheDocument();
		expect(within(form).getByLabelText("Название адреса")).toBeInTheDocument();
		expect(within(form).getByLabelText("Тип адреса")).toBeInTheDocument();
		// Footer buttons
		expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Создать компанию" })).toBeInTheDocument();
	});

	test("submit blocked when company name is empty", async () => {
		await renderPageReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить компанию/ }));

		await waitFor(() => {
			expect(screen.getByTestId("creation-form")).toBeInTheDocument();
		});

		const form = screen.getByTestId("creation-form");
		await user.type(within(form).getByLabelText("Название адреса"), "Офис");

		expect(screen.getByRole("button", { name: "Создать компанию" })).toBeDisabled();
	});

	test("submit blocked when address name is empty", async () => {
		await renderPageReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить компанию/ }));

		await waitFor(() => {
			expect(screen.getByTestId("creation-form")).toBeInTheDocument();
		});

		const form = screen.getByTestId("creation-form");
		await user.type(within(form).getByLabelText("Название компании"), "Тестовая");

		expect(screen.getByRole("button", { name: "Создать компанию" })).toBeDisabled();
	});

	test("successful creation closes sheet", async () => {
		await renderPageReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить компанию/ }));

		await waitFor(() => {
			expect(screen.getByTestId("creation-form")).toBeInTheDocument();
		});

		const form = screen.getByTestId("creation-form");
		await user.type(within(form).getByLabelText("Название компании"), "НоваяКомпания");
		await user.type(within(form).getByLabelText("Название адреса"), "Офис");

		expect(screen.getByRole("button", { name: "Создать компанию" })).toBeEnabled();

		await user.click(screen.getByRole("button", { name: "Создать компанию" }));

		await waitFor(() => {
			expect(screen.queryByTestId("creation-form")).not.toBeInTheDocument();
		});
	});

	test("new company appears in list after creation", async () => {
		// Start with small dataset so new company fits first page
		companyList = MOCK_COMPANIES.slice(0, 3);

		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Сделка")).toBeInTheDocument();
		});
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить компанию/ }));

		await waitFor(() => {
			expect(screen.getByTestId("creation-form")).toBeInTheDocument();
		});

		const form = screen.getByTestId("creation-form");
		await user.type(within(form).getByLabelText("Название компании"), "НоваяКомпания");
		await user.type(within(form).getByLabelText("Название адреса"), "Офис");

		await user.click(screen.getByRole("button", { name: "Создать компанию" }));

		await waitFor(() => {
			expect(screen.getByText("НоваяКомпания")).toBeInTheDocument();
		});
	});

	test("form sends correct nested payload", async () => {
		let capturedBody: Record<string, unknown> | undefined;
		server.use(
			http.post("/api/v1/companies/", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				const created = makeCompanyDetail("new-1", { name: capturedBody.name as string });
				companyList = [...companyList, makeCompany("new-1", { name: capturedBody.name as string })];
				return HttpResponse.json(created);
			}),
		);

		await renderPageReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить компанию/ }));

		await waitFor(() => {
			expect(screen.getByTestId("creation-form")).toBeInTheDocument();
		});

		const form = screen.getByTestId("creation-form");
		await user.type(within(form).getByLabelText("Название компании"), "ТестКомпания");
		await user.type(within(form).getByLabelText("Название адреса"), "Центральный");

		await user.click(screen.getByRole("button", { name: "Создать компанию" }));

		await waitFor(() => {
			expect(capturedBody).toBeDefined();
		});

		expect(capturedBody).toMatchObject({
			name: "ТестКомпания",
			address: { name: "Центральный", type: "office" },
		});
		expect(capturedBody).not.toHaveProperty("employee");
	});

	test("form clears on close and reopen", async () => {
		await renderPageReady();
		const user = userEvent.setup();

		// Open and fill
		await user.click(screen.getByRole("button", { name: /Добавить компанию/ }));

		await waitFor(() => {
			expect(screen.getByTestId("creation-form")).toBeInTheDocument();
		});

		const form = screen.getByTestId("creation-form");
		await user.type(within(form).getByLabelText("Название компании"), "Временная");

		// Close via sheet close (press Escape)
		await user.keyboard("{Escape}");

		await waitFor(() => {
			expect(screen.queryByTestId("creation-form")).not.toBeInTheDocument();
		});

		// Reopen
		await user.click(screen.getByRole("button", { name: /Добавить компанию/ }));

		await waitFor(() => {
			expect(screen.getByTestId("creation-form")).toBeInTheDocument();
		});

		expect(screen.getByLabelText("Название компании")).toHaveValue("");
	});
});
