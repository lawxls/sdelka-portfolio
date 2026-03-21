import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { AddPositionsDrawer } from "./add-positions-drawer";

function renderDrawer(
	overrides: Partial<{
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onSubmit: (items: { name: string }[]) => void;
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
	test("renders header and footer when open", () => {
		renderDrawer();
		expect(screen.getByText("Добавить позиции")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Создать позиции" })).toBeInTheDocument();
	});

	test("does not render when closed", () => {
		renderDrawer({ open: false });
		expect(screen.queryByText("Добавить позиции")).not.toBeInTheDocument();
	});

	test("shows one empty position name input by default", () => {
		renderDrawer();
		const input = screen.getByPlaceholderText("Название позиции");
		expect(input).toBeInTheDocument();
		expect(input).toHaveValue("");
	});

	test("name input has autofocus", () => {
		renderDrawer();
		const input = screen.getByPlaceholderText("Название позиции");
		expect(input).toHaveFocus();
	});

	test("Отмена calls onOpenChange(false)", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		await userEvent.setup().click(screen.getByRole("button", { name: "Отмена" }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("submit with non-empty name calls onSubmit and closes", async () => {
		const onSubmit = vi.fn();
		const onOpenChange = vi.fn();
		renderDrawer({ onSubmit, onOpenChange });

		const user = userEvent.setup();
		await user.type(screen.getByPlaceholderText("Название позиции"), "Арматура А500С");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).toHaveBeenCalledWith([{ name: "Арматура А500С" }]);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("submit with empty name shows validation error", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });

		await userEvent.setup().click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();
	});

	test("submit with whitespace-only name shows validation error", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });

		const user = userEvent.setup();
		await user.type(screen.getByPlaceholderText("Название позиции"), "   ");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();
	});

	test("validation error clears when typing", async () => {
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
