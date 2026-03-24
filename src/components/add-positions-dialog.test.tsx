import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import * as mockParser from "@/data/mock-file-parser";
import type { NewItemInput } from "@/data/types";
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

	test("clicking Из файла transitions to upload step with dropzone", async () => {
		renderDialog();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Из файла/ }));

		expect(screen.getByText("Перетащите файл сюда или нажмите для выбора")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Вручную/ })).not.toBeInTheDocument();
	});

	test("upload step shows Скачать шаблон button", async () => {
		renderDialog();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Из файла/ }));

		expect(screen.getByRole("button", { name: /Скачать шаблон/ })).toBeInTheDocument();
	});

	test("dropping a file on upload step shows loading state", async () => {
		renderDialog();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Из файла/ }));

		const zone = screen.getByTestId("dropzone");
		const file = new File(["data"], "items.xlsx");
		fireEvent.drop(zone, { dataTransfer: { files: [file] } });

		expect(screen.getByText("Обработка файла…")).toBeInTheDocument();
		expect(screen.queryByTestId("dropzone")).not.toBeInTheDocument();
	});

	test("after loading completes, stub preview is shown", async () => {
		const fakeItems: NewItemInput[] = [{ name: "Item 1" }, { name: "Item 2" }];
		vi.spyOn(mockParser, "parseFile").mockResolvedValue(fakeItems);

		renderDialog();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Из файла/ }));

		const zone = screen.getByTestId("dropzone");
		fireEvent.drop(zone, { dataTransfer: { files: [new File(["data"], "items.xlsx")] } });

		await waitFor(() => {
			expect(screen.getByText(/Предпросмотр/)).toBeInTheDocument();
		});
		expect(screen.queryByText("Обработка файла…")).not.toBeInTheDocument();
	});

	test("back button on upload step returns to choice", async () => {
		renderDialog();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Из файла/ }));
		await user.click(screen.getByRole("button", { name: /Назад/ }));

		expect(screen.getByRole("button", { name: /Вручную/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Из файла/ })).toBeInTheDocument();
	});
});
