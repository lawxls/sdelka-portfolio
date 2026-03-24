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
		onImport: (items: NewItemInput[]) => void;
	}> = {},
) {
	const props = {
		open: overrides.open ?? true,
		onOpenChange: overrides.onOpenChange ?? vi.fn(),
		onManual: overrides.onManual ?? vi.fn(),
		onImport: overrides.onImport ?? vi.fn(),
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

	test("after loading completes, import preview is shown with items", async () => {
		const fakeItems: NewItemInput[] = [{ name: "Item 1" }, { name: "Item 2" }];
		vi.spyOn(mockParser, "parseFile").mockResolvedValue(fakeItems);

		renderDialog();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Из файла/ }));

		const zone = screen.getByTestId("dropzone");
		fireEvent.drop(zone, { dataTransfer: { files: [new File(["data"], "items.xlsx")] } });

		await waitFor(() => {
			expect(screen.getByText("Item 1")).toBeInTheDocument();
		});
		expect(screen.getByText("Item 2")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Импортировать/ })).toBeInTheDocument();
		expect(screen.queryByText("Обработка файла…")).not.toBeInTheDocument();
	});

	test("back from preview returns to upload step", async () => {
		const fakeItems: NewItemInput[] = [{ name: "Item 1" }];
		vi.spyOn(mockParser, "parseFile").mockResolvedValue(fakeItems);

		renderDialog();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Из файла/ }));
		const zone = screen.getByTestId("dropzone");
		fireEvent.drop(zone, { dataTransfer: { files: [new File(["data"], "items.xlsx")] } });

		await waitFor(() => {
			expect(screen.getByText("Item 1")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Назад" }));

		expect(screen.getByTestId("dropzone")).toBeInTheDocument();
		expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
	});

	test("clicking Импортировать calls onImport with parsed items and closes dialog", async () => {
		const fakeItems: NewItemInput[] = [{ name: "Item 1" }, { name: "Item 2" }];
		vi.spyOn(mockParser, "parseFile").mockResolvedValue(fakeItems);
		const onImport = vi.fn();
		const onOpenChange = vi.fn();
		renderDialog({ onImport, onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Из файла/ }));
		fireEvent.drop(screen.getByTestId("dropzone"), { dataTransfer: { files: [new File(["data"], "items.xlsx")] } });
		await waitFor(() => expect(screen.getByText("Item 1")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: /Импортировать/ }));

		expect(onImport).toHaveBeenCalledWith(fakeItems);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("closing dialog on preview step shows close warning", async () => {
		const fakeItems: NewItemInput[] = [{ name: "Item 1" }];
		vi.spyOn(mockParser, "parseFile").mockResolvedValue(fakeItems);
		const onOpenChange = vi.fn();
		renderDialog({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Из файла/ }));
		fireEvent.drop(screen.getByTestId("dropzone"), { dataTransfer: { files: [new File(["data"], "items.xlsx")] } });
		await waitFor(() => expect(screen.getByText("Item 1")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: "Close" }));

		expect(screen.getByText("Загруженные данные будут потеряны.")).toBeInTheDocument();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	test("confirming close warning closes the dialog", async () => {
		const fakeItems: NewItemInput[] = [{ name: "Item 1" }];
		vi.spyOn(mockParser, "parseFile").mockResolvedValue(fakeItems);
		const onOpenChange = vi.fn();
		renderDialog({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Из файла/ }));
		fireEvent.drop(screen.getByTestId("dropzone"), { dataTransfer: { files: [new File(["data"], "items.xlsx")] } });
		await waitFor(() => expect(screen.getByText("Item 1")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: "Close" }));
		await user.click(screen.getByRole("button", { name: "Закрыть" }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("cancelling close warning keeps dialog open on preview", async () => {
		const fakeItems: NewItemInput[] = [{ name: "Item 1" }];
		vi.spyOn(mockParser, "parseFile").mockResolvedValue(fakeItems);
		const onOpenChange = vi.fn();
		renderDialog({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Из файла/ }));
		fireEvent.drop(screen.getByTestId("dropzone"), { dataTransfer: { files: [new File(["data"], "items.xlsx")] } });
		await waitFor(() => expect(screen.getByText("Item 1")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: "Close" }));
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		expect(screen.getByText("Item 1")).toBeInTheDocument();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	test("closing dialog on choice step closes silently", async () => {
		const onOpenChange = vi.fn();
		renderDialog({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Close" }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(screen.queryByText("Загруженные данные будут потеряны.")).not.toBeInTheDocument();
	});

	test("closing dialog on upload step closes silently", async () => {
		const onOpenChange = vi.fn();
		renderDialog({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Из файла/ }));
		await user.click(screen.getByRole("button", { name: "Close" }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(screen.queryByText("Загруженные данные будут потеряны.")).not.toBeInTheDocument();
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
