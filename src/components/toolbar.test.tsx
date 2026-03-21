import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { FilterState } from "@/data/types";
import { Toolbar } from "./toolbar";

const defaultFilters: FilterState = { deviation: "all", status: "all" };

function renderToolbar(
	overrides: Partial<{ filters: FilterState; onSearchChange: () => void; onFiltersChange: () => void }> = {},
) {
	const props = {
		onSearchChange: overrides.onSearchChange ?? vi.fn(),
		filters: overrides.filters ?? defaultFilters,
		onFiltersChange: overrides.onFiltersChange ?? vi.fn(),
	};
	return {
		...render(
			<TooltipProvider>
				<Toolbar {...props} />
			</TooltipProvider>,
		),
		...props,
	};
}

describe("Toolbar", () => {
	test("renders search input", () => {
		renderToolbar();
		expect(screen.getByPlaceholderText("Поиск по названию…")).toBeInTheDocument();
	});

	test("search input calls onSearchChange after debounce", () => {
		vi.useFakeTimers();
		const onSearchChange = vi.fn();
		renderToolbar({ onSearchChange });

		const input = screen.getByPlaceholderText("Поиск по названию…");
		fireEvent.change(input, { target: { value: "арматура" } });
		expect(onSearchChange).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(onSearchChange).toHaveBeenCalledWith("арматура");

		vi.useRealTimers();
	});

	test("renders filter button", () => {
		renderToolbar();
		expect(screen.getByRole("button", { name: "Фильтры" })).toBeInTheDocument();
	});

	test("filter popover opens on button click", () => {
		renderToolbar();

		fireEvent.click(screen.getByRole("button", { name: "Фильтры" }));
		expect(screen.getByText("Все")).toBeInTheDocument();
		expect(screen.getByText("С переплатой")).toBeInTheDocument();
		expect(screen.getByText("С экономией")).toBeInTheDocument();
		expect(screen.getByText("Ищем поставщиков")).toBeInTheDocument();
		expect(screen.getByText("Ведём переговоры")).toBeInTheDocument();
		expect(screen.getByText("Переговоры завершены")).toBeInTheDocument();
	});

	test("deviation filter preset triggers onFiltersChange", () => {
		const onFiltersChange = vi.fn();
		renderToolbar({ onFiltersChange });

		fireEvent.click(screen.getByRole("button", { name: "Фильтры" }));
		fireEvent.click(screen.getByText("С переплатой"));

		expect(onFiltersChange).toHaveBeenCalledWith({ deviation: "overpaying", status: "all" });
	});

	test("status filter preset triggers onFiltersChange", () => {
		const onFiltersChange = vi.fn();
		renderToolbar({ onFiltersChange });

		fireEvent.click(screen.getByRole("button", { name: "Фильтры" }));
		fireEvent.click(screen.getByText("Ищем поставщиков"));

		expect(onFiltersChange).toHaveBeenCalledWith({ deviation: "all", status: "searching" });
	});

	test("clicking active deviation filter resets it to all", () => {
		const onFiltersChange = vi.fn();
		renderToolbar({ filters: { deviation: "overpaying", status: "all" }, onFiltersChange });

		fireEvent.click(screen.getByRole("button", { name: "Фильтры" }));
		fireEvent.click(screen.getByText("С переплатой"));

		expect(onFiltersChange).toHaveBeenCalledWith({ deviation: "all", status: "all" });
	});

	test("Все preset resets all filters", () => {
		const onFiltersChange = vi.fn();
		renderToolbar({ filters: { deviation: "overpaying", status: "searching" }, onFiltersChange });

		fireEvent.click(screen.getByRole("button", { name: "Фильтры" }));
		fireEvent.click(screen.getByText("Все"));

		expect(onFiltersChange).toHaveBeenCalledWith({ deviation: "all", status: "all" });
	});

	test("shows active filter indicator dot when filter is active", () => {
		renderToolbar({ filters: { deviation: "overpaying", status: "all" } });
		const filterBtn = screen.getByRole("button", { name: "Фильтры" });
		const dot = filterBtn.querySelector(".bg-primary");
		expect(dot).toBeInTheDocument();
	});

	test("no active filter indicator when all filters are default", () => {
		renderToolbar();
		const filterBtn = screen.getByRole("button", { name: "Фильтры" });
		const dot = filterBtn.querySelector(".bg-primary");
		expect(dot).not.toBeInTheDocument();
	});

	test("renders create procurement button", () => {
		renderToolbar();
		expect(screen.getByRole("button", { name: /Добавить позиции/ })).toBeInTheDocument();
	});
});
