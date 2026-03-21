import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet";

function renderSheet(props: { open?: boolean; onOpenChange?: (open: boolean) => void } = {}) {
	return render(
		<Sheet open={props.open ?? true} onOpenChange={props.onOpenChange}>
			<SheetContent>
				<SheetTitle>Test Title</SheetTitle>
				<SheetDescription>Description</SheetDescription>
				<p>Body content</p>
			</SheetContent>
		</Sheet>,
	);
}

describe("Sheet", () => {
	test("renders children when open", () => {
		renderSheet();
		expect(screen.getByText("Test Title")).toBeInTheDocument();
		expect(screen.getByText("Body content")).toBeInTheDocument();
	});

	test("does not render children when closed", () => {
		renderSheet({ open: false });
		expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
	});

	test("calls onOpenChange on Escape", () => {
		const onOpenChange = vi.fn();
		renderSheet({ onOpenChange });
		fireEvent.keyDown(document, { key: "Escape" });
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("renders with right side by default", () => {
		renderSheet();
		const content = document.querySelector('[data-slot="sheet-content"]');
		expect(content?.getAttribute("data-side")).toBe("right");
	});
});
