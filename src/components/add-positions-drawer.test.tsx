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

const ALWAYS_INCLUDED_DEFAULTS = {
	frequencyCount: 1,
	frequencyPeriod: "month",
	paymentType: "prepayment",
	paymentMethod: "bank_transfer",
	deliveryType: "warehouse",
	priceMonitoringPeriod: "quarter",
};

describe("AddPositionsDrawer", () => {
	test("renders header, footer, and position form when open", () => {
		renderDrawer();
		expect(screen.getByText("Добавить позиции")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Создать позиции" })).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Название позиции *")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Описание")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Количество в год")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Цена без НДС")).toBeInTheDocument();
	});

	test("does not render when closed", () => {
		renderDrawer({ open: false });
		expect(screen.queryByText("Добавить позиции")).not.toBeInTheDocument();
	});

	test("shows one empty position row by default with auto-focus on name", () => {
		renderDrawer();
		const nameInputs = screen.getAllByPlaceholderText("Название позиции *");
		expect(nameInputs).toHaveLength(1);
		expect(nameInputs[0]).toHaveValue("");
		expect(nameInputs[0]).toHaveFocus();
	});

	test("unit dropdown contains all predefined units", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await user.click(screen.getByLabelText("Единица измерения"));

		const listbox = await screen.findByRole("listbox");
		const options = within(listbox).getAllByRole("option");
		expect(options).toHaveLength(10);
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

		expect(screen.getAllByPlaceholderText("Название позиции *")).toHaveLength(1);

		await user.type(screen.getByPlaceholderText("Название позиции *"), "Filled");
		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));

		expect(screen.getAllByPlaceholderText("Название позиции *")).toHaveLength(2);
	});

	test("Добавить позицию shows error when name is empty", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));

		expect(screen.getAllByPlaceholderText("Название позиции *")).toHaveLength(1);
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();
	});

	test("new row gets auto-focus on name field", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции *"), "Filled");
		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));

		const nameInputs = screen.getAllByPlaceholderText("Название позиции *");
		expect(nameInputs[1]).toHaveFocus();
	});

	test("delete removes a position row", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции *"), "First");
		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));
		expect(screen.getAllByPlaceholderText("Название позиции *")).toHaveLength(2);

		const deleteButtons = screen.getAllByRole("button", { name: "Удалить позицию" });
		await user.click(deleteButtons[0]);

		expect(screen.getAllByPlaceholderText("Название позиции *")).toHaveLength(1);
	});

	test("delete on last row clears it instead of removing", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции *"), "Something");
		expect(screen.getByPlaceholderText("Название позиции *")).toHaveValue("Something");

		await user.click(screen.getByRole("button", { name: "Удалить позицию" }));

		const nameInputs = screen.getAllByPlaceholderText("Название позиции *");
		expect(nameInputs).toHaveLength(1);
		expect(nameInputs[0]).toHaveValue("");
	});

	// --- Section group headers ---

	test("renders section group headers", () => {
		renderDrawer();
		expect(screen.getByText("Условия поставки")).toBeInTheDocument();
		expect(screen.getByText("Параметры запроса")).toBeInTheDocument();
		expect(screen.getByText("Дополнительно")).toBeInTheDocument();
	});

	// --- All sections always visible ---

	test("no toggle switches in the form", () => {
		renderDrawer();
		expect(screen.queryAllByRole("switch")).toHaveLength(0);
	});

	test("frequency fields are always visible", () => {
		renderDrawer();
		expect(screen.getByText("Частота поставок")).toBeInTheDocument();
		expect(screen.getByLabelText("Количество")).toBeInTheDocument();
		expect(screen.getByLabelText("Период")).toBeInTheDocument();
	});

	test("payment controls are always visible", () => {
		renderDrawer();
		expect(screen.getByText("Условия оплаты")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Предоплата" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отсрочка" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Р/С" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Наличные" })).toBeInTheDocument();
	});

	test("delivery controls are always visible", () => {
		renderDrawer();
		expect(screen.getByText("Доставка")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "До склада" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Самовывоз" })).toBeInTheDocument();
	});

	test("unloading controls visible with neither selected by default", () => {
		renderDrawer();
		expect(screen.getByText("Разгрузка")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Силами поставщика" })).toHaveAttribute("aria-pressed", "false");
		expect(screen.getByRole("button", { name: "Своими силами" })).toHaveAttribute("aria-pressed", "false");
	});

	test("analogues checkbox visible and unchecked by default", () => {
		renderDrawer();
		expect(screen.getByRole("checkbox", { name: "Аналоги допускаются" })).not.toBeChecked();
		expect(screen.getByText("Допускаются аналоги")).toBeInTheDocument();
	});

	test("monitoring dropdown is always visible", () => {
		renderDrawer();
		expect(screen.getByText("Периодичность мониторинга цен")).toBeInTheDocument();
		expect(screen.getByLabelText("Период мониторинга")).toBeInTheDocument();
	});

	test("comment textarea is always visible", () => {
		renderDrawer();
		expect(screen.getByText("Комментарий")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Введите комментарий…")).toBeInTheDocument();
	});

	test("file dropzone is always visible", () => {
		renderDrawer();
		expect(screen.getByText("Приложить файлы")).toBeInTheDocument();
		expect(screen.getByText(/Перетащите файлы сюда/)).toBeInTheDocument();
	});

	test("hide company checkbox is visible and unchecked by default", () => {
		renderDrawer();
		expect(screen.getByText("Скрыть информацию о компании в запросе")).toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: "Скрыть информацию о компании" })).not.toBeChecked();
	});

	// --- Submit ---

	test("submit with valid name calls onSubmit with defaults and closes", async () => {
		const onSubmit = vi.fn();
		const onOpenChange = vi.fn();
		renderDrawer({ onSubmit, onOpenChange });

		const user = userEvent.setup();
		await user.type(screen.getByPlaceholderText("Название позиции *"), "Арматура А500С");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([
			{
				name: "Арматура А500С",
				...ALWAYS_INCLUDED_DEFAULTS,
			},
		]);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("submit saves all field values", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });

		const user = userEvent.setup();
		await user.type(screen.getByPlaceholderText("Название позиции *"), "Цемент М500");
		await user.type(screen.getByPlaceholderText("Описание"), "Портландцемент");
		await user.type(screen.getByPlaceholderText("Количество в год"), "120");

		await user.click(screen.getByLabelText("Единица измерения"));
		await user.click(await screen.findByRole("option", { name: "т" }));

		await user.type(screen.getByPlaceholderText("Цена без НДС"), "5500");

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([
			{
				name: "Цемент М500",
				description: "Портландцемент",
				unit: "т",
				annualQuantity: 120,
				currentPrice: 5500,
				...ALWAYS_INCLUDED_DEFAULTS,
			},
		]);
	});

	test("submit creates multiple positions in one call", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });

		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции *"), "Арматура");

		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));
		const nameInputs = screen.getAllByPlaceholderText("Название позиции *");
		await user.type(nameInputs[1], "Цемент");

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([
			expect.objectContaining({ name: "Арматура" }),
			expect.objectContaining({ name: "Цемент" }),
		]);
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

		await user.type(screen.getByPlaceholderText("Название позиции *"), "Арматура");

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

		await user.type(screen.getByPlaceholderText("Название позиции *"), "A");
		expect(screen.queryByText("Укажите название позиции")).not.toBeInTheDocument();
	});

	test("form resets after successful submit", async () => {
		const onSubmit = vi.fn();
		const onOpenChange = vi.fn();
		renderDrawer({ onSubmit, onOpenChange });

		const user = userEvent.setup();
		await user.type(screen.getByPlaceholderText("Название позиции *"), "Test");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalled();
	});

	// --- Payment ---

	test("deferral days only shown when Отсрочка selected", async () => {
		renderDrawer();
		const user = userEvent.setup();

		expect(screen.queryByLabelText("Дней отсрочки")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Отсрочка" }));
		expect(screen.getByLabelText("Дней отсрочки")).toBeInTheDocument();
	});

	// --- Delivery ---

	test("delivery address only shown when До склада selected", async () => {
		renderDrawer();
		const user = userEvent.setup();

		expect(screen.getByPlaceholderText("Адрес доставки")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Самовывоз" }));
		expect(screen.queryByPlaceholderText("Адрес доставки")).not.toBeInTheDocument();
	});

	// --- Unloading ---

	test("unloading omitted from submit when nothing selected", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции *"), "Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit.mock.calls[0][0][0].unloading).toBeUndefined();
	});

	test("unloading included in submit when selected", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Силами поставщика" }));
		await user.type(screen.getByPlaceholderText("Название позиции *"), "Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ unloading: "supplier" })]);
	});

	// --- Analogues ---

	test("analogues omitted from submit when nothing selected", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции *"), "Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit.mock.calls[0][0][0].analoguesAllowed).toBeUndefined();
	});

	test("analogues included in submit when checked", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.click(screen.getByRole("checkbox", { name: "Аналоги допускаются" }));
		await user.type(screen.getByPlaceholderText("Название позиции *"), "Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ analoguesAllowed: true })]);
	});

	// --- Monitoring ---

	test("monitoring always included in submit with default", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции *"), "Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ priceMonitoringPeriod: "quarter" })]);
	});

	// --- Hide company ---

	test("checking hide company includes hideCompanyInfo in submit", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.click(screen.getByRole("checkbox", { name: "Скрыть информацию о компании" }));
		await user.type(screen.getByPlaceholderText("Название позиции *"), "Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ hideCompanyInfo: true })]);
	});

	// --- Comment ---

	test("submit with comment includes additionalInfo", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Введите комментарий…"), "Особые условия");

		await user.type(screen.getByPlaceholderText("Название позиции *"), "Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ additionalInfo: "Особые условия" })]);
	});

	// --- Submit with delivery conditions ---

	test("submit includes all always-present fields", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции *"), "Plain");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		const item = onSubmit.mock.calls[0][0][0];
		expect(item.paymentType).toBe("prepayment");
		expect(item.paymentMethod).toBe("bank_transfer");
		expect(item.deliveryType).toBe("warehouse");
		expect(item.frequencyCount).toBe(1);
		expect(item.frequencyPeriod).toBe("month");
		expect(item.priceMonitoringPeriod).toBe("quarter");
		// Toggle-gated fields omitted when off
		expect(item.unloading).toBeUndefined();
		expect(item.analoguesAllowed).toBeUndefined();
		expect(item.hideCompanyInfo).toBeUndefined();
		expect(item.additionalInfo).toBeUndefined();
	});

	test("shared conditions applied to all positions on submit", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции *"), "A");

		await user.click(screen.getByRole("button", { name: "Силами поставщика" }));

		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));
		const nameInputs = screen.getAllByPlaceholderText("Название позиции *");
		await user.type(nameInputs[1], "B");

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		const items = onSubmit.mock.calls[0][0];
		expect(items).toHaveLength(2);
		expect(items[0].unloading).toBe("supplier");
		expect(items[1].unloading).toBe("supplier");
	});

	test("form values reset to defaults after submit", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Своими силами" }));
		await user.click(screen.getByRole("checkbox", { name: "Аналоги допускаются" }));

		await user.type(screen.getByPlaceholderText("Название позиции *"), "X");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		// After reset, nothing selected
		expect(screen.getByRole("button", { name: "Силами поставщика" })).toHaveAttribute("aria-pressed", "false");
		expect(screen.getByRole("button", { name: "Своими силами" })).toHaveAttribute("aria-pressed", "false");
		expect(screen.getByRole("checkbox", { name: "Аналоги допускаются" })).not.toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Скрыть информацию о компании" })).not.toBeChecked();
	});

	// --- Validation & unsaved changes ---

	test("focus moves to first error field on failed submit", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции *"), "Temp");
		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));
		const nameInputs = screen.getAllByPlaceholderText("Название позиции *");
		await user.type(nameInputs[1], "Filled");
		await user.clear(nameInputs[0]);

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(screen.getAllByPlaceholderText("Название позиции *")[0]).toHaveFocus();
	});

	test("focus moves to first empty name on add row attempt", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));

		expect(screen.getByPlaceholderText("Название позиции *")).toHaveFocus();
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();
	});

	test("closing drawer with dirty form shows confirmation dialog", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции *"), "Something");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
	});

	test("cancel in confirm dialog returns to form without data loss", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции *"), "My item");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		expect(screen.queryByText("Закрыть без сохранения?")).not.toBeInTheDocument();
		expect(screen.getByPlaceholderText("Название позиции *")).toHaveValue("My item");
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
	});

	test("Закрыть без сохранения closes drawer and discards form state", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции *"), "Something");
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

	test("dirty detection: hide company checkbox triggers confirmation", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("checkbox", { name: "Скрыть информацию о компании" }));
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
	});

	test("dirty detection: delivery address typed triggers confirmation", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Адрес доставки"), "ул. Ленина 1");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
	});

	test("dirty detection: checking analogues triggers confirmation", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("checkbox", { name: "Аналоги допускаются" }));
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
	});

	test("dirty detection: selecting unloading triggers confirmation", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Силами поставщика" }));
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
	});

	test("form resets after discard via confirmation dialog", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции *"), "Discard me");
		await user.click(screen.getByRole("button", { name: "Отмена" }));
		await user.click(screen.getByRole("button", { name: "Закрыть без сохранения" }));

		expect(screen.getByPlaceholderText("Название позиции *")).toHaveValue("");
	});
});
