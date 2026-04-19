import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { FilterState, Folder, SortState } from "@/data/types";
import { Toolbar } from "./toolbar";

const defaultFilters: FilterState = { deviation: "all", status: "all" };
const defaultFolders: Folder[] = [];
const defaultFolderCounts: Record<string, number> = { all: 0, none: 0 };

function renderToolbar(
	overrides: Partial<{
		filters: FilterState;
		sort: SortState | null;
		onFiltersChange: () => void;
		onSort: () => void;
		initialEntries: string[];
	}> = {},
) {
	const props = {
		filters: overrides.filters ?? defaultFilters,
		onFiltersChange: overrides.onFiltersChange ?? vi.fn(),
		sort: overrides.sort ?? null,
		onSort: overrides.onSort ?? vi.fn(),
		folders: defaultFolders,
		folderCounts: defaultFolderCounts,
		activeFolder: undefined,
		onFolderSelect: vi.fn(),
		onCreateFolder: vi.fn(),
		onRenameFolder: vi.fn(),
		onRecolorFolder: vi.fn(),
		onDeleteFolder: vi.fn(),
	};
	return {
		...render(
			<MemoryRouter initialEntries={overrides.initialEntries ?? ["/"]}>
				<TooltipProvider>
					<Toolbar {...props} />
				</TooltipProvider>
			</MemoryRouter>,
		),
		...props,
	};
}

describe("Toolbar", () => {
	test("renders collapsed search button; input is not in the DOM", () => {
		renderToolbar();
		expect(screen.getByRole("button", { name: "Поиск" })).toBeInTheDocument();
		expect(screen.queryByPlaceholderText(/Поиск/)).not.toBeInTheDocument();
	});

	test("clicking search button expands it into an input", async () => {
		const user = userEvent.setup();
		renderToolbar();
		await user.click(screen.getByRole("button", { name: "Поиск" }));
		expect(screen.getByPlaceholderText("Поиск…")).toBeInTheDocument();
	});

	test("auto-expands when URL already has ?q= query", () => {
		renderToolbar({ initialEntries: ["/?q=арматура"] });
		const input = screen.getByPlaceholderText("Поиск…") as HTMLInputElement;
		expect(input).toBeInTheDocument();
		expect(input.value).toBe("арматура");
	});

	test("renders filter button", () => {
		renderToolbar();
		expect(screen.getByRole("button", { name: "Фильтры" })).toBeInTheDocument();
	});

	test("filter popover opens on button click", () => {
		renderToolbar();

		fireEvent.click(screen.getByRole("button", { name: "Фильтры" }));
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
		expect(screen.getByRole("button", { name: /Добавить позицию/ })).toBeInTheDocument();
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
		expect(screen.getByText("Объем в ₽")).toBeInTheDocument();
		expect(screen.getByText("Текущее ТСО")).toBeInTheDocument();
		expect(screen.getByText("Лучшее ТСО")).toBeInTheDocument();
		expect(screen.getByText("Среднее ТСО")).toBeInTheDocument();
		expect(screen.getByText("Переплата")).toBeInTheDocument();
		expect(screen.getByText("Отклонение")).toBeInTheDocument();
	});

	test("clicking sort field calls onSort with correct field", () => {
		const onSort = vi.fn();
		renderToolbar({ onSort });
		fireEvent.click(screen.getByRole("button", { name: "Сортировка" }));
		fireEvent.click(screen.getByText("Текущее ТСО"));
		expect(onSort).toHaveBeenCalledWith("currentPrice");
	});

	test("active sort field is visually indicated", () => {
		renderToolbar({ sort: { field: "overpayment", direction: "asc" } });
		fireEvent.click(screen.getByRole("button", { name: "Сортировка" }));
		const activeBtn = screen.getByText("Переплата").closest("button");
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
