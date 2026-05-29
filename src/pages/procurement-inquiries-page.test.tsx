import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { createInMemoryItemsClient } from "@/data/clients/items-in-memory";
import type { ProcurementInquiriesClient } from "@/data/clients/procurement-inquiries-client";
import { createInMemoryProcurementInquiriesClient } from "@/data/clients/procurement-inquiries-in-memory";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import { createInMemorySubscriptionClient } from "@/data/clients/subscription-in-memory";
import type { Subscription } from "@/data/domains/subscription";
import { _resetMockDelay, _setMockDelay } from "@/data/mock-utils";
import {
	fakeGeneratedEmailClient,
	fakeGeneratedQuestionsClient,
	TestClientsProvider,
	testFoldersClient,
} from "@/data/test-clients-provider";
import type { Folder, ProcurementInquiry } from "@/data/types";
import { makeCompanyDetail, makeProcurementInquiry } from "@/test-utils";
import { ProcurementInquiriesPage } from "./procurement-inquiries-page";

const toastErrorSpy = vi.fn();
vi.mock("sonner", () => ({
	toast: {
		error: (msg: string) => toastErrorSpy(msg),
		success: vi.fn(),
		info: vi.fn(),
	},
}));

const FOLDERS: Folder[] = [
	{ id: "folder-packaging", name: "Упаковка", color: "blue" },
	{ id: "folder-fillings", name: "Наполнители", color: "green" },
];

const PROCUREMENT_INQUIRIES: ProcurementInquiry[] = [
	makeProcurementInquiry("T-001", {
		name: "Тестовый запрос 1",
		folderId: "folder-packaging",
		createdAt: "2026-04-01",
		deadline: "2026-05-15",
	}),
	makeProcurementInquiry("T-002", {
		name: "Тестовый запрос 2",
		folderId: "folder-fillings",
		createdAt: "2026-04-15",
		deadline: "2026-05-25",
	}),
];

function renderPage(
	initialEntries: string[] = ["/inquiries"],
	procurementInquiries: ProcurementInquiry[] = PROCUREMENT_INQUIRIES,
	subscription?: Subscription,
	clients?: { procurementInquiries?: ProcurementInquiriesClient; queryClient?: QueryClient },
) {
	const queryClient =
		clients?.queryClient ??
		new QueryClient({
			defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
		});
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: createInMemoryCompaniesClient([makeCompanyDetail("company-1", { name: "Альфа", isMain: true })]),
				items: createInMemoryItemsClient({ seed: [] }),
				procurementInquiries:
					clients?.procurementInquiries ?? createInMemoryProcurementInquiriesClient({ seed: procurementInquiries }),
				folders: testFoldersClient(FOLDERS),
				profile: createInMemoryProfileClient(),
				generatedQuestions: fakeGeneratedQuestionsClient(),
				generatedEmail: fakeGeneratedEmailClient(),
				subscription: createInMemorySubscriptionClient(subscription ? { subscription } : undefined),
			}}
		>
			<TooltipProvider>
				<MemoryRouter initialEntries={initialEntries}>
					<Routes>
						<Route path="/inquiries" element={<ProcurementInquiriesPage />} />
					</Routes>
				</MemoryRouter>
			</TooltipProvider>
		</TestClientsProvider>,
	);
}

beforeEach(() => {
	_setMockDelay(0, 0);
	toastErrorSpy.mockClear();
});

afterEach(() => {
	_resetMockDelay();
	vi.restoreAllMocks();
});

