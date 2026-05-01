import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import * as mockParser from "@/data/mock-file-parser";
import type { NewItemInput } from "@/data/types";
import { PositionsUploadDialog } from "./positions-upload-dialog";

function renderDialog(
	overrides: Partial<{
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onImport: (items: NewItemInput[]) => void;
	}> = {},
) {
	const props = {
		open: overrides.open ?? true,
		onOpenChange: overrides.onOpenChange ?? vi.fn(),
		onImport: overrides.onImport ?? vi.fn(),
	};
	return { ...render(<PositionsUploadDialog {...props} />), ...props };
}

describe("PositionsUploadDialog", () => {
	test("opens directly on the upload step (no choice screen)", () => {
		renderDialog();
		expect(screen.getByText("Добавить позиции")).toBeInTheDocument();
		expect(screen.getByTestId("dropzone")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Вручную/ })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /^Из файла$/ })).not.toBeInTheDocument();
	});

	test("renders the AI grouping hint under the dropzone", () => {
		renderDialog();
		expect(
			screen.getByText((content) =>
				content.replace(/ /g, " ").includes("ИИ сам сформирует тендеры на основе загруженных позиций"),
			),
		).toBeInTheDocument();
	});

	test("renders «Скачать пример файла с позициями» button (renamed from «Скачать шаблон»)", () => {
		renderDialog();
		expect(screen.getByRole("button", { name: /Скачать пример файла с\s*позициями/ })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Скачать шаблон/ })).not.toBeInTheDocument();
	});

	test("does not render when closed", () => {
		renderDialog({ open: false });
		expect(screen.queryByText("Добавить позиции")).not.toBeInTheDocument();
	});

	test("dropping a file shows loading state", () => {
		renderDialog();

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

		fireEvent.drop(screen.getByTestId("dropzone"), {
			dataTransfer: { files: [new File(["data"], "items.xlsx")] },
		});
		await waitFor(() => expect(screen.getByText("Item 1")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: "Close" }));

		expect(screen.getByText("Загруженные данные будут потеряны.")).toBeInTheDocument();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	test("closing dialog on upload step closes silently (no warning)", async () => {
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

		fireEvent.drop(screen.getByTestId("dropzone"), {
			dataTransfer: { files: [new File(["data"], "items.xlsx")] },
		});

		await waitFor(() => {
			expect(screen.getByTestId("dropzone")).toBeInTheDocument();
		});
		expect(screen.queryByText("Обработка файла…")).not.toBeInTheDocument();
	});
});
