import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { FileDropzone } from "./file-dropzone";

function renderDropzone(overrides: Partial<{ onFile: (file: File) => void }> = {}) {
	const props = {
		onFile: overrides.onFile ?? vi.fn(),
	};
	return { ...render(<FileDropzone {...props} />), ...props };
}

describe("FileDropzone", () => {
	test("renders instructional text and upload icon", () => {
		renderDropzone();
		expect(screen.getByText("Перетащите файл сюда или нажмите для выбора")).toBeInTheDocument();
	});

	test("shows visual highlight on drag over and removes on drag leave", () => {
		renderDropzone();
		const zone = screen.getByTestId("dropzone");

		fireEvent.dragEnter(zone, { dataTransfer: { types: ["Files"] } });
		expect(zone).toHaveAttribute("data-dragging", "true");

		fireEvent.dragLeave(zone);
		expect(zone).not.toHaveAttribute("data-dragging", "true");
	});

	test("dropping a file calls onFile and clears highlight", () => {
		const onFile = vi.fn();
		renderDropzone({ onFile });
		const zone = screen.getByTestId("dropzone");
		const file = new File(["data"], "items.csv", { type: "text/csv" });

		fireEvent.drop(zone, { dataTransfer: { files: [file] } });

		expect(onFile).toHaveBeenCalledWith(file);
		expect(zone).not.toHaveAttribute("data-dragging", "true");
	});

	test("clicking the zone opens file picker and selecting a file calls onFile", async () => {
		const onFile = vi.fn();
		renderDropzone({ onFile });

		const input = screen.getByTestId("dropzone-input") as HTMLInputElement;
		const file = new File(["data"], "items.xlsx", {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		});
		await userEvent.setup().upload(input, file);

		expect(onFile).toHaveBeenCalledWith(file);
	});
});