describe("ProcurementInquiriesPage", () => {
	test("renders the «Запросы» heading", async () => {
		renderPage();
		expect(screen.getByRole("heading", { name: "Запросы" })).toBeInTheDocument();
	});

	test("renders all 7 column headers", async () => {
		renderPage();
		const headers = await screen.findAllByRole("columnheader");
		expect(headers).toHaveLength(7);
		const labels = headers.map((h) => h.textContent ?? "");
		expect(labels[0]).toBe("№");
		expect(labels[1]).toBe("НАЗВАНИЕ");
		expect(labels[2]).toBe("ВСЕГО ПОСТАВЩИКОВ");
		expect(labels[3]).toBe("ПОЛУЧЕНО КП");
		expect(labels[4]).toBe("ВОПРОСЫ");
		expect(labels[5]).toBe("ДЕДЛАЙН");
		expect(labels[6]).toBe("ДАТА СОЗДАНИЯ");
	});

	test("renders one row per seeded inquiry, sorted by createdAt desc", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByTestId("procurement-inquiry-row-T-001")).toBeInTheDocument();
		});
		const rows = screen
			.getAllByRole("row")
			.filter((r) => r.getAttribute("data-testid")?.startsWith("procurement-inquiry-row-"));
		expect(rows.map((r) => r.getAttribute("data-testid"))).toEqual([
			"procurement-inquiry-row-T-002",
			"procurement-inquiry-row-T-001",
		]);
	});

	test("each row exposes row number, name, and category badge", async () => {
		renderPage();
		// Sorted by createdAt desc: T-002 is row #1, T-001 is row #2.
		const row = await screen.findByTestId("procurement-inquiry-row-T-001");
		expect(within(row).getByText("2")).toBeInTheDocument();
		expect(within(row).getByText("Тестовый запрос 1")).toBeInTheDocument();
		expect(within(row).getByText("Упаковка")).toBeInTheDocument();
	});

	test("does not render «Отклонение / переплата» filters", async () => {
		renderPage();
		await screen.findByTestId("procurement-inquiry-row-T-001");
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Фильтры" }));
		expect(screen.queryByText("Отклонение")).not.toBeInTheDocument();
		expect(screen.queryByText("С переплатой")).not.toBeInTheDocument();
		expect(screen.queryByText("С экономией")).not.toBeInTheDocument();
	});

	test("deadline filter exposes a date range and a Просрочены preset inside the Фильтры popover", async () => {
		renderPage();
		await screen.findByTestId("procurement-inquiry-row-T-001");
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Фильтры" }));
		expect(screen.getByLabelText("Дедлайн с")).toBeInTheDocument();
		expect(screen.getByLabelText("Дедлайн по")).toBeInTheDocument();
		expect(screen.getByTestId("deadline-filter-overdue")).toBeInTheDocument();
		expect(screen.queryByTestId("deadline-filter-soon")).not.toBeInTheDocument();
	});

	test("archive toggle button has aria-pressed and toggles folder=archive", async () => {
		renderPage();
		await screen.findByTestId("procurement-inquiry-row-T-001");

		const archive = screen.getByRole("button", { name: "Архив" });
		expect(archive).toHaveAttribute("aria-pressed", "false");

		const user = userEvent.setup();
		await user.click(archive);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Архив" })).toHaveAttribute("aria-pressed", "true");
		});
	});

	test("archive toggle refetches the inquiries list once per toggle", async () => {
		const procurementInquiries = createInMemoryProcurementInquiriesClient({ seed: PROCUREMENT_INQUIRIES });
		const listSpy = vi.spyOn(procurementInquiries, "list");
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
		});
		renderPage(["/inquiries"], PROCUREMENT_INQUIRIES, undefined, { procurementInquiries, queryClient });
		await screen.findByTestId("procurement-inquiry-row-T-001");
		listSpy.mockClear();

		const user = userEvent.setup();
		const archive = screen.getByRole("button", { name: "Архив" });
		await user.click(archive);

		await waitFor(() => {
			expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ folder: "archive" }));
		});
		expect(listSpy).toHaveBeenCalledTimes(1);

		await user.click(archive);

		await waitFor(() => {
			expect(listSpy).toHaveBeenCalledTimes(2);
		});
		expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ folder: undefined }));

		await user.click(archive);

		await waitFor(() => {
			expect(listSpy).toHaveBeenCalledTimes(3);
		});
		expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ folder: "archive" }));
	});

	test("archive view shows only archived procurementInquiries; active view excludes them", async () => {
		const SEED: ProcurementInquiry[] = [
			...PROCUREMENT_INQUIRIES,
			makeProcurementInquiry("T-099", {
				name: "Архивный запрос",
				folderId: null,
				createdAt: "2026-04-20",
				deadline: "2026-05-10",
				isArchived: true,
			}),
		];
		renderPage(["/inquiries"], SEED);
		await screen.findByTestId("procurement-inquiry-row-T-001");
		expect(screen.queryByTestId("procurement-inquiry-row-T-099")).not.toBeInTheDocument();

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Архив" }));

		await waitFor(() => {
			expect(screen.getByTestId("procurement-inquiry-row-T-099")).toBeInTheDocument();
		});
		expect(screen.queryByTestId("procurement-inquiry-row-T-001")).not.toBeInTheDocument();
		expect(screen.queryByTestId("procurement-inquiry-row-T-002")).not.toBeInTheDocument();
	});

	test("«Создать запрос» does not open the drawer and shows a limit toast when the monthly limit is reached", async () => {
		renderPage(["/inquiries"], PROCUREMENT_INQUIRIES, {
			tariff_id: "start",
			tariff_name: "Старт",
			requests_used: 15,
			requests_limit: 15,
			employees_used: 1,
			employees_limit: 5,
			emails_sent: 0,
			emails_limit: 500,
		});
		await screen.findByTestId("procurement-inquiry-row-T-001");

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Создать запрос/ }));

		expect(screen.queryByRole("heading", { name: "Создать запрос" })).not.toBeInTheDocument();
		await waitFor(() => {
			expect(toastErrorSpy).toHaveBeenCalledWith(
				"Достигнут лимит запросов. Перейдите на другой тариф или докупите запросы отдельно",
			);
		});
	});
});
