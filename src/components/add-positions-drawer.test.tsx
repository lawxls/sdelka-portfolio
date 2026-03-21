import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { NewItemInput } from "@/data/use-custom-items";
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

describe("AddPositionsDrawer", () => {
	test("renders header, footer, and position table when open", () => {
		renderDrawer();
		expect(screen.getByText("Добавить позиции")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Создать позиции" })).toBeInTheDocument();
		// Table column headers
		expect(screen.getByText("Наименование")).toBeInTheDocument();
		expect(screen.getByText("Описание")).toBeInTheDocument();
		expect(screen.getByText("Количество")).toBeInTheDocument();
		expect(screen.getByText("Ед. изм.")).toBeInTheDocument();
		expect(screen.getByText("Моя цена")).toBeInTheDocument();
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
		// 10 units + 1 placeholder "—"
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

	test("Добавить позицию adds a new empty row", async () => {
		renderDrawer();
		const user = userEvent.setup();

		expect(screen.getAllByPlaceholderText("Название позиции")).toHaveLength(1);

		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));

		expect(screen.getAllByPlaceholderText("Название позиции")).toHaveLength(2);
	});

	test("new row gets auto-focus on name field", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));

		const nameInputs = screen.getAllByPlaceholderText("Название позиции");
		expect(nameInputs[1]).toHaveFocus();
	});

	test("delete removes a position row", async () => {
		renderDrawer();
		const user = userEvent.setup();

		// Add a second row
		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));
		expect(screen.getAllByPlaceholderText("Название позиции")).toHaveLength(2);

		// Delete the first row
		const deleteButtons = screen.getAllByRole("button", { name: "Удалить позицию" });
		await user.click(deleteButtons[0]);

		expect(screen.getAllByPlaceholderText("Название позиции")).toHaveLength(1);
	});

	test("delete on last row clears it instead of removing", async () => {
		renderDrawer();
		const user = userEvent.setup();

		// Type something in the only row
		await user.type(screen.getByPlaceholderText("Название позиции"), "Something");
		expect(screen.getByPlaceholderText("Название позиции")).toHaveValue("Something");

		// Delete the last row
		await user.click(screen.getByRole("button", { name: "Удалить позицию" }));

		// Still one row, but cleared
		const nameInputs = screen.getAllByPlaceholderText("Название позиции");
		expect(nameInputs).toHaveLength(1);
		expect(nameInputs[0]).toHaveValue("");
	});

	test("Загрузить из файла button is visible but disabled", () => {
		renderDrawer();
		const btn = screen.getByRole("button", { name: /Загрузить из файла/ });
		expect(btn).toBeInTheDocument();
		expect(btn).toBeDisabled();
	});

	test("submit with valid name calls onSubmit and closes", async () => {
		const onSubmit = vi.fn();
		const onOpenChange = vi.fn();
		renderDrawer({ onSubmit, onOpenChange });

		const user = userEvent.setup();
		await user.type(screen.getByPlaceholderText("Название позиции"), "Арматура А500С");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([{ name: "Арматура А500С", procurementType: "one-time" }]);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("submit saves all field values", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });

		const user = userEvent.setup();
		await user.type(screen.getByPlaceholderText("Название позиции"), "Цемент М500");
		await user.type(screen.getByPlaceholderText("Описание"), "Портландцемент");

		const quantityInputs = screen.getAllByRole("spinbutton");
		await user.type(quantityInputs[0], "120");

		await user.selectOptions(screen.getByLabelText("Единица измерения"), "т");

		await user.type(quantityInputs[1], "5500");

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([
			{
				name: "Цемент М500",
				description: "Портландцемент",
				unit: "т",
				annualQuantity: 120,
				currentPrice: 5500,
				procurementType: "one-time",
			},
		]);
	});

	test("submit creates multiple positions in one call", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });

		const user = userEvent.setup();

		// Fill first row
		await user.type(screen.getByPlaceholderText("Название позиции"), "Арматура");

		// Add second row and fill
		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));
		const nameInputs = screen.getAllByPlaceholderText("Название позиции");
		await user.type(nameInputs[1], "Цемент");

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([
			{ name: "Арматура", procurementType: "one-time" },
			{ name: "Цемент", procurementType: "one-time" },
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

		// Fill first row
		await user.type(screen.getByPlaceholderText("Название позиции"), "Арматура");

		// Add second row (leave empty)
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

	test("shows Разовая selected by default", () => {
		renderDrawer();
		const oneTime = screen.getByRole("button", { name: "Разовая" });
		expect(oneTime).toHaveAttribute("aria-pressed", "true");
		const regular = screen.getByRole("button", { name: "Регулярная" });
		expect(regular).toHaveAttribute("aria-pressed", "false");
	});

	test("frequency dropdown is hidden when Разовая selected", () => {
		renderDrawer();
		expect(screen.queryByLabelText("Периодичность")).not.toBeInTheDocument();
	});

	test("switching to Регулярная shows frequency dropdown", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Регулярная" }));

		expect(screen.getByLabelText("Периодичность")).toBeInTheDocument();
		// Check all 6 options + placeholder
		const select = screen.getByLabelText("Периодичность");
		const options = within(select as HTMLElement).getAllByRole("option");
		expect(options).toHaveLength(7); // 6 frequencies + 1 placeholder
	});

	test("switching back to Разовая hides frequency dropdown", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Регулярная" }));
		expect(screen.getByLabelText("Периодичность")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Разовая" }));
		expect(screen.queryByLabelText("Периодичность")).not.toBeInTheDocument();
	});

	test("submit includes procurementType one-time by default", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });

		const user = userEvent.setup();
		await user.type(screen.getByPlaceholderText("Название позиции"), "Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ name: "Item", procurementType: "one-time" })]);
		// frequency should not be present
		expect(onSubmit.mock.calls[0][0][0].frequency).toBeUndefined();
	});

	test("submit with Регулярная includes procurementType and frequency", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Регулярная" }));
		await user.selectOptions(screen.getByLabelText("Периодичность"), "monthly");
		await user.type(screen.getByPlaceholderText("Название позиции"), "Regular Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([
			expect.objectContaining({
				name: "Regular Item",
				procurementType: "regular",
				frequency: "monthly",
			}),
		]);
	});

	test("submit with Регулярная but no frequency selected omits frequency", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Регулярная" }));
		await user.type(screen.getByPlaceholderText("Название позиции"), "No Freq");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ name: "No Freq", procurementType: "regular" })]);
		expect(onSubmit.mock.calls[0][0][0].frequency).toBeUndefined();
	});

	test("procurementType and frequency applied to all positions on submit", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Регулярная" }));
		await user.selectOptions(screen.getByLabelText("Периодичность"), "weekly");

		await user.type(screen.getByPlaceholderText("Название позиции"), "A");
		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));
		const nameInputs = screen.getAllByPlaceholderText("Название позиции");
		await user.type(nameInputs[1], "B");

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		const items = onSubmit.mock.calls[0][0];
		expect(items).toHaveLength(2);
		expect(items[0]).toMatchObject({ procurementType: "regular", frequency: "weekly" });
		expect(items[1]).toMatchObject({ procurementType: "regular", frequency: "weekly" });
	});

	// --- Delivery conditions ---

	test("all 5 delivery condition sections are visible with toggles off by default", () => {
		renderDrawer();
		const sections = ["Юридическое лицо", "Условия оплаты", "Доставка", "Разгрузка", "Аналоги"];
		for (const label of sections) {
			expect(screen.getByText(label)).toBeInTheDocument();
		}
		// All toggles should be unchecked
		const switches = screen.getAllByRole("switch");
		for (const sw of switches) {
			expect(sw).toHaveAttribute("aria-checked", "false");
		}
	});

	test("toggling Юридическое лицо on shows segmented control", async () => {
		renderDrawer();
		const user = userEvent.setup();

		// Find the switch for Юридическое лицо (first switch)
		const switches = screen.getAllByRole("switch");
		await user.click(switches[0]);

		expect(screen.getByRole("button", { name: "Режим инкогнито" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Компания" })).toBeInTheDocument();
	});

	test("Юридическое лицо: Компания shows company dropdown", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[0]);
		await user.click(screen.getByRole("button", { name: "Компания" }));

		expect(screen.getByLabelText("Компания")).toBeInTheDocument();
		const select = screen.getByLabelText("Компания");
		const options = within(select as HTMLElement).getAllByRole("option");
		expect(options.map((o) => o.textContent)).toContain("ООО «Сделка»");
	});

	test("toggling Условия оплаты on shows payment controls", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[1]);

		expect(screen.getByRole("button", { name: "Предоплата" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отсрочка" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "С НДС" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Без НДС" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Р/С" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Наличные" })).toBeInTheDocument();
	});

	test("deferral days only editable when Отсрочка selected", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[1]);

		// Предоплата is default — deferral days should be disabled
		const deferralInput = screen.getByLabelText("Дней отсрочки");
		expect(deferralInput).toBeDisabled();

		// Switch to Отсрочка
		await user.click(screen.getByRole("button", { name: "Отсрочка" }));
		expect(deferralInput).not.toBeDisabled();
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

		// До склада is default — address input should be shown
		expect(screen.getByPlaceholderText("Адрес доставки")).toBeInTheDocument();

		// Switch to Самовывоз
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
		// Toggle on then off
		await user.click(switches[4]); // Аналоги on
		expect(screen.getByRole("button", { name: "Допускаются" })).toBeInTheDocument();
		await user.click(switches[4]); // Аналоги off
		expect(screen.queryByRole("button", { name: "Допускаются" })).not.toBeInTheDocument();
	});

	test("submit includes delivery conditions from enabled sections", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		// Fill name
		await user.type(screen.getByPlaceholderText("Название позиции"), "Test");

		// Toggle Юридическое лицо → company
		const switches = screen.getAllByRole("switch");
		await user.click(switches[0]);
		await user.click(screen.getByRole("button", { name: "Компания" }));
		await user.selectOptions(screen.getByLabelText("Компания"), "ООО «Сделка»");

		// Toggle Доставка
		await user.click(switches[2]);

		// Toggle Аналоги → не допускаются
		await user.click(switches[4]);
		await user.click(screen.getByRole("button", { name: "Не допускаются" }));

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([
			expect.objectContaining({
				name: "Test",
				legalEntityMode: "company",
				legalEntityCompany: "ООО «Сделка»",
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
		expect(item.legalEntityMode).toBeUndefined();
		expect(item.paymentType).toBeUndefined();
		expect(item.deliveryType).toBeUndefined();
		expect(item.unloading).toBeUndefined();
		expect(item.analoguesAllowed).toBeUndefined();
	});

	test("delivery conditions applied to all positions on submit", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		// Toggle Разгрузка on
		const switches = screen.getAllByRole("switch");
		await user.click(switches[3]);

		// Fill 2 positions
		await user.type(screen.getByPlaceholderText("Название позиции"), "A");
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

		// Toggle Аналоги on
		const switches = screen.getAllByRole("switch");
		await user.click(switches[4]);
		expect(screen.getByRole("button", { name: "Допускаются" })).toBeInTheDocument();

		// Submit
		await user.type(screen.getByPlaceholderText("Название позиции"), "X");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		// After reset, all toggles should be off
		const resetSwitches = screen.getAllByRole("switch");
		for (const sw of resetSwitches) {
			expect(sw).toHaveAttribute("aria-checked", "false");
		}
	});

	test("form resets procurement type to Разовая after submit", async () => {
		const onSubmit = vi.fn();
		const onOpenChange = vi.fn();
		renderDrawer({ onSubmit, onOpenChange });

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Регулярная" }));
		await user.type(screen.getByPlaceholderText("Название позиции"), "X");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		// After reset, Разовая should be default again
		expect(screen.getByRole("button", { name: "Разовая" })).toHaveAttribute("aria-pressed", "true");
		expect(screen.queryByLabelText("Периодичность")).not.toBeInTheDocument();
	});

	// --- Validation & unsaved changes (#56) ---

	test("focus moves to first error field on failed submit", async () => {
		renderDrawer();
		const user = userEvent.setup();

		// Add a second row, fill the second but leave first empty
		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));
		const nameInputs = screen.getAllByPlaceholderText("Название позиции");
		await user.type(nameInputs[1], "Filled");

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		// First (empty) name input should have focus
		expect(screen.getAllByPlaceholderText("Название позиции")[0]).toHaveFocus();
	});

	test("focus moves to first error among multiple empty rows", async () => {
		renderDrawer();
		const user = userEvent.setup();

		// Add two more rows — all three empty
		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));
		await user.click(screen.getByRole("button", { name: /Добавить позицию/ }));

		// Fill only the second row
		const nameInputs = screen.getAllByPlaceholderText("Название позиции");
		await user.type(nameInputs[1], "Middle");

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		// First empty row (index 0) should get focus
		expect(screen.getAllByPlaceholderText("Название позиции")[0]).toHaveFocus();
	});

	test("closing drawer with dirty form (name filled) shows confirmation dialog", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "Something");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		// AlertDialog should appear
		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
		// Drawer should NOT have closed yet
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
	});

	test("Продолжить редактирование returns to form without data loss", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название позиции"), "My item");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		// Click "Продолжить редактирование"
		await user.click(screen.getByRole("button", { name: "Продолжить редактирование" }));

		// Dialog should close, form still has data
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

		// Click "Закрыть без сохранения"
		await user.click(screen.getByRole("button", { name: "Закрыть без сохранения" }));

		// Dialog should close, drawer should close
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("closing clean form (untouched) closes immediately without dialog", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Отмена" }));

		// No dialog — immediate close
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

	test("dirty detection: procurement type changed triggers confirmation", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Регулярная" }));
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
	});

	test("dirty detection: delivery section toggled on triggers confirmation", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		const switches = screen.getAllByRole("switch");
		await user.click(switches[2]); // Toggle Доставка
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

		// After discard, form should be reset
		expect(screen.getByPlaceholderText("Название позиции")).toHaveValue("");
	});
});
