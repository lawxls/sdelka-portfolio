import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { FilterState, SortState } from "@/data/types";
import { Toolbar } from "./toolbar";

const defaultFilters: FilterState = { deviation: "all", status: "all" };

function renderToolbar(
	overrides: Partial<{
		filters: FilterState;
		sort: SortState | null;
		onSearchChange: () => void;
		onFiltersChange: () => void;
		onSort: () => void;
	}> = {},
) {
	const props = {
		onSearchChange: overrides.onSearchChange ?? vi.fn(),
		filters: overrides.filters ?? defaultFilters,
		onFiltersChange: overrides.onFiltersChange ?? vi.fn(),
		sort: overrides.sort ?? null,
		onSort: overrides.onSort ?? vi.fn(),
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

describe("SortPopover", () => {
	test("sort button renders", () => {
		renderToolbar();
		expect(screen.getByRole("button", { name: "Сортировка" })).toBeInTheDocument();
	});

	test("sort popover shows all sort fields on click", () => {
		renderToolbar();
		fireEvent.click(screen.getByRole("button", { name: "Сортировка" }));
		expect(screen.getByText("Стоимость в год")).toBeInTheDocument();
		expect(screen.getByText("Текущая цена")).toBeInTheDocument();
		expect(screen.getByText("Лучшая цена")).toBeInTheDocument();
		expect(screen.getByText("Средняя цена")).toBeInTheDocument();
		expect(screen.getByText("Отклонение (%)")).toBeInTheDocument();
		expect(screen.getByText("Переплата (₽)")).toBeInTheDocument();
	});

	test("clicking sort field calls onSort with correct field", () => {
		const onSort = vi.fn();
		renderToolbar({ onSort });
		fireEvent.click(screen.getByRole("button", { name: "Сортировка" }));
		fireEvent.click(screen.getByText("Текущая цена"));
		expect(onSort).toHaveBeenCalledWith("currentPrice");
	});

	test("active sort field is visually indicated", () => {
		renderToolbar({ sort: { field: "deviation", direction: "asc" } });
		fireEvent.click(screen.getByRole("button", { name: "Сортировка" }));
		const activeBtn = screen.getByText("Отклонение (%)").closest("button");
		expect(activeBtn?.className).toContain("font-medium");
	});

	test("sort button shows active indicator dot when sort is set", () => {
		renderToolbar({ sort: { field: "currentPrice", direction: "asc" } });
		const sortBtn = screen.getByRole("button", { name: "Сортировка" });
		const dot = sortBtn.querySelector(".bg-primary");
		expect(dot).toBeInTheDocument();
	});

	test("no active indicator dot when sort is null", () => {
		renderToolbar({ sort: null });
		const sortBtn = screen.getByRole("button", { name: "Сортировка" });
		const dot = sortBtn.querySelector(".bg-primary");
		expect(dot).not.toBeInTheDocument();
	});
});

describe("Toolbar responsive", () => {
	test("search icon button renders for mobile collapse", () => {
		renderToolbar();
		expect(screen.getByRole("button", { name: "Поиск" })).toBeInTheDocument();
	});

	test("clicking search icon expands and shows close button", () => {
		renderToolbar();
		fireEvent.click(screen.getByRole("button", { name: "Поиск" }));
		expect(screen.queryByRole("button", { name: "Поиск" })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Закрыть поиск" })).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Поиск по названию…")).toBeInTheDocument();
	});

	test("close button collapses expanded search", () => {
		renderToolbar();
		fireEvent.click(screen.getByRole("button", { name: "Поиск" }));
		fireEvent.click(screen.getByRole("button", { name: "Закрыть поиск" }));
		expect(screen.getByRole("button", { name: "Поиск" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Закрыть поиск" })).not.toBeInTheDocument();
	});

	test("close button flushes pending search", () => {
		vi.useFakeTimers();
		const onSearchChange = vi.fn();
		renderToolbar({ onSearchChange });

		fireEvent.click(screen.getByRole("button", { name: "Поиск" }));
		fireEvent.change(screen.getByPlaceholderText("Поиск по названию…"), { target: { value: "бетон" } });
		fireEvent.click(screen.getByRole("button", { name: "Закрыть поиск" }));

		expect(onSearchChange).toHaveBeenCalledWith("бетон");
		vi.useRealTimers();
	});
});
