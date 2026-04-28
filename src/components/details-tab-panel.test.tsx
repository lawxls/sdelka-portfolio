import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { createInMemoryFoldersClient } from "@/data/clients/folders-in-memory";
import { createInMemoryItemsClient } from "@/data/clients/items-in-memory";
import { _setMockDelay } from "@/data/mock-utils";
import { SEED_ITEMS } from "@/data/seeds/items";
import { TestClientsProvider } from "@/data/test-clients-provider";

import { DetailsTabPanel } from "./details-tab-panel";

let queryClient: QueryClient;

function renderPanel(itemId = "item-1") {
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: createInMemoryCompaniesClient(),
				items: createInMemoryItemsClient({ seed: SEED_ITEMS }),
				folders: createInMemoryFoldersClient(),
			}}
		>
			<DetailsTabPanel itemId={itemId} />
		</TestClientsProvider>,
	);
}

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	_setMockDelay(0, 0);
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
			"Ваш поставщик",
			"Ответы на уточнения",
		]);
	});

	test("renders read-only cards with item values", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		// item-1 values render as card values
		expect(screen.getByText("Полотно ПВД 2600 мм")).toBeInTheDocument();
		expect(screen.getByText("180000")).toBeInTheDocument();
		// Current supplier name in Ваш поставщик section
		expect(screen.getByText("ПолимерПром")).toBeInTheDocument();
		// No save button in read-only mode
		expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
	});

	test("shows section-level edit buttons for all editable sections", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		expect(screen.getByRole("button", { name: "Редактировать основную информацию" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Редактировать логистику и финансы" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Редактировать дополнительно" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Редактировать текущего поставщика" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Редактировать ответы на уточнения" })).toBeInTheDocument();

		const editButtons = screen.getAllByRole("button", { name: /Редактировать/ });
		expect(editButtons).toHaveLength(5);
	});

	test("shows loading skeleton while fetching", () => {
		_setMockDelay(10000, 10000);
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
		expect(screen.getByLabelText("Название")).toHaveValue("Полотно ПВД 2600 мм");
		expect(screen.getByLabelText("Описание")).toBeInTheDocument();
		expect(screen.getByLabelText("Кол-во в поставке")).toHaveValue(15000);
		expect(screen.getByLabelText("Объём в год")).toHaveValue(180000);
		expect(screen.getByLabelText("Ед. изм.")).toHaveTextContent("м");

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

		// item-1 has paymentType: "prepayment", unloading: "supplier" — both as Select triggers
		expect(screen.getByRole("combobox", { name: "Разгрузка" })).toHaveTextContent("Силами поставщика");
		expect(screen.getByRole("combobox", { name: "Оплата" })).toHaveTextContent("Предоплата");
	});

	test("editing Дополнительно exposes the three flag checkboxes + Комментарий", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Дополнительно")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать дополнительно" }));

		expect(screen.getByLabelText("Комментарий")).toHaveValue(
			"Полотно ПВД первичка (без вторсырья), ширина 2600 мм, прозрачное.",
		);
		// Three checkboxes present
		expect(screen.getByRole("checkbox", { name: /отсрочка нужна/i })).toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: /нужен образец/i })).toBeInTheDocument();
		// item-1 has analoguesAllowed: true
		const analogues = screen.getByRole("checkbox", { name: /допускаются аналоги/i });
		expect(analogues).toBeChecked();
	});

	test("editing Ваш поставщик exposes name, INN, price, payment and delivery", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Ваш поставщик")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать текущего поставщика" }));

		expect(screen.getByLabelText("Название поставщика")).toHaveValue("ПолимерПром");
		expect(screen.getByLabelText("ИНН поставщика")).toHaveValue("6164012345");
		expect(screen.getByLabelText("Цена поставщика")).toHaveValue(1776);
		// item-1: paymentType: "prepayment" → Дней отсрочки input hidden
		expect(screen.queryByLabelText("Дней отсрочки")).not.toBeInTheDocument();
		expect(screen.getByLabelText("Тип доставки")).toHaveTextContent("Платная");
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
		expect(screen.getByText("Полотно ПВД 2600 мм")).toBeInTheDocument();
	});

	test("Основное edit exposes FolderSelect for Категория with current folder pre-selected", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

		// FolderSelect trigger exposes the Категория aria-label
		const folderTrigger = screen.getByRole("button", { name: "Категория" });
		// item-1.folderId = folder-packaging → "Упаковка"
		expect(folderTrigger).toHaveTextContent("Упаковка");
	});

	test("Логистика edit exposes address Select driven by company addresses", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Логистика и финансы")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать логистику и финансы" }));

		// Address Select trigger present; item-1's stored address does not exactly match any
		// company-1 address, so nothing is pre-selected — placeholder text surfaces
		expect(screen.getByRole("combobox", { name: "Адрес доставки" })).toHaveTextContent("Выберите адрес");

		await user.click(screen.getByRole("combobox", { name: "Адрес доставки" }));
		// Company-1 addresses show up in the listbox
		expect(screen.getByText(/г\. Москва, Ленинградское шоссе/)).toBeInTheDocument();
	});

	test("Дополнительно edit exposes file drop-zone and can remove an attached file", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Дополнительно")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать дополнительно" }));

		// Drop-zone + existing seeded file
		expect(screen.getByRole("button", { name: "Прикрепить файлы" })).toBeInTheDocument();
		expect(screen.getByText("specification-pvd-2600.pdf")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Удалить specification-pvd-2600.pdf" }));

		expect(screen.queryByText("specification-pvd-2600.pdf")).not.toBeInTheDocument();
	});

	test("Ответы на уточнения renders one card per generatedAnswer with an edit button", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Ответы на уточнения")).toBeInTheDocument();
		});

		// item-1 seed has two answers: material-grade + certificates
		expect(screen.getByText("Уточните марку / сорт материала")).toBeInTheDocument();
		expect(screen.getByText("Первичка без вторсырья")).toBeInTheDocument();
		expect(screen.getByText("Нужны ли сертификаты и паспорта качества")).toBeInTheDocument();
		expect(screen.getByText(/Паспорт качества — На каждую партию/)).toBeInTheDocument();

		const answersHeader = screen
			.getAllByRole("heading", { level: 3 })
			.find((h) => h.textContent === "Ответы на уточнения");
		const section = answersHeader?.closest("section") as HTMLElement;
		expect(within(section).getByRole("button", { name: /редактировать/i })).toBeInTheDocument();
	});

	test("Ответы на уточнения section hidden when item has no generatedAnswers", async () => {
		// item-3 has no generatedAnswers in the seed
		renderPanel("item-3");

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		expect(screen.queryByText("Ответы на уточнения")).not.toBeInTheDocument();
	});

	test("Ваш поставщик: toggling Оплата to Отсрочка reveals Дней отсрочки", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Ваш поставщик")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать текущего поставщика" }));

		// item-1 starts in "prepayment" → Дней отсрочки hidden
		expect(screen.queryByLabelText("Дней отсрочки")).not.toBeInTheDocument();

		const supplierSection = screen.getByText("Ваш поставщик").closest("section") as HTMLElement;
		const paymentSelect = within(supplierSection).getByRole("combobox", { name: "Оплата" });
		await user.click(paymentSelect);
		await user.click(screen.getByRole("option", { name: "Отсрочка" }));

		expect(screen.getByLabelText("Дней отсрочки")).toBeInTheDocument();
	});
});
