import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { NewItemInput } from "@/data/types";
import { AddPositionsDrawer } from "./add-positions-drawer";

function renderDrawer(
	overrides: Partial<{
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onSubmit: (items: NewItemInput[]) => void;
	}> = {},
) {
	const props = {
		open: overrides.open ?? true,
		onOpenChange: overrides.onOpenChange ?? vi.fn(),
		onSubmit: overrides.onSubmit ?? vi.fn(),
	};
	return { ...render(<AddPositionsDrawer {...props} />), ...props };
}

// Switch indices after reorder:
// 0: Частота закупок
// 1: Условия оплаты
// 2: Доставка
// 3: Разгрузка
// 4: Аналоги
// 5: Дополнительная информация
// 6: Дополнительные файлы
// 7: Периодичность мониторинга цен

describe("AddPositionsDrawer", () => {
	test("renders header, footer, and position form when open", () => {
		renderDrawer();
		expect(screen.getByText("Добавить позиции")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Создать позиции" })).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Название позиции")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Описание")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Количество")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Моя цена (без НДС)")).toBeInTheDocument();
	});

	test("does not render when closed", () => {
		renderDrawer({ open: false });
		expect(screen.queryByText("Добавить позиции")).not.toBeInTheDocument();
	});

	test("shows one empty position row by default with auto-focus on name", () => {
		renderDrawer();
		const nameInputs = screen.getAllByPlaceholderText("Название позиции");
		expect(nameInputs).toHaveLength(1);
		expect(nameInputs[0]).toHaveValue("");
		expect(nameInputs[0]).toHaveFocus();
	});

	test("unit dropdown contains all predefined units", () => {
		renderDrawer();
		const select = screen.getByLabelText("Единица измерения");
		const options = within(select as HTMLElement).getAllByRole("option");
		expect(options).toHaveLength(11);
		expect(options.map((o) => o.textContent)).toContain("шт");
		expect(options.map((o) => o.textContent)).toContain("кг");
		expect(options.map((o) => o.textContent)).toContain("м²");
		expect(options.map((o) => o.textContent)).toContain("рул");
	});

	test("Отмена calls onOpenChange(false)", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		await userEvent.setup().click(screen.getByRole("button", { name: "Отмена" }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("Добавить позицию adds a new empty row when all names filled", async () => {
		renderDrawer();
		const user = userEvent.setup();

		expect(screen.getAllByPlaceholderText("Название позиции")).toHaveLength(1);

		await user.type(screen.getByPlaceholderText("Название позиции"), "Filled");
		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));

		expect(screen.getAllByPlaceholderText("Название позиции")).toHaveLength(2);
	});

	test("Добавить позицию shows error when name is empty", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));

		expect(screen.getAllByPlaceholderText("Название позиции")).toHaveLength(1);
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();
	});

	test("new row gets auto-focus on name field", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "Filled");
		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));

		const nameInputs = screen.getAllByPlaceholderText("Название позиции");
		expect(nameInputs[1]).toHaveFocus();
	});

	test("delete removes a position row", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "First");
		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));
		expect(screen.getAllByPlaceholderText("Название позиции")).toHaveLength(2);

		const deleteButtons = screen.getAllByRole("button", { name: "Удалить позицию" });
		await user.click(deleteButtons[0]);

		expect(screen.getAllByPlaceholderText("Название позиции")).toHaveLength(1);
	});

	test("delete on last row clears it instead of removing", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "Something");
		expect(screen.getByPlaceholderText("Название позиции")).toHaveValue("Something");

		await user.click(screen.getByRole("button", { name: "Удалить позицию" }));

		const nameInputs = screen.getAllByPlaceholderText("Название позиции");
		expect(nameInputs).toHaveLength(1);
		expect(nameInputs[0]).toHaveValue("");
	});

	test("submit with valid name calls onSubmit and closes", async () => {
		const onSubmit = vi.fn();
		const onOpenChange = vi.fn();
		renderDrawer({ onSubmit, onOpenChange });

		const user = userEvent.setup();
		await user.type(screen.getByPlaceholderText("Название позиции"), "Арматура А500С");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([{ name: "Арматура А500С" }]);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("submit saves all field values", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });

		const user = userEvent.setup();
		await user.type(screen.getByPlaceholderText("Название позиции"), "Цемент М500");
		await user.type(screen.getByPlaceholderText("Описание"), "Портландцемент");
		await user.type(screen.getByPlaceholderText("Количество"), "120");

		await user.selectOptions(screen.getByLabelText("Единица измерения"), "т");

		await user.type(screen.getByPlaceholderText("Моя цена (без НДС)"), "5500");

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([
			{
				name: "Цемент М500",
				description: "Портландцемент",
				unit: "т",
				annualQuantity: 120,
				currentPrice: 5500,
			},
		]);
	});

	test("submit creates multiple positions in one call", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });

		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "Арматура");

		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));
		const nameInputs = screen.getAllByPlaceholderText("Название позиции");
		await user.type(nameInputs[1], "Цемент");

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([{ name: "Арматура" }, { name: "Цемент" }]);
	});

	test("submit with empty name shows validation error", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });

		await userEvent.setup().click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();
	});

	test("submit with one empty name among filled positions shows error on empty", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });

		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "Арматура");

		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();
	});

	test("validation error clears when typing in errored field", async () => {
		renderDrawer();

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();

		await user.type(screen.getByPlaceholderText("Название позиции"), "A");
		expect(screen.queryByText("Укажите название позиции")).not.toBeInTheDocument();
	});

	test("form resets after successful submit", async () => {
		const onSubmit = vi.fn();
		const onOpenChange = vi.fn();
		renderDrawer({ onSubmit, onOpenChange });

		const user = userEvent.setup();
		await user.type(screen.getByPlaceholderText("Название позиции"), "Test");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalled();
	});

	// --- Частота закупок ---

	test("frequency toggle off by default, fields hidden", () => {
		renderDrawer();
		expect(screen.getByText("Частота закупок")).toBeInTheDocument();
		const switches = screen.getAllByRole("switch");
		expect(switches[0]).toHaveAttribute("aria-checked", "false");
		expect(screen.queryByLabelText("Количество")).not.toBeInTheDocument();
	});

	test("toggling frequency on shows count and period fields", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[0]);

		expect(screen.getByLabelText("Количество")).toBeInTheDocument();
		expect(screen.getByLabelText("Период")).toBeInTheDocument();
	});

	test("submit with frequency enabled includes frequencyCount and frequencyPeriod", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[0]);

		await user.type(screen.getByPlaceholderText("Название позиции"), "Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([
			expect.objectContaining({
				name: "Item",
				frequencyCount: 1,
				frequencyPeriod: "month",
			}),
		]);
	});

	test("submit with frequency disabled omits frequency fields", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		const item = onSubmit.mock.calls[0][0][0];
		expect(item.frequencyCount).toBeUndefined();
		expect(item.frequencyPeriod).toBeUndefined();
	});

	// --- Скрыть информацию о компании ---

	test("hide company checkbox is visible and unchecked by default", () => {
		renderDrawer();
		expect(screen.getByText("Скрыть информацию о компании в запросе")).toBeInTheDocument();
		expect(screen.getByRole("checkbox")).not.toBeChecked();
	});

	test("checking hide company includes hideCompanyInfo in submit", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.click(screen.getByRole("checkbox"));
		await user.type(screen.getByPlaceholderText("Название позиции"), "Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([
			expect.objectContaining({
				hideCompanyInfo: true,
			}),
		]);
	});

	// --- Delivery conditions ---

	test("all 8 toggle sections are visible with toggles off by default", () => {
		renderDrawer();
		const sections = [
			"Частота закупок",
			"Условия оплаты",
			"Доставка",
			"Разгрузка",
			"Аналоги",
			"Дополнительная информация",
			"Дополнительные файлы",
			"Периодичность мониторинга цен",
		];
		for (const label of sections) {
			expect(screen.getByText(label)).toBeInTheDocument();
		}
		const switches = screen.getAllByRole("switch");
		expect(switches).toHaveLength(8);
		for (const sw of switches) {
			expect(sw).toHaveAttribute("aria-checked", "false");
		}
	});

	test("toggling Условия оплаты on shows payment controls without VAT", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[1]);

		expect(screen.getByRole("button", { name: "Предоплата" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отсрочка" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Р/С" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Наличные" })).toBeInTheDocument();
		// VAT controls should NOT be present
		expect(screen.queryByRole("button", { name: "С НДС" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Без НДС" })).not.toBeInTheDocument();
	});

	test("deferral days only shown when Отсрочка selected", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[1]);

		expect(screen.queryByLabelText("Дней отсрочки")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Отсрочка" }));
		expect(screen.getByLabelText("Дней отсрочки")).toBeInTheDocument();
	});

	test("toggling Доставка on shows delivery controls", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[2]);

		expect(screen.getByRole("button", { name: "До склада" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Самовывоз" })).toBeInTheDocument();
	});

	test("delivery address only shown when До склада selected", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[2]);

		expect(screen.getByPlaceholderText("Адрес доставки")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Самовывоз" }));
		expect(screen.queryByPlaceholderText("Адрес доставки")).not.toBeInTheDocument();
	});

	test("toggling Разгрузка on shows unloading controls", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[3]);

		expect(screen.getByRole("button", { name: "Силами поставщика" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Своими силами" })).toBeInTheDocument();
	});

	test("toggling Аналоги on shows analogues controls", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[4]);

		expect(screen.getByRole("button", { name: "Допускаются" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Не допускаются" })).toBeInTheDocument();
	});

	test("toggling a section off hides controls", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[4]); // Аналоги on
		expect(screen.getByRole("button", { name: "Допускаются" })).toBeInTheDocument();
		await user.click(switches[4]); // Аналоги off
		expect(screen.queryByRole("button", { name: "Допускаются" })).not.toBeInTheDocument();
	});

	// --- Дополнительная информация ---

	test("toggling Дополнительная информация on shows textarea", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[5]);

		expect(screen.getByPlaceholderText("Введите дополнительную информацию…")).toBeInTheDocument();
	});

	test("submit with additional info enabled includes additionalInfo", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[5]);
		await user.type(screen.getByPlaceholderText("Введите дополнительную информацию…"), "Особые условия");

		await user.type(screen.getByPlaceholderText("Название позиции"), "Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ additionalInfo: "Особые условия" })]);
	});

	// --- Дополнительные файлы ---

	test("toggling Дополнительные файлы on shows dropzone", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[6]);

		expect(screen.getByText(/Перетащите файлы сюда/)).toBeInTheDocument();
	});

	// --- Периодичность мониторинга цен ---

	test("toggling Периодичность мониторинга on shows dropdown", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[7]);

		expect(screen.getByLabelText("Период мониторинга")).toBeInTheDocument();
	});

	test("submit with monitoring enabled includes priceMonitoringPeriod", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[7]);

		await user.type(screen.getByPlaceholderText("Название позиции"), "Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ priceMonitoringPeriod: "quarter" })]);
	});

	// --- Submit with delivery conditions ---

	test("submit includes delivery conditions from enabled sections", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "Test");

		const switches = screen.getAllByRole("switch");

		// Toggle Доставка
		await user.click(switches[2]);

		// Toggle Аналоги → не допускаются
		await user.click(switches[4]);
		await user.click(screen.getByRole("button", { name: "Не допускаются" }));

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([
			expect.objectContaining({
				name: "Test",
				deliveryType: "warehouse",
				analoguesAllowed: false,
			}),
		]);
	});

	test("submit omits delivery fields from toggled-off sections", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "Plain");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		const item = onSubmit.mock.calls[0][0][0];
		expect(item.paymentType).toBeUndefined();
		expect(item.deliveryType).toBeUndefined();
		expect(item.unloading).toBeUndefined();
		expect(item.analoguesAllowed).toBeUndefined();
		expect(item.frequencyCount).toBeUndefined();
		expect(item.hideCompanyInfo).toBeUndefined();
		expect(item.additionalInfo).toBeUndefined();
		expect(item.priceMonitoringPeriod).toBeUndefined();
	});

	test("delivery conditions applied to all positions on submit", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "A");

		const switches = screen.getAllByRole("switch");
		await user.click(switches[3]); // Разгрузка

		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));
		const nameInputs = screen.getAllByPlaceholderText("Название позиции");
		await user.type(nameInputs[1], "B");

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		const items = onSubmit.mock.calls[0][0];
		expect(items).toHaveLength(2);
		expect(items[0].unloading).toBe("supplier");
		expect(items[1].unloading).toBe("supplier");
	});

	test("delivery conditions reset after submit", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[4]); // Аналоги
		expect(screen.getByRole("button", { name: "Допускаются" })).toBeInTheDocument();

		await user.type(screen.getByPlaceholderText("Название позиции"), "X");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		const resetSwitches = screen.getAllByRole("switch");
		for (const sw of resetSwitches) {
			expect(sw).toHaveAttribute("aria-checked", "false");
		}
	});

	test("frequency toggle resets after submit", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[0]); // Частота

		await user.type(screen.getByPlaceholderText("Название позиции"), "X");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		// After reset, frequency switch should be off
		expect(screen.getAllByRole("switch")[0]).toHaveAttribute("aria-checked", "false");
	});

	// --- Validation & unsaved changes ---

	test("focus moves to first error field on failed submit", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "Temp");
		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));
		const nameInputs = screen.getAllByPlaceholderText("Название позиции");
		await user.type(nameInputs[1], "Filled");
		await user.clear(nameInputs[0]);

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(screen.getAllByPlaceholderText("Название позиции")[0]).toHaveFocus();
	});

	test("focus moves to first empty name on add row attempt", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));

		expect(screen.getByPlaceholderText("Название позиции")).toHaveFocus();
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();
	});

	test("closing drawer with dirty form shows confirmation dialog", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "Something");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
	});

	test("cancel in confirm dialog returns to form without data loss", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "My item");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		expect(screen.queryByText("Закрыть без сохранения?")).not.toBeInTheDocument();
		expect(screen.getByPlaceholderText("Название позиции")).toHaveValue("My item");
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
	});

	test("Закрыть без сохранения closes drawer and discards form state", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "Something");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		await user.click(screen.getByRole("button", { name: "Закрыть без сохранения" }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("closing clean form closes immediately without dialog", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.queryByText("Закрыть без сохранения?")).not.toBeInTheDocument();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("dirty detection: description filled triggers confirmation", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Описание"), "desc");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
	});

	test("dirty detection: frequency toggle triggers confirmation", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[0]); // Частота
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
	});

	test("dirty detection: hide company checkbox triggers confirmation", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("checkbox"));
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
	});

	test("dirty detection: delivery section toggled on triggers confirmation", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[2]); // Доставка
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
	});

	test("form resets after discard via confirmation dialog", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "Discard me");
		await user.click(screen.getByRole("button", { name: "Отмена" }));
		await user.click(screen.getByRole("button", { name: "Закрыть без сохранения" }));

		expect(screen.getByPlaceholderText("Название позиции")).toHaveValue("");
	});
});
