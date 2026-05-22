import type { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createInMemorySubscriptionClient } from "@/data/clients/subscription-in-memory";
import type { TariffsClient } from "@/data/clients/tariffs-client";
import { createInMemoryTariffsClient } from "@/data/clients/tariffs-in-memory";
import type { Tariff } from "@/data/domains/tariffs";
import { _resetMockDelay, _setMockDelay } from "@/data/mock-utils";
import { fakeTariffsClient, TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient } from "@/test-utils";
import { TariffsSettingsPage } from "./tariffs-settings-page";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const SEED_TARIFFS: Tariff[] = [
	{
		id: "id-start",
		slug: "start",
		name: "Старт",
		shortDescription: "",
		fullDescription: "",
		priceType: "fixed",
		price: 19_900,
		yearlyPrice: 199_900,
		yearlyPriceDiscount: 16,
		monthlyInquiryLimit: 5,
		dailyInquiryLimit: null,
		inquiriesPerMonth: 5,
		inquiriesPerYear: 65,
		maxEmployees: 2,
		maxCompanies: 1,
		dailyEmailLimit: 300,
		isPopular: false,
		displayOrder: 10,
		features: [
			{ position: 1, name: "Поиск поставщиков" },
			{ position: 2, name: "Генерация и рассылка RFQ" },
		],
	},
	{
		id: "id-business",
		slug: "business",
		name: "Бизнес",
		shortDescription: "",
		fullDescription: "",
		priceType: "fixed",
		price: 49_900,
		yearlyPrice: 499_900,
		yearlyPriceDiscount: 16,
		monthlyInquiryLimit: 15,
		dailyInquiryLimit: null,
		inquiriesPerMonth: 15,
		inquiriesPerYear: 200,
		maxEmployees: 5,
		maxCompanies: 3,
		dailyEmailLimit: 700,
		isPopular: true,
		displayOrder: 20,
		features: [{ position: 1, name: "Всё из тарифа Старт" }],
	},
	{
		id: "id-enterprise",
		slug: "enterprise",
		name: "Корпорация",
		shortDescription: "Стоимость и лимиты под объём вашей закупочной функции",
		fullDescription: "",
		priceType: "individual",
		price: null,
		yearlyPrice: null,
		yearlyPriceDiscount: 0,
		monthlyInquiryLimit: null,
		dailyInquiryLimit: null,
		inquiriesPerMonth: null,
		inquiriesPerYear: null,
		maxEmployees: null,
		maxCompanies: null,
		dailyEmailLimit: null,
		isPopular: false,
		displayOrder: 30,
		features: [{ position: 1, name: "Индивидуальные лимиты" }],
	},
];

let queryClient: QueryClient;

function renderWithClient(client: TariffsClient): void {
	function Wrapper({ children }: { children: ReactNode }) {
		return (
			<TestClientsProvider
				queryClient={queryClient}
				clients={{
					tariffs: client,
					subscription: createInMemorySubscriptionClient({
						subscription: {
							tariff_id: "none",
							tariff_name: "Без подписки",
							requests_used: 0,
							requests_limit: 0,
							employees_used: 0,
							employees_limit: 0,
							emails_sent: 0,
							emails_limit: 0,
						},
					}),
				}}
			>
				{children}
			</TestClientsProvider>
		);
	}
	render(<TariffsSettingsPage />, { wrapper: Wrapper });
}

async function renderLoaded(): Promise<void> {
	renderWithClient(createInMemoryTariffsClient({ tariffs: SEED_TARIFFS }));
	await waitFor(() => expect(screen.getByRole("heading", { level: 3, name: "Старт" })).toBeInTheDocument());
}

beforeEach(() => {
	queryClient = createTestQueryClient();
	_setMockDelay(0, 0);
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	_resetMockDelay();
});

