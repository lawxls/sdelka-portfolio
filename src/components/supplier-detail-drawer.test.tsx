import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
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
			aiDescription: "Надёжный поставщик с конкурентными ценами.",
			aiRecommendations: "Рекомендуется для долгосрочного сотрудничества.",
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
					sender: "Агент",
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
			<TooltipProvider>
				<SupplierDetailDrawer {...defaultProps} {...props} />
			</TooltipProvider>
		</QueryClientProvider>,
	);
}

describe("SupplierDetailDrawer", () => {
	test("renders company name and status inline", () => {
		renderDrawer();
		expect(screen.getAllByText("ООО «Альфа-Трейд»").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("Получено КП")).toBeInTheDocument();
		// Bullet separator between name and status
		expect(screen.getByText("·")).toBeInTheDocument();
	});

	test("renders address and website", () => {
		renderDrawer();
		expect(screen.getByText("г. Москва, ул. Промышленная, д. 15")).toBeInTheDocument();
		expect(screen.getByText("alfa-trade.ru")).toBeInTheDocument();
	});

	test("renders TCO section with correct labels", () => {
		renderDrawer();
		expect(screen.getByText("Расчёт TCO (Total Cost of Ownership)")).toBeInTheDocument();
		expect(screen.getByText("Цена за ед.")).toBeInTheDocument();
		expect(screen.getByText("Доставка")).toBeInTheDocument();
		expect(screen.getByText("Отсрочка")).toBeInTheDocument();
		expect(screen.getByText("TCO (итого)")).toBeInTheDocument();
	});

	test("renders deferral days", () => {
		renderDrawer();
		expect(screen.getByText(/30\s*дней/)).toBeInTheDocument();
	});

	test("does not render rating section", () => {
		renderDrawer();
		expect(screen.queryByText("Рейтинг")).not.toBeInTheDocument();
		expect(screen.queryByText("85%")).not.toBeInTheDocument();
	});

	test("renders agent comment with description and recommendations", () => {
		renderDrawer();
		expect(screen.getByText("Комментарии агента")).toBeInTheDocument();
		expect(screen.getByText("Описание")).toBeInTheDocument();
		expect(screen.getByText("Надёжный поставщик с конкурентными ценами.")).toBeInTheDocument();
		expect(screen.getByText("Рекомендации")).toBeInTheDocument();
		expect(screen.getByText("Рекомендуется для долгосрочного сотрудничества.")).toBeInTheDocument();
	});

	test("renders documents section with renamed title", () => {
		renderDrawer();
		expect(screen.getByText("Документы из диалога")).toBeInTheDocument();
		expect(screen.getByText("Коммерческое предложение.pdf")).toBeInTheDocument();
		expect(screen.getByText("Прайс-лист 2026.xlsx")).toBeInTheDocument();
		expect(screen.getByText("239 КБ")).toBeInTheDocument();
		expect(screen.getByText("87 КБ")).toBeInTheDocument();
	});

	test("renders email-style history with sender and timestamp", () => {
		renderDrawer();
		expect(screen.getByText("История общения")).toBeInTheDocument();
		expect(screen.getByText("Добрый день! Просим направить КП.")).toBeInTheDocument();
		expect(screen.getByText("Здравствуйте! КП направлено.")).toBeInTheDocument();
		// Sender names in email headers
		expect(screen.getByText("Агент")).toBeInTheDocument();
		const theirEmail = screen.getByText("Здравствуйте! КП направлено.").closest("[data-email-msg]") as HTMLElement;
		expect(within(theirEmail).getByText("ООО «Альфа-Трейд»")).toBeInTheDocument();
	});

	test("email messages use article elements with border styling", () => {
		renderDrawer();
		const ourMsg = screen.getByText("Добрый день! Просим направить КП.").closest("[data-email-msg]") as HTMLElement;
		const theirMsg = screen.getByText("Здравствуйте! КП направлено.").closest("[data-email-msg]") as HTMLElement;
		expect(ourMsg.tagName).toBe("ARTICLE");
		expect(theirMsg.tagName).toBe("ARTICLE");
		expect(ourMsg).toHaveAttribute("data-email-msg", "ours");
		expect(theirMsg).toHaveAttribute("data-email-msg", "theirs");
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

	test("renders empty documents gracefully", () => {
		renderDrawer({
			supplier: makeSupplier("s3", {
				companyName: "ООО «Гамма»",
				documents: [],
			}),
		});
		expect(screen.queryByText("Документы из диалога")).not.toBeInTheDocument();
	});

	test("renders empty chat history gracefully", () => {
		renderDrawer({
			supplier: makeSupplier("s4", {
				companyName: "ООО «Дельта»",
				chatHistory: [],
			}),
		});
		expect(screen.queryByText("История общения")).not.toBeInTheDocument();
	});
});
