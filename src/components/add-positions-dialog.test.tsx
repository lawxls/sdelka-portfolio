import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { AddPositionsDialog } from "./add-positions-dialog";

function renderDialog(
	overrides: Partial<{
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onManual: () => void;
	}> = {},
) {
	const props = {
		open: overrides.open ?? true,
		onOpenChange: overrides.onOpenChange ?? vi.fn(),
		onManual: overrides.onManual ?? vi.fn(),
	};
	return { ...render(<AddPositionsDialog {...props} />), ...props };
}

describe("AddPositionsDialog", () => {
	test("renders title and two choice cards when open", () => {
		renderDialog();
		expect(screen.getByText("Добавить позиции")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Вручную/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Из файла/ })).toBeInTheDocument();
	});

	test("does not render when closed", () => {
		renderDialog({ open: false });
		expect(screen.queryByText("Добавить позиции")).not.toBeInTheDocument();
	});

	test("choice cards show correct descriptions", () => {
		renderDialog();
		expect(screen.getByText("Заполните данные для каждой позиции")).toBeInTheDocument();
		expect(screen.getByText("Загрузите файл с позициями")).toBeInTheDocument();
	});

	test("clicking Вручную calls onManual and closes dialog", async () => {
		const onManual = vi.fn();
		const onOpenChange = vi.fn();
		renderDialog({ onManual, onOpenChange });

		await userEvent.setup().click(screen.getByRole("button", { name: /Вручную/ }));

		expect(onManual).toHaveBeenCalledOnce();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("clicking Из файла is a placeholder (no crash)", async () => {
		renderDialog();
		// Should not throw — placeholder for follow-up issue
		await userEvent.setup().click(screen.getByRole("button", { name: /Из файла/ }));
	});
});
