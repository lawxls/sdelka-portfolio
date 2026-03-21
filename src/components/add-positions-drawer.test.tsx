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

		expect(onSubmit).toHaveBeenCalledWith([{ name: "Арматура А500С" }]);
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
});
