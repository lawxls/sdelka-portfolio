import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { NewItemInput } from "@/data/types";
import { ImportPreview } from "./import-preview";

function makeItems(count: number): NewItemInput[] {
	return Array.from({ length: count }, (_, i) => ({ name: `Item ${i + 1}` }));
}

function renderPreview(
	overrides: Partial<{
		items: NewItemInput[];
		onBack: () => void;
		onImport: () => void;
	}> = {},
) {
	const props = {
		items: overrides.items ?? makeItems(23),
		onBack: overrides.onBack ?? vi.fn(),
		onImport: overrides.onImport ?? vi.fn(),
	};
	return { ...render(<ImportPreview {...props} />), ...props };
}

describe("ImportPreview", () => {
	test("renders first 10 items on first page", () => {
		renderPreview({ items: makeItems(23) });
		expect(screen.getByText("Item 1")).toBeInTheDocument();
		expect(screen.getByText("Item 10")).toBeInTheDocument();
		expect(screen.queryByText("Item 11")).not.toBeInTheDocument();
	});

	test("shows page counter with correct range and total", () => {
		renderPreview({ items: makeItems(23) });
		expect(screen.getByText("Позиция 1–10 из 23")).toBeInTheDocument();
	});

	test("next button navigates to second page", async () => {
		renderPreview({ items: makeItems(23) });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Следующая страница/ }));

		expect(screen.getByText("Item 11")).toBeInTheDocument();
		expect(screen.getByText("Item 20")).toBeInTheDocument();
		expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
		expect(screen.getByText("Позиция 11–20 из 23")).toBeInTheDocument();
	});

	test("prev button is disabled on first page", () => {
		renderPreview({ items: makeItems(23) });
		expect(screen.getByRole("button", { name: /Предыдущая страница/ })).toBeDisabled();
	});

	test("next button is disabled on last page", async () => {
		renderPreview({ items: makeItems(23) });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Следующая страница/ }));
		await user.click(screen.getByRole("button", { name: /Следующая страница/ }));

		// Page 3: items 21-23
		expect(screen.getByText("Item 21")).toBeInTheDocument();
		expect(screen.getByText("Item 23")).toBeInTheDocument();
		expect(screen.getByText("Позиция 21–23 из 23")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Следующая страница/ })).toBeDisabled();
	});

	test("prev navigates back", async () => {
		renderPreview({ items: makeItems(23) });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Следующая страница/ }));
		await user.click(screen.getByRole("button", { name: /Предыдущая страница/ }));

		expect(screen.getByText("Item 1")).toBeInTheDocument();
		expect(screen.getByText("Позиция 1–10 из 23")).toBeInTheDocument();
	});

	test("import button shows item count", () => {
		renderPreview({ items: makeItems(23) });
		expect(screen.getByRole("button", { name: /Импортировать 23 позиц/ })).toBeInTheDocument();
	});

	test("import button calls onImport", async () => {
		const onImport = vi.fn();
		renderPreview({ items: makeItems(5), onImport });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Импортировать/ }));

		expect(onImport).toHaveBeenCalledOnce();
	});

	test("back button calls onBack", async () => {
		const onBack = vi.fn();
		renderPreview({ items: makeItems(5), onBack });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Назад" }));

		expect(onBack).toHaveBeenCalledOnce();
	});

	test("all items fit on one page when <= 10", () => {
		renderPreview({ items: makeItems(5) });
		expect(screen.getByText("Item 1")).toBeInTheDocument();
		expect(screen.getByText("Item 5")).toBeInTheDocument();
		expect(screen.getByText("Позиция 1–5 из 5")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Предыдущая страница/ })).toBeDisabled();
		expect(screen.getByRole("button", { name: /Следующая страница/ })).toBeDisabled();
	});
});
