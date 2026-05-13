import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TariffsSettingsPage } from "./tariffs-settings-page";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

beforeEach(() => {
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("TariffsSettingsPage", () => {
	test("renders three paid tariff cards", () => {
		render(<TariffsSettingsPage />);
		expect(screen.getByRole("heading", { level: 3, name: "Старт" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { level: 3, name: "Бизнес" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { level: 3, name: "Корпорация" })).toBeInTheDocument();
	});

	test("«Популярный» badge appears only on Бизнес", () => {
		render(<TariffsSettingsPage />);
		const badges = screen.getAllByText("Популярный");
		expect(badges).toHaveLength(1);
		const businessCard = screen.getByTestId("tariff-business");
		expect(within(businessCard).getByText("Популярный")).toBeInTheDocument();
	});

	test("defaults to monthly with full prices visible", () => {
		render(<TariffsSettingsPage />);
		const startCard = screen.getByTestId("tariff-start");
		const businessCard = screen.getByTestId("tariff-business");
		expect(within(startCard).getByText(/19\s900/)).toBeInTheDocument();
		expect(within(businessCard).getByText(/49\s900/)).toBeInTheDocument();
		expect(screen.queryByText(/единоразово/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/экономия/i)).not.toBeInTheDocument();
		expect(screen.getAllByText("Оплата помесячно").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Отмена в любой момент").length).toBeGreaterThan(0);
	});

	test("switching to «Годовая» shows monthly equivalent, lump sum and savings", async () => {
		const user = userEvent.setup();
		render(<TariffsSettingsPage />);
		await user.click(screen.getByRole("button", { name: "Годовая" }));

		const startCard = screen.getByTestId("tariff-start");
		const businessCard = screen.getByTestId("tariff-business");

		expect(within(startCard).getByText(/16\s658/)).toBeInTheDocument();
		expect(within(businessCard).getByText(/41\s658/)).toBeInTheDocument();
		expect(within(startCard).getByText(/199\s900.*единоразово/i)).toBeInTheDocument();
		expect(within(businessCard).getByText(/499\s900.*единоразово/i)).toBeInTheDocument();
		expect(within(startCard).getByText(/Экономия/i)).toBeInTheDocument();
		expect(within(startCard).getByText(/38\s900/)).toBeInTheDocument();
		expect(within(businessCard).getByText(/98\s900/)).toBeInTheDocument();
	});

	test("Корпорация shows «Под задачу» on both periods", async () => {
		const user = userEvent.setup();
		render(<TariffsSettingsPage />);
		const corporateCard = screen.getByTestId("tariff-corporate");
		expect(within(corporateCard).getByText("Под задачу")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Годовая" }));
		expect(within(corporateCard).getByText("Под задачу")).toBeInTheDocument();
	});

	test("renders top-up panel with three per-inquiry rates", () => {
		render(<TariffsSettingsPage />);
		const panel = screen.getByTestId("top-up-panel");
		expect(within(panel).getByText(/4\s900/)).toBeInTheDocument();
		expect(within(panel).getByText(/3\s900/)).toBeInTheDocument();
		expect(within(panel).getByText(/2\s900/)).toBeInTheDocument();
	});

	test("clicking Бизнес CTA fires success toast", async () => {
		const user = userEvent.setup();
		render(<TariffsSettingsPage />);
		const businessCard = screen.getByTestId("tariff-business");
		await user.click(within(businessCard).getByRole("button", { name: /Подключить/ }));
		expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Запрос отправлен"));
	});

	test("limit box shows monthly inquiry limit per tier", () => {
		render(<TariffsSettingsPage />);
		const startCard = screen.getByTestId("tariff-start");
		const businessCard = screen.getByTestId("tariff-business");
		expect(within(startCard).getByText(/5 запросов в месяц/i)).toBeInTheDocument();
		expect(within(businessCard).getByText(/15 запросов в месяц/i)).toBeInTheDocument();
	});

	test("yearly mode switches limit to annual count and adds «+N в подарок» bonus", async () => {
		const user = userEvent.setup();
		render(<TariffsSettingsPage />);

		expect(screen.queryByText(/\+5 в подарок/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/\+20 в подарок/i)).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Годовая" }));

		const startCard = screen.getByTestId("tariff-start");
		const businessCard = screen.getByTestId("tariff-business");
		const corporateCard = screen.getByTestId("tariff-corporate");
		expect(within(startCard).getByText(/65 запросов в год/i)).toBeInTheDocument();
		expect(within(businessCard).getByText(/200 запросов в год/i)).toBeInTheDocument();
		expect(within(startCard).getByText(/\+5 в подарок/i)).toBeInTheDocument();
		expect(within(businessCard).getByText(/\+20 в подарок/i)).toBeInTheDocument();
		expect(within(corporateCard).queryByText(/в подарок/i)).not.toBeInTheDocument();
		expect(within(corporateCard).queryByText(/лимит запросов/i)).not.toBeInTheDocument();
	});
});
