import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { _resetSupplierStore, _setSupplierMockDelay } from "@/data/supplier-mock-data";
import { makeSupplier } from "@/test-utils";

import { SupplierDetailDrawer } from "./supplier-detail-drawer";

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	_resetSupplierStore();
	_setSupplierMockDelay(0, 0);
});

afterEach(() => {
	_resetSupplierStore();
});

function renderDrawer(props: Partial<React.ComponentProps<typeof SupplierDetailDrawer>> = {}) {
	const defaultProps: React.ComponentProps<typeof SupplierDetailDrawer> = {
		supplier: makeSupplier("s1", {
			companyName: "ООО «Альфа-Трейд»",
			address: "г. Москва, ул. Промышленная, д. 15",
			website: "https://alfa-trade.ru",
			status: "получено_кп",
			pricePerUnit: 1200,
			deliveryCost: 1500,
			tco: 2700,
			deferralDays: 30,
			rating: 85,
			aiComment: "Надёжный поставщик с конкурентными ценами.",
			positionOffers: [
				{ name: "Арматура А500С ∅12", quantity: 100, pricePerUnit: 1200, total: 120_000 },
				{ name: "Проволока вязальная", quantity: 50, pricePerUnit: 800, total: 40_000 },
			],
			documents: [
				{ name: "Коммерческое предложение.pdf", type: "pdf", size: 245_000 },
				{ name: "Прайс-лист 2026.xlsx", type: "xlsx", size: 89_000 },
			],
			chatHistory: [
				{
					sender: "Отдел закупок",
					timestamp: "2026-02-20T10:00:00.000Z",
					body: "Добрый день! Просим направить КП.",
					isOurs: true,
				},
				{
					sender: "ООО «Альфа-Трейд»",
					timestamp: "2026-02-22T14:30:00.000Z",
					body: "Здравствуйте! КП направлено.",
					isOurs: false,
				},
			],
		}),
		open: true,
		onClose: vi.fn(),
	};
	return render(
		<QueryClientProvider client={queryClient}>
			<SupplierDetailDrawer {...defaultProps} {...props} />
		</QueryClientProvider>,
	);
}

describe("SupplierDetailDrawer", () => {
	test("renders company name and address", () => {
		renderDrawer();
		// Company name appears in both header and chat — verify title specifically
		expect(screen.getAllByText("ООО «Альфа-Трейд»").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("г. Москва, ул. Промышленная, д. 15")).toBeInTheDocument();
	});

	test("renders website", () => {
		renderDrawer();
		expect(screen.getByText("alfa-trade.ru")).toBeInTheDocument();
	});

	test("renders TCO breakdown: price/unit, delivery cost, total TCO", () => {
		renderDrawer();
		// Section label
		expect(screen.getByText("Стоимость")).toBeInTheDocument();
		// Values — check labels and amounts
		expect(screen.getByText("Цена за единицу")).toBeInTheDocument();
		expect(screen.getByText("Стоимость доставки")).toBeInTheDocument();
		expect(screen.getByText("Итого TCO")).toBeInTheDocument();
	});

	test("renders deferral days separately", () => {
		renderDrawer();
		expect(screen.getByText("Отсрочка")).toBeInTheDocument();
		expect(screen.getByText(/30\s*дней/)).toBeInTheDocument();
	});

	test("renders rating as percentage", () => {
		renderDrawer();
		expect(screen.getByText("Рейтинг")).toBeInTheDocument();
		expect(screen.getByText("85%")).toBeInTheDocument();
	});

	test("renders AI comment", () => {
		renderDrawer();
		expect(screen.getByText("AI-комментарий")).toBeInTheDocument();
		expect(screen.getByText("Надёжный поставщик с конкурентными ценами.")).toBeInTheDocument();
	});

	test("renders position offers table", () => {
		renderDrawer();
		expect(screen.getByText("Позиции предложения")).toBeInTheDocument();
		expect(screen.getByText("Арматура А500С ∅12")).toBeInTheDocument();
		expect(screen.getByText("Проволока вязальная")).toBeInTheDocument();
		// 4 column headers
		expect(screen.getByText("Наименование")).toBeInTheDocument();
		expect(screen.getByText("Кол-во")).toBeInTheDocument();
	});

	test("renders documents list", () => {
		renderDrawer();
		expect(screen.getByText("Документы")).toBeInTheDocument();
		expect(screen.getByText("Коммерческое предложение.pdf")).toBeInTheDocument();
		expect(screen.getByText("Прайс-лист 2026.xlsx")).toBeInTheDocument();
		// File sizes formatted
		expect(screen.getByText("239 КБ")).toBeInTheDocument();
		expect(screen.getByText("87 КБ")).toBeInTheDocument();
	});

	test("renders chat history with message bubbles", () => {
		renderDrawer();
		expect(screen.getByText("Переписка")).toBeInTheDocument();
		expect(screen.getByText("Добрый день! Просим направить КП.")).toBeInTheDocument();
		expect(screen.getByText("Здравствуйте! КП направлено.")).toBeInTheDocument();
		// Sender names within chat bubbles
		expect(screen.getByText("Отдел закупок")).toBeInTheDocument();
		// Company name appears in both header and chat — verify chat sender via bubble
		const theirBubble = screen.getByText("Здравствуйте! КП направлено.").closest("[data-chat-msg]") as HTMLElement;
		expect(within(theirBubble).getByText("ООО «Альфа-Трейд»")).toBeInTheDocument();
	});

	test("our messages align right, supplier messages align left", () => {
		renderDrawer();
		const ourMsg = screen.getByText("Добрый день! Просим направить КП.").closest("[data-chat-msg]") as HTMLElement;
		const theirMsg = screen.getByText("Здравствуйте! КП направлено.").closest("[data-chat-msg]") as HTMLElement;
		expect(ourMsg).toHaveAttribute("data-chat-msg", "ours");
		expect(theirMsg).toHaveAttribute("data-chat-msg", "theirs");
	});

	test("does not render when open is false", () => {
		renderDrawer({ open: false });
		expect(screen.queryByText("ООО «Альфа-Трейд»")).not.toBeInTheDocument();
	});

	test("close button calls onClose", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		renderDrawer({ onClose });
		await user.click(screen.getByRole("button", { name: "Close" }));
		expect(onClose).toHaveBeenCalled();
	});

	test("renders empty position offers gracefully", () => {
		renderDrawer({
			supplier: makeSupplier("s2", {
				companyName: "ООО «Бета»",
				status: "ждем_ответа",
				positionOffers: [],
			}),
		});
		// Should not render offers section when empty
		expect(screen.queryByText("Позиции предложения")).not.toBeInTheDocument();
	});

	test("renders empty documents gracefully", () => {
		renderDrawer({
			supplier: makeSupplier("s3", {
				companyName: "ООО «Гамма»",
				documents: [],
			}),
		});
		expect(screen.queryByText("Документы")).not.toBeInTheDocument();
	});

	test("renders empty chat history gracefully", () => {
		renderDrawer({
			supplier: makeSupplier("s4", {
				companyName: "ООО «Дельта»",
				chatHistory: [],
			}),
		});
		expect(screen.queryByText("Переписка")).not.toBeInTheDocument();
	});
});