describe("TariffsSettingsPage", () => {
	test("shows skeleton while tariffs are loading", () => {
		const pending = new Promise<Tariff[]>(() => {});
		renderWithClient(fakeTariffsClient({ list: () => pending }));
		expect(screen.getByTestId("tariffs-skeleton")).toBeInTheDocument();
	});

	test("renders a card per tariff returned by the API", async () => {
		await renderLoaded();
		expect(screen.getByRole("heading", { level: 3, name: "Старт" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { level: 3, name: "Бизнес" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { level: 3, name: "Корпорация" })).toBeInTheDocument();
	});

	test("«Популярный» badge appears only on the isPopular tariff", async () => {
		await renderLoaded();
		const badges = screen.getAllByText("Популярный");
		expect(badges).toHaveLength(1);
		const businessCard = screen.getByTestId("tariff-business");
		expect(within(businessCard).getByText("Популярный")).toBeInTheDocument();
	});

	test("defaults to monthly with full prices visible", async () => {
		await renderLoaded();
		const startCard = screen.getByTestId("tariff-start");
		const businessCard = screen.getByTestId("tariff-business");
		expect(within(startCard).getByText(/19\s900/)).toBeInTheDocument();
		expect(within(businessCard).getByText(/49\s900/)).toBeInTheDocument();
		expect(screen.queryByText(/за год/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/экономия/i)).not.toBeInTheDocument();
		expect(screen.getAllByText("Оплата помесячно").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Отмена в любой момент").length).toBeGreaterThan(0);
	});

	test("switching to «Годовая» uses yearlyPrice directly and shows /мес, total and savings", async () => {
		await renderLoaded();
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Годовая" }));

		const startCard = screen.getByTestId("tariff-start");
		const businessCard = screen.getByTestId("tariff-business");

		// start: yearlyPrice 199 900 → /мес floor(199900/12) = 16 658, savings 238 800 − 199 900 = 38 900
		expect(within(startCard).getByText(/16\s658/)).toBeInTheDocument();
		expect(within(startCard).getByText(/199\s900.*за\sгод/i)).toBeInTheDocument();
		expect(within(startCard).getByText(/Экономия/i)).toBeInTheDocument();
		expect(within(startCard).getByText(/38\s900/)).toBeInTheDocument();

		// business: yearlyPrice 499 900 → /мес 41 658, savings 598 800 − 499 900 = 98 900
		expect(within(businessCard).getByText(/41\s658/)).toBeInTheDocument();
		expect(within(businessCard).getByText(/499\s900.*за\sгод/i)).toBeInTheDocument();
		expect(within(businessCard).getByText(/98\s900/)).toBeInTheDocument();
	});

	test("falls back to discount math when yearlyPrice is null but price + discount are set", async () => {
		const seed: Tariff[] = [
			{
				...SEED_TARIFFS[0],
				id: "id-fallback",
				slug: "fallback",
				name: "Fallback",
				yearlyPrice: null,
				yearlyPriceDiscount: 20,
			},
		];
		renderWithClient(createInMemoryTariffsClient({ tariffs: seed }));
		await waitFor(() => expect(screen.getByRole("heading", { level: 3, name: "Fallback" })).toBeInTheDocument());
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Годовая" }));
		// 19 900 × 12 × 0.8 = 191 040 → /мес 15 920
		const card = screen.getByTestId("tariff-fallback");
		expect(within(card).getByText(/191\s040.*за\sгод/i)).toBeInTheDocument();
		expect(within(card).getByText(/15\s920/)).toBeInTheDocument();
	});

	test("yearly total uses «за год» (not «единоразово»)", async () => {
		await renderLoaded();
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Годовая" }));
		expect(screen.queryByText(/единоразово/i)).not.toBeInTheDocument();
	});

	test("individual-price tariffs show «Под задачу» in both periods", async () => {
		await renderLoaded();
		const user = userEvent.setup();
		const enterpriseCard = screen.getByTestId("tariff-enterprise");
		expect(within(enterpriseCard).getByText("Под задачу")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Годовая" }));
		expect(within(enterpriseCard).getByText("Под задачу")).toBeInTheDocument();
	});

	test("individual-price tariff renders shortDescription as the caption", async () => {
		await renderLoaded();
		const enterpriseCard = screen.getByTestId("tariff-enterprise");
		expect(
			within(enterpriseCard).getByText("Стоимость и лимиты под объём вашей закупочной функции"),
		).toBeInTheDocument();
	});

	test("renders top-up panel with three per-inquiry rates", async () => {
		await renderLoaded();
		const panel = screen.getByTestId("top-up-panel");
		expect(within(panel).getByText(/4\s900/)).toBeInTheDocument();
		expect(within(panel).getByText(/3\s900/)).toBeInTheDocument();
		expect(within(panel).getByText(/2\s900/)).toBeInTheDocument();
	});

	test("clicking the popular tariff CTA fires success toast", async () => {
		await renderLoaded();
		const user = userEvent.setup();
		const businessCard = screen.getByTestId("tariff-business");
		await user.click(within(businessCard).getByRole("button", { name: /Подключить/ }));
		expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Запрос отправлен"));
	});

	test("limit box reflects inquiriesPerMonth per tariff", async () => {
		await renderLoaded();
		const startCard = screen.getByTestId("tariff-start");
		const businessCard = screen.getByTestId("tariff-business");
		expect(within(startCard).getByText(/5 запросов в месяц/i)).toBeInTheDocument();
		expect(within(businessCard).getByText(/15 запросов в месяц/i)).toBeInTheDocument();
	});

	test("yearly view uses inquiriesPerYear directly (with bonus, not 12×) and hides limit for unlimited tariffs", async () => {
		await renderLoaded();
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Годовая" }));

		const startCard = screen.getByTestId("tariff-start");
		const businessCard = screen.getByTestId("tariff-business");
		const enterpriseCard = screen.getByTestId("tariff-enterprise");
		expect(within(startCard).getByText(/65 запросов в год/i)).toBeInTheDocument();
		expect(within(businessCard).getByText(/200 запросов в год/i)).toBeInTheDocument();
		expect(within(enterpriseCard).queryByText(/лимит запросов/i)).not.toBeInTheDocument();
	});

	test("renders feature list from the API for each tariff", async () => {
		await renderLoaded();
		const startCard = screen.getByTestId("tariff-start");
		expect(within(startCard).getByText("Поиск поставщиков")).toBeInTheDocument();
		expect(within(startCard).getByText("Генерация и рассылка RFQ")).toBeInTheDocument();
	});

	test("individual-price tariff uses «Запросить расчёт» CTA", async () => {
		await renderLoaded();
		const enterpriseCard = screen.getByTestId("tariff-enterprise");
		expect(within(enterpriseCard).getByRole("button", { name: /Запросить расчёт/ })).toBeInTheDocument();
	});

	test("shows an error fallback with retry when the catalog fails to load", async () => {
		const list = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(SEED_TARIFFS);
		renderWithClient(fakeTariffsClient({ list }));

		await waitFor(() => expect(screen.getByText(/не удалось загрузить тарифы/i)).toBeInTheDocument());

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Повторить/ }));
		await waitFor(() => expect(screen.getByRole("heading", { level: 3, name: "Старт" })).toBeInTheDocument());
	});
});
