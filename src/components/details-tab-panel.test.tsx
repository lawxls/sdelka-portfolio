import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { _resetItemDetailStore, _setItemDetailMockDelay } from "@/data/item-detail-mock-data";

import { DetailsTabPanel } from "./details-tab-panel";

let queryClient: QueryClient;

function renderPanel(itemId = "item-1") {
	return render(
		<QueryClientProvider client={queryClient}>
			<DetailsTabPanel itemId={itemId} />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	_resetItemDetailStore();
	_setItemDetailMockDelay(0, 0);
});

afterEach(() => {
	_resetItemDetailStore();
});

describe("DetailsTabPanel", () => {
	test("renders five sections in the required order", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
		expect(headings).toEqual([
			"Основное",
			"Логистика и финансы",
			"Дополнительно",
			"Текущий поставщик",
			"Ответы на уточнения",
		]);
	});

	test("renders read-only cards with item values", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		// item-1 values render as card values
		expect(screen.getByText("Арматура А500С ∅12")).toBeInTheDocument();
		expect(screen.getByText("1200")).toBeInTheDocument();
		// Current supplier name in Текущий поставщик section
		expect(screen.getByText("МеталлТрейд")).toBeInTheDocument();
		// No save button in read-only mode
		expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
	});

	test("shows section-level edit buttons for the four editable sections", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		expect(screen.getByRole("button", { name: "Редактировать основную информацию" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Редактировать логистику и финансы" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Редактировать дополнительно" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Редактировать текущего поставщика" })).toBeInTheDocument();

		const editButtons = screen.getAllByRole("button", { name: /Редактировать/ });
		expect(editButtons).toHaveLength(4);
	});

	test("shows loading skeleton while fetching", () => {
		_setItemDetailMockDelay(10000, 10000);
		renderPanel();
		expect(screen.getByTestId("details-loading")).toBeInTheDocument();
	});

	test("shows error state for unknown item ID", async () => {
		renderPanel("nonexistent-item");
		await waitFor(() => {
			expect(screen.getByTestId("details-error")).toBeInTheDocument();
		});
		expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument();
	});

	test("editing Основное toggles every card in the section into edit mode", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

		// Every editable field in the section is now an input
		expect(screen.getByLabelText("Название")).toHaveValue("Арматура А500С ∅12");
		expect(screen.getByLabelText("Описание")).toBeInTheDocument();
		expect(screen.getByLabelText("Кол-во в поставке")).toHaveValue(100);
		expect(screen.getByLabelText("Объём в год")).toHaveValue(1200);
		expect(screen.getByLabelText("Ед. изм.")).toHaveTextContent("т");

		expect(screen.getByRole("button", { name: "Сохранить" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
	});

	test("editing Логистика и финансы exposes Разгрузка and Оплата controls", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Логистика и финансы")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать логистику и финансы" }));

		// item-1 has paymentType: "deferred", unloading: "supplier"
		expect(screen.getByRole("button", { name: "Отсрочка" })).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByRole("button", { name: "Силами поставщика" })).toHaveAttribute("aria-pressed", "true");
		// Payment control exposes all three variants
		expect(screen.getByRole("button", { name: "Предоплата" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Предоплата 30/70" })).toBeInTheDocument();
	});

	test("editing Дополнительно exposes the three flag checkboxes + Комментарий", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Дополнительно")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать дополнительно" }));

		expect(screen.getByLabelText("Комментарий")).toHaveValue("Требуется сертификат соответствия ГОСТ");
		// Three checkboxes present
		expect(screen.getByRole("checkbox", { name: /отсрочка нужна/i })).toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: /нужен образец/i })).toBeInTheDocument();
		// item-1 has analoguesAllowed: true
		const analogues = screen.getByRole("checkbox", { name: /допускаются аналоги/i });
		expect(analogues).toBeChecked();
	});

	test("editing Текущий поставщик exposes name, INN, price, payment and delivery", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Текущий поставщик")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать текущего поставщика" }));

		expect(screen.getByLabelText("Название поставщика")).toHaveValue("МеталлТрейд");
		expect(screen.getByLabelText("ИНН поставщика")).toHaveValue("7701234567");
		expect(screen.getByLabelText("Цена поставщика")).toHaveValue(4500);
		// item-1: paymentType: "deferred" → Дней отсрочки input visible
		expect(screen.getByLabelText("Дней отсрочки")).toHaveValue(30);
		expect(screen.getByLabelText("Тип доставки")).toHaveTextContent("Бесплатная");
	});

	test("saving Основное section persists new name and returns to read-only", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

		const nameInput = screen.getByLabelText("Название");
		await user.clear(nameInput);
		await user.type(nameInput, "Новое название");

		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(screen.getByText("Новое название")).toBeInTheDocument();
		});
		expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
	});

	test("cancel reverts section to read-only without saving", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));
		expect(screen.getByLabelText("Название")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.queryByLabelText("Название")).not.toBeInTheDocument();
		expect(screen.getByText("Арматура А500С ∅12")).toBeInTheDocument();
	});

	test("complex fields render as display-only placeholder cards", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		// Категория placeholder — folder-metal → "Металлопрокат"
		expect(screen.getByText("Категория")).toBeInTheDocument();
		// Адреса доставки placeholder inside Логистика и финансы section
		expect(screen.getByText("Адреса доставки")).toBeInTheDocument();
		expect(screen.getByText("г. Москва, ул. Складская, д. 15")).toBeInTheDocument();
		// Файлы placeholder (no file-editing in this slice)
		expect(screen.getByText("Файлы")).toBeInTheDocument();
	});

	test("Ответы на уточнения section renders as an empty placeholder for now", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Ответы на уточнения")).toBeInTheDocument();
		});

		const headings = screen.getAllByRole("heading", { level: 3 });
		const answersHeader = headings.find((h) => h.textContent === "Ответы на уточнения");
		expect(answersHeader).toBeDefined();
		// No edit button on the answers section (display-only stub for #232)
		const section = answersHeader?.closest("section");
		expect(section).not.toBeNull();
		expect(within(section as HTMLElement).queryByRole("button", { name: /редактировать/i })).toBeNull();
	});

	test("Текущий поставщик: toggling Оплата to Предоплата hides Дней отсрочки", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Текущий поставщик")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать текущего поставщика" }));

		const supplierSection = screen.getByText("Текущий поставщик").closest("section") as HTMLElement;
		const prepayBtn = within(supplierSection).getByRole("button", { name: "Предоплата" });
		await user.click(prepayBtn);

		expect(screen.queryByLabelText("Дней отсрочки")).not.toBeInTheDocument();
	});
});
