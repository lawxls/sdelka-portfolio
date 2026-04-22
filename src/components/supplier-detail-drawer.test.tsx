import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { _resetSupplierStore, _setSupplierMockDelay, getAllSuppliers } from "@/data/supplier-mock-data";
import { makeSupplier } from "@/test-utils";

const mockIsMobile = vi.hoisted(() => ({ value: false }));
vi.mock("@/hooks/use-is-mobile", () => ({
	useIsMobile: () => mockIsMobile.value,
}));

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
			email: "info@alfa-trade.ru",
			status: "получено_кп",
			pricePerUnit: 1200,
			deliveryCost: 1500,
			tco: 2700,
			deferralDays: 30,
			rating: 85,
			agentComment: "Надёжный поставщик с конкурентными ценами.\n\nРекомендуется для долгосрочного сотрудничества.",
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
		activeTab: "info",
		onTabChange: vi.fn(),
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
	test("header shows only the company name (no status)", () => {
		renderDrawer();
		expect(screen.getAllByText("ООО «Альфа-Трейд»").length).toBeGreaterThanOrEqual(1);
		// Status is no longer shown in the header
		expect(screen.queryByText("Получено КП")).not.toBeInTheDocument();
		// Bullet-separator between name and status is gone
		expect(screen.queryByText("·")).not.toBeInTheDocument();
	});

	test("Информация tab shows profile fields from Поставщики table", () => {
		renderDrawer();
		const infoCol = document.querySelector("[data-testid='supplier-info-column']") as HTMLElement;
		expect(within(infoCol).getByText("ИНН")).toBeInTheDocument();
		expect(within(infoCol).getByText("Тип")).toBeInTheDocument();
		expect(within(infoCol).getByText("Регион")).toBeInTheDocument();
		expect(within(infoCol).getByText("Выручка")).toBeInTheDocument();
		expect(within(infoCol).getByText("Год основания компании")).toBeInTheDocument();
		expect(within(infoCol).queryByText("Возраст")).not.toBeInTheDocument();
	});

	test("Информация tab shows contact info", () => {
		renderDrawer();
		const infoCol = document.querySelector("[data-testid='supplier-info-column']") as HTMLElement;
		expect(within(infoCol).getByText("г. Москва, ул. Промышленная, д. 15")).toBeInTheDocument();
		expect(within(infoCol).getByText("alfa-trade.ru")).toBeInTheDocument();
		expect(within(infoCol).getByText("info@alfa-trade.ru")).toBeInTheDocument();
	});

	test("Информация tab shows merged agent comment (no Описание/Рекомендации labels)", () => {
		renderDrawer();
		expect(screen.getByText("Комментарий агента")).toBeInTheDocument();
		expect(screen.queryByText("Описание")).not.toBeInTheDocument();
		expect(screen.queryByText("Рекомендации")).not.toBeInTheDocument();
		expect(screen.getByText(/Надёжный поставщик с конкурентными ценами/)).toBeInTheDocument();
	});

	test("Информация tab shows general documents section", () => {
		renderDrawer();
		expect(screen.getByText("Документы из диалога")).toBeInTheDocument();
		expect(screen.getByText("Коммерческое предложение.pdf")).toBeInTheDocument();
		expect(screen.getByText("Прайс-лист 2026.xlsx")).toBeInTheDocument();
	});

	test("chat column is titled «Переписка» (renamed from «История общения»)", () => {
		renderDrawer();
		const rightCol = document.querySelector("[data-testid='supplier-email-column']") as HTMLElement;
		expect(within(rightCol).getByText("Переписка")).toBeInTheDocument();
		expect(screen.queryByText("История общения")).not.toBeInTheDocument();
	});

	test("email thread renders with sender and timestamp", () => {
		renderDrawer();
		expect(screen.getByText("Добрый день! Просим направить КП.")).toBeInTheDocument();
		expect(screen.getByText("Здравствуйте! КП направлено.")).toBeInTheDocument();
		expect(screen.getByText("Агент")).toBeInTheDocument();
	});

	test("email messages use article elements with data-email-msg attribute", () => {
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

	test("uses xl size on desktop", () => {
		renderDrawer();
		const content = document.querySelector('[data-slot="sheet-content"]');
		expect(content?.getAttribute("data-size")).toBe("xl");
	});

	test("renders two-column grid layout on desktop", () => {
		renderDrawer();
		const grid = document.querySelector("[data-testid='supplier-columns']");
		expect(grid?.className).toMatch(/grid-cols-2/);
	});

	describe("tabs on the info column", () => {
		test("renders Информация and Предложения tabs", () => {
			renderDrawer();
			const infoCol = document.querySelector("[data-testid='supplier-info-column']") as HTMLElement;
			const tablist = within(infoCol).getByRole("tablist");
			expect(within(tablist).getByRole("tab", { name: "Информация" })).toBeInTheDocument();
			expect(within(tablist).getByRole("tab", { name: "Предложения" })).toBeInTheDocument();
		});

		test("Информация tab is selected when activeTab='info'", () => {
			renderDrawer({ activeTab: "info" });
			expect(screen.getByRole("tab", { name: "Информация" })).toHaveAttribute("aria-selected", "true");
			expect(screen.getByRole("tab", { name: "Предложения" })).toHaveAttribute("aria-selected", "false");
		});

		test("Предложения tab is selected when activeTab='offers'", () => {
			renderDrawer({ activeTab: "offers" });
			expect(screen.getByRole("tab", { name: "Предложения" })).toHaveAttribute("aria-selected", "true");
			expect(screen.getByRole("tab", { name: "Информация" })).toHaveAttribute("aria-selected", "false");
		});

		test("clicking a tab fires onTabChange", async () => {
			const user = userEvent.setup();
			const onTabChange = vi.fn();
			renderDrawer({ activeTab: "info", onTabChange });
			await user.click(screen.getByRole("tab", { name: "Предложения" }));
			expect(onTabChange).toHaveBeenCalledWith("offers");
		});
	});

	describe("Предложения tab", () => {
		test("renders empty state when supplier has no получено_кп quotes anywhere", async () => {
			renderDrawer({
				supplier: makeSupplier("s1", {
					// An INN with no matching seeds → zero cross-item quotes
					inn: "9999999999",
					status: "кп_запрошено",
				}),
				activeTab: "offers",
			});
			await waitFor(() => expect(screen.getByTestId("offers-empty")).toBeInTheDocument());
			expect(screen.getByText(/Пока нет коммерческих предложений/)).toBeInTheDocument();
		});

		test("card title is clickable and fires onNavigateToItem with target itemId", async () => {
			const user = userEvent.setup();
			const onNavigateToItem = vi.fn();
			// Use a real enriched supplier so its INN lines up with the seed join in
			// getSupplierQuotesByInn — hand-rolling an INN would miss the hash scheme.
			const { suppliers } = await getAllSuppliers("item-1");
			const kp = suppliers.find((s) => s.status === "получено_кп" && !s.archived);
			if (!kp) throw new Error("Expected at least one получено_кп supplier on item-1");
			renderDrawer({ supplier: kp, activeTab: "offers", onNavigateToItem });
			const title = await screen.findByTestId("offer-card-title-item-1");
			await user.click(title);
			expect(onNavigateToItem).toHaveBeenCalledWith("item-1");
		});
	});

	describe("header has no per-supplier toolbar actions", () => {
		test("does not render Выбрать поставщика button", () => {
			renderDrawer();
			expect(screen.queryByRole("button", { name: "Выбрать поставщика" })).not.toBeInTheDocument();
		});

		test("does not render Архивировать button", () => {
			renderDrawer();
			expect(screen.queryByRole("button", { name: "Архивировать" })).not.toBeInTheDocument();
		});
	});

	describe("mobile tabbed layout", () => {
		beforeEach(() => {
			mockIsMobile.value = true;
		});

		afterEach(() => {
			mockIsMobile.value = false;
		});

		test("renders three tabs: Информация, Предложения, Переписка", () => {
			renderDrawer();
			const tablist = screen.getByRole("tablist");
			expect(within(tablist).getByRole("tab", { name: "Информация" })).toBeInTheDocument();
			expect(within(tablist).getByRole("tab", { name: "Предложения" })).toBeInTheDocument();
			expect(within(tablist).getByRole("tab", { name: "Переписка" })).toBeInTheDocument();
		});

		test("switching to chat tab renders the thread", async () => {
			const user = userEvent.setup();
			const onTabChange = vi.fn();
			const { rerender } = renderDrawer({ activeTab: "info", onTabChange });
			await user.click(screen.getByRole("tab", { name: "Переписка" }));
			expect(onTabChange).toHaveBeenCalledWith("chat");

			// Simulate the URL-driven rerender with the new tab
			rerender(
				<QueryClientProvider client={queryClient}>
					<TooltipProvider>
						<SupplierDetailDrawer
							supplier={makeSupplier("s1", {
								companyName: "ООО «Альфа-Трейд»",
								chatHistory: [
									{ sender: "Агент", timestamp: "2026-02-20T10:00:00.000Z", body: "Добрый день", isOurs: true },
								],
							})}
							open
							onClose={vi.fn()}
							activeTab="chat"
							onTabChange={onTabChange}
						/>
					</TooltipProvider>
				</QueryClientProvider>,
			);
			expect(screen.getByText("Добрый день")).toBeInTheDocument();
		});

		test("composer visible on chat tab for composable status", async () => {
			renderDrawer({
				activeTab: "chat",
				supplier: makeSupplier("s1", {
					status: "кп_запрошено",
					chatHistory: [{ sender: "Агент", timestamp: "2026-02-20T10:00:00.000Z", body: "Тест", isOurs: true }],
				}),
			});
			expect(screen.getByRole("textbox")).toBeInTheDocument();
		});
	});

	describe("inline attachments on thread messages", () => {
		test("renders attachment chips with name and size when message has attachments", () => {
			renderDrawer({
				supplier: makeSupplier("s1", {
					chatHistory: [
						{
							sender: "ООО «Альфа-Трейд»",
							timestamp: "2026-02-22T14:30:00.000Z",
							body: "КП во вложении.",
							isOurs: false,
							attachments: [
								{ name: "Коммерческое предложение.pdf", type: "pdf", size: 245_000 },
								{ name: "Прайс-лист.xlsx", type: "xlsx", size: 89_000 },
							],
						},
					],
				}),
			});
			expect(screen.getByText("Коммерческое предложение.pdf")).toBeInTheDocument();
			expect(screen.getByText("239 КБ")).toBeInTheDocument();
			expect(screen.getByText("Прайс-лист.xlsx")).toBeInTheDocument();
			expect(screen.getByText("87 КБ")).toBeInTheDocument();
		});
	});

	describe("ChatComposer visibility", () => {
		test("shows composer for кп_запрошено status", () => {
			renderDrawer({ supplier: makeSupplier("s1", { status: "кп_запрошено" }) });
			expect(screen.getByRole("textbox")).toBeInTheDocument();
		});

		test("shows composer for переговоры status", () => {
			renderDrawer({ supplier: makeSupplier("s1", { status: "переговоры" }) });
			expect(screen.getByRole("textbox")).toBeInTheDocument();
		});

		test("shows composer for получено_кп status", () => {
			renderDrawer({ supplier: makeSupplier("s1", { status: "получено_кп" }) });
			expect(screen.getByRole("textbox")).toBeInTheDocument();
		});

		test("hides composer for отказ status", () => {
			renderDrawer({ supplier: makeSupplier("s1", { status: "отказ" }) });
			expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		});

		test("shows disabled composer for new status (composer rendered but blocked)", () => {
			renderDrawer({ supplier: makeSupplier("s1", { status: "new" }) });
			const textbox = screen.getByRole("textbox");
			expect(textbox).toBeDisabled();
		});
	});

	describe("Кандидат chat prompt", () => {
		test("shows prompt and Отправить запрос button when status is new", () => {
			renderDrawer({ supplier: makeSupplier("s1", { status: "new" }) });
			expect(screen.getByTestId("candidate-chat-prompt")).toHaveTextContent(
				/Запросите КП, чтобы начать общение с поставщиком/,
			);
			expect(screen.getByTestId("candidate-send-request")).toHaveTextContent("Отправить запрос");
		});

		test("hides prompt for non-candidate statuses", () => {
			renderDrawer({ supplier: makeSupplier("s1", { status: "кп_запрошено" }) });
			expect(screen.queryByTestId("candidate-chat-prompt")).not.toBeInTheDocument();
		});

		test("does not render the email thread while the prompt is active", () => {
			renderDrawer({
				supplier: makeSupplier("s1", {
					status: "new",
					// Even if a chatHistory entry existed, the prompt replaces the thread for candidates.
					chatHistory: [
						{ sender: "Агент", timestamp: "2026-02-20T10:00:00.000Z", body: "should not render", isOurs: true },
					],
				}),
			});
			expect(screen.queryByText("should not render")).not.toBeInTheDocument();
		});
	});

	describe("message sender metadata", () => {
		test("shows agent email next to «Агент» sender", () => {
			renderDrawer({
				supplier: makeSupplier("s1", {
					chatHistory: [
						{
							sender: "Агент",
							senderEmail: "agent@sdelka.ru",
							timestamp: "2026-02-20T10:00:00.000Z",
							body: "Добрый день",
							isOurs: true,
						},
					],
				}),
			});
			const article = screen.getByText("Добрый день").closest("[data-email-msg]") as HTMLElement;
			expect(within(article).getByText("Агент")).toBeInTheDocument();
			expect(within(article).getByText("agent@sdelka.ru")).toBeInTheDocument();
		});

		test("shows supplier email next to supplier name", () => {
			renderDrawer({
				supplier: makeSupplier("s1", {
					companyName: "ООО «Альфа-Трейд»",
					email: "sales@alfa.ru",
					chatHistory: [
						{
							sender: "ООО «Альфа-Трейд»",
							senderEmail: "sales@alfa.ru",
							timestamp: "2026-02-22T14:30:00.000Z",
							body: "Добрый день!",
							isOurs: false,
						},
					],
				}),
			});
			const article = screen.getByText("Добрый день!").closest("[data-email-msg]") as HTMLElement;
			expect(within(article).getByText("sales@alfa.ru")).toBeInTheDocument();
		});
	});

	describe("event badges on supplier messages", () => {
		test("renders «Получено КП» badge when event is set", () => {
			renderDrawer({
				supplier: makeSupplier("s1", {
					chatHistory: [
						{
							sender: "ООО «Альфа»",
							timestamp: "2026-02-22T14:30:00.000Z",
							body: "КП направлено.",
							isOurs: false,
							events: ["quote_received"],
						},
					],
				}),
			});
			expect(screen.getByTestId("msg-event-quote_received")).toHaveTextContent("Получено КП");
		});

		test("renders «Создана задача» badge for task_created event", () => {
			renderDrawer({
				supplier: makeSupplier("s1", {
					chatHistory: [
						{
							sender: "ООО «Альфа»",
							timestamp: "2026-02-22T14:30:00.000Z",
							body: "Запрос.",
							isOurs: false,
							events: ["task_created"],
						},
					],
				}),
			});
			expect(screen.getByTestId("msg-event-task_created")).toHaveTextContent("Создана задача");
		});

		test("renders «Отказ» badge for refusal event", () => {
			renderDrawer({
				supplier: makeSupplier("s1", {
					chatHistory: [
						{
							sender: "ООО «Альфа»",
							timestamp: "2026-02-22T14:30:00.000Z",
							body: "Не готовы.",
							isOurs: false,
							events: ["refusal"],
						},
					],
				}),
			});
			expect(screen.getByTestId("msg-event-refusal")).toHaveTextContent("Отказ");
		});

		test("does not render badges on agent (our) messages even when events are set", () => {
			renderDrawer({
				supplier: makeSupplier("s1", {
					chatHistory: [
						{
							sender: "Агент",
							timestamp: "2026-02-20T10:00:00.000Z",
							body: "Тест",
							isOurs: true,
							events: ["quote_received"],
						},
					],
				}),
			});
			expect(screen.queryByTestId("msg-event-quote_received")).not.toBeInTheDocument();
		});
	});
});
