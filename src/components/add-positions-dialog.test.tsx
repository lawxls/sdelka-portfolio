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
	test("opens on the choice step with «Добавить вручную» and «Загрузить из файла»", () => {
		renderDialog();
		expect(screen.getByText("Добавить позиции", { selector: "[data-slot='dialog-title']" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Добавить вручную/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Загрузить из файла/ })).toBeInTheDocument();
		expect(screen.queryByTestId("dropzone")).not.toBeInTheDocument();
	});

	test("clicking «Добавить вручную» closes the dialog and fires onManual", async () => {
		const onManual = vi.fn();
		const onOpenChange = vi.fn();
		renderDialog({ onManual, onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить вручную/ }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(onManual).toHaveBeenCalled();
	});

	test("clicking «Загрузить из файла» shows the dropzone", async () => {
		renderDialog();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Загрузить из файла/ }));

		expect(screen.getByTestId("dropzone")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Скачать пример файла с\s*позициями/ })).toBeInTheDocument();
	});

	test("«Назад» on the upload step returns to the choice screen", async () => {
		renderDialog();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Загрузить из файла/ }));
		await user.click(screen.getByRole("button", { name: /Назад/ }));

		expect(screen.getByRole("button", { name: /Добавить вручную/ })).toBeInTheDocument();
		expect(screen.queryByTestId("dropzone")).not.toBeInTheDocument();
	});

	test("does not render when closed", () => {
		renderDialog({ open: false });
		expect(screen.queryByText("Добавить позиции")).not.toBeInTheDocument();
	});

	test("dropping a file shows loading state", async () => {
		renderDialog();
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Загрузить из файла/ }));

		const zone = screen.getByTestId("dropzone");
		const file = new File(["data"], "items.xlsx");
		fireEvent.drop(zone, { dataTransfer: { files: [file] } });

		expect(screen.getByText("Обработка файла…")).toBeInTheDocument();
		expect(screen.queryByTestId("dropzone")).not.toBeInTheDocument();
	});

	test("after parsing completes, the import preview is shown with parsed items (flat list)", async () => {
		const fakeItems: NewItemInput[] = [{ name: "Item 1" }, { name: "Item 2" }];
		vi.spyOn(mockParser, "parseFile").mockResolvedValue(fakeItems);

		renderDialog();
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Загрузить из файла/ }));

		fireEvent.drop(screen.getByTestId("dropzone"), {
			dataTransfer: { files: [new File(["data"], "items.xlsx")] },
		});

		await waitFor(() => {
			expect(screen.getByText("Item 1")).toBeInTheDocument();
		});
		expect(screen.getByText("Item 2")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Импортировать/ })).toBeInTheDocument();
	});

	test("clicking Импортировать calls onImport with parsed items and closes the dialog", async () => {
		const fakeItems: NewItemInput[] = [{ name: "Item 1" }, { name: "Item 2" }];
		vi.spyOn(mockParser, "parseFile").mockResolvedValue(fakeItems);
		const onImport = vi.fn();
		const onOpenChange = vi.fn();
		renderDialog({ onImport, onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Загрузить из файла/ }));
		fireEvent.drop(screen.getByTestId("dropzone"), {
			dataTransfer: { files: [new File(["data"], "items.xlsx")] },
		});
		await waitFor(() => expect(screen.getByText("Item 1")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: /Импортировать/ }));

		expect(onImport).toHaveBeenCalledWith(fakeItems);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("back from preview returns to upload step", async () => {
		const fakeItems: NewItemInput[] = [{ name: "Item 1" }];
		vi.spyOn(mockParser, "parseFile").mockResolvedValue(fakeItems);

		renderDialog();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Загрузить из файла/ }));
		fireEvent.drop(screen.getByTestId("dropzone"), {
			dataTransfer: { files: [new File(["data"], "items.xlsx")] },
		});
		await waitFor(() => expect(screen.getByText("Item 1")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: "Назад" }));

		expect(screen.getByTestId("dropzone")).toBeInTheDocument();
		expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
	});

	test("closing dialog on preview step shows close warning", async () => {
		const fakeItems: NewItemInput[] = [{ name: "Item 1" }];
		vi.spyOn(mockParser, "parseFile").mockResolvedValue(fakeItems);
		const onOpenChange = vi.fn();
		renderDialog({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Загрузить из файла/ }));
		fireEvent.drop(screen.getByTestId("dropzone"), {
			dataTransfer: { files: [new File(["data"], "items.xlsx")] },
		});
		await waitFor(() => expect(screen.getByText("Item 1")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: "Close" }));

		expect(screen.getByText("Загруженные данные будут потеряны.")).toBeInTheDocument();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	test("closing dialog on choice step closes silently (no warning)", async () => {
		const onOpenChange = vi.fn();
		renderDialog({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Close" }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(screen.queryByText("Загруженные данные будут потеряны.")).not.toBeInTheDocument();
	});

	test("file parse error returns to upload step", async () => {
		vi.spyOn(mockParser, "parseFile").mockRejectedValue(new Error("bad file"));

		renderDialog();
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Загрузить из файла/ }));

		fireEvent.drop(screen.getByTestId("dropzone"), {
			dataTransfer: { files: [new File(["data"], "items.xlsx")] },
		});

		await waitFor(() => {
			expect(screen.getByTestId("dropzone")).toBeInTheDocument();
		});
		expect(screen.queryByText("Обработка файла…")).not.toBeInTheDocument();
	});
});
