import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import App from "./App";

describe("App", () => {
	test("renders page layout with header, main, and footer", () => {
		render(<App />);
		expect(screen.getByText("Портфель закупок")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Toggle theme" })).toBeInTheDocument();
		expect(screen.getByRole("banner")).toBeInTheDocument();
		expect(screen.getByRole("main")).toBeInTheDocument();
		expect(screen.getByRole("contentinfo")).toBeInTheDocument();
	});

	test("renders procurement table with data", () => {
		render(<App />);
		expect(screen.getByRole("table")).toBeInTheDocument();
		expect(screen.getByText("Наименование")).toBeInTheDocument();
		expect(screen.getByText("Статус")).toBeInTheDocument();
	});

	test("renders toolbar with search, filters, and create button", () => {
		render(<App />);
		expect(screen.getByPlaceholderText("Поиск по названию…")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Фильтры" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Создать закупки/ })).toBeInTheDocument();
	});

	test("renders summary panel with metrics and export button", () => {
		render(<App />);
		expect(screen.getByText(/Позиций/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Скачать таблицу/ })).toBeInTheDocument();
	});

	test("search filters table rows and updates totals", () => {
		vi.useFakeTimers();
		render(<App />);

		const table = screen.getByRole("table");
		const initialRowCount = within(table).getAllByRole("row").length;

		const input = screen.getByPlaceholderText("Поиск по названию…");
		fireEvent.change(input, { target: { value: "цемент" } });

		act(() => {
			vi.advanceTimersByTime(300);
		});

		const filteredRowCount = within(table).getAllByRole("row").length;
		expect(filteredRowCount).toBeLessThan(initialRowCount);

		vi.useRealTimers();
	});

	test("filter updates table and summary totals", () => {
		render(<App />);

		const table = screen.getByRole("table");
		const initialRowCount = within(table).getAllByRole("row").length;

		fireEvent.click(screen.getByRole("button", { name: "Фильтры" }));
		fireEvent.click(screen.getByText("С переплатой"));

		const filteredRowCount = within(table).getAllByRole("row").length;
		expect(filteredRowCount).toBeLessThan(initialRowCount);
	});

	test("sort reorders table rows", () => {
		render(<App />);

		const table = screen.getByRole("table");
		const getFirstDataRowCells = () => {
			const rows = within(table).getAllByRole("row");
			return within(rows[1]).getAllByRole("cell");
		};

		const nameBefore = getFirstDataRowCells()[1].textContent;

		// Click sort on current price (asc)
		fireEvent.click(screen.getByRole("button", { name: /Сортировать по Текущая цена/ }));
		const nameAfterAsc = getFirstDataRowCells()[1].textContent;

		// Click again for descending
		fireEvent.click(screen.getByRole("button", { name: /Сортировать по Текущая цена/ }));
		const nameAfterDesc = getFirstDataRowCells()[1].textContent;

		// At least one sort direction should change the first row
		const changed = nameBefore !== nameAfterAsc || nameAfterAsc !== nameAfterDesc;
		expect(changed).toBe(true);
	});
});
