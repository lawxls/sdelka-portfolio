import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { AccessCodeInput } from "./access-code-input";

function renderInput(overrides: Partial<{ onComplete: (code: string) => void; error: boolean }> = {}) {
	const props = {
		onComplete: overrides.onComplete ?? vi.fn(),
		error: overrides.error ?? false,
	};
	return { ...render(<AccessCodeInput {...props} />), ...props };
}

function getCells() {
	return screen.getAllByRole("textbox");
}

describe("AccessCodeInput", () => {
	test("renders 5 input cells", () => {
		renderInput();
		expect(getCells()).toHaveLength(5);
	});

	test("typing a character advances focus to the next cell", async () => {
		const user = userEvent.setup();
		renderInput();
		const cells = getCells();

		await user.click(cells[0]);
		await user.keyboard("a");

		expect(cells[0]).toHaveValue("a");
		expect(cells[1]).toHaveFocus();
	});

	test("backspace on an empty cell moves focus to the previous cell and clears it", async () => {
		const user = userEvent.setup();
		renderInput();
		const cells = getCells();

		// Type into first two cells
		await user.click(cells[0]);
		await user.keyboard("a");
		await user.keyboard("b");

		expect(cells[2]).toHaveFocus();

		// Backspace on empty cell[2] → focus cell[1] and clear it
		await user.keyboard("{Backspace}");
		expect(cells[1]).toHaveFocus();
		expect(cells[1]).toHaveValue("");
	});

	test("pasting a 5-character string fills all cells and fires onComplete", async () => {
		const user = userEvent.setup();
		const { onComplete } = renderInput();
		const cells = getCells();

		await user.click(cells[0]);
		await user.paste("Sd3lk");

		expect(cells[0]).toHaveValue("S");
		expect(cells[1]).toHaveValue("d");
		expect(cells[2]).toHaveValue("3");
		expect(cells[3]).toHaveValue("l");
		expect(cells[4]).toHaveValue("k");
		expect(onComplete).toHaveBeenCalledWith("Sd3lk");
	});

	test("pasting a partial string fills cells from current position", async () => {
		const user = userEvent.setup();
		const { onComplete } = renderInput();
		const cells = getCells();

		// Focus second cell, paste 2 chars
		await user.click(cells[1]);
		await user.paste("ab");

		expect(cells[0]).toHaveValue("");
		expect(cells[1]).toHaveValue("a");
		expect(cells[2]).toHaveValue("b");
		expect(cells[3]).toHaveValue("");
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("onComplete fires with the full code when the last cell is filled via typing", async () => {
		const user = userEvent.setup();
		const { onComplete } = renderInput();
		const cells = getCells();

		await user.click(cells[0]);
		await user.keyboard("S");
		await user.keyboard("d");
		await user.keyboard("3");
		await user.keyboard("l");
		await user.keyboard("k");

		expect(onComplete).toHaveBeenCalledWith("Sd3lk");
	});

	test("only accepts single alphanumeric characters per cell", async () => {
		const user = userEvent.setup();
		renderInput();
		const cells = getCells();

		await user.click(cells[0]);
		await user.keyboard("!");
		expect(cells[0]).toHaveValue("");
		expect(cells[0]).toHaveFocus(); // did not advance

		await user.keyboard(" ");
		expect(cells[0]).toHaveValue("");
		expect(cells[0]).toHaveFocus();
	});

	test("each cell has maxLength 1", () => {
		renderInput();
		const cells = getCells();
		for (const cell of cells) {
			expect(cell).toHaveAttribute("maxlength", "1");
		}
	});

	test("cells have autocomplete off, autocapitalize none, and spellcheck disabled", () => {
		renderInput();
		const cells = getCells();
		for (const cell of cells) {
			expect(cell).toHaveAttribute("autocomplete", "off");
			expect(cell).toHaveAttribute("autocapitalize", "none");
			expect(cell).toHaveAttribute("spellcheck", "false");
		}
	});

	test("error prop can be used by parent for visual feedback", () => {
		const { container } = renderInput({ error: true });
		// The wrapper should have a data-error attribute for styling
		expect(container.querySelector("[data-error]")).toBeInTheDocument();
	});
});
