import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { FilterState, Folder, SortState } from "@/data/types";
import * as useIsMobileModule from "@/hooks/use-is-mobile";
import { Toolbar } from "./toolbar";

function mockMobile(value: boolean) {
	vi.spyOn(useIsMobileModule, "useIsMobile").mockReturnValue(value);
}

afterEach(() => vi.restoreAllMocks());

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
		expect(screen.getByRole("button", { name: "Поиск позиций" })).toBeInTheDocument();
		expect(screen.queryByPlaceholderText(/Поиск/)).not.toBeInTheDocument();
	});

	test("clicking search button expands it into an input", async () => {
		const user = userEvent.setup();
		renderToolbar();
		await user.click(screen.getByRole("button", { name: "Поиск позиций" }));
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
		expect(screen.getByRole("button", { name: /Добавить позиции/ })).toBeInTheDocument();
	});
});

describe("SortPopover (inside mobile overflow)", () => {
	function openOverflow() {
		fireEvent.click(screen.getByRole("button", { name: "Ещё" }));
	}

	test("sort button is reachable via overflow menu", () => {
		mockMobile(true);
		renderToolbar();
		openOverflow();
		expect(screen.getByRole("button", { name: "Сортировка" })).toBeInTheDocument();
	});

	test("sort popover shows all sort fields on click", () => {
		mockMobile(true);
		renderToolbar();
		openOverflow();
		fireEvent.click(screen.getByRole("button", { name: "Сортировка" }));
		expect(screen.getByText("Объем в ₽")).toBeInTheDocument();
		expect(screen.getByText("Текущее ТСО")).toBeInTheDocument();
		expect(screen.getByText("Лучшее ТСО")).toBeInTheDocument();
		expect(screen.getByText("Среднее ТСО")).toBeInTheDocument();
		expect(screen.getByText("Переплата")).toBeInTheDocument();
		expect(screen.getByText("Отклонение")).toBeInTheDocument();
	});

	test("clicking sort field calls onSort with correct field", () => {
		mockMobile(true);
		const onSort = vi.fn();
		renderToolbar({ onSort });
		openOverflow();
		fireEvent.click(screen.getByRole("button", { name: "Сортировка" }));
		fireEvent.click(screen.getByText("Текущее ТСО"));
		expect(onSort).toHaveBeenCalledWith("currentPrice");
	});

	test("active sort field is visually indicated", () => {
		mockMobile(true);
		renderToolbar({ sort: { field: "overpayment", direction: "asc" } });
		openOverflow();
		fireEvent.click(screen.getByRole("button", { name: "Сортировка" }));
		const activeBtn = screen.getByText("Переплата").closest("button");
		expect(activeBtn?.className).toContain("font-medium");
	});

	test("overflow trigger shows active indicator dot when sort is set", () => {
		mockMobile(true);
		renderToolbar({ sort: { field: "currentPrice", direction: "asc" } });
		const overflowBtn = screen.getByRole("button", { name: "Ещё" });
		const dot = overflowBtn.querySelector(".bg-primary");
		expect(dot).toBeInTheDocument();
	});

	test("no active indicator dot when sort is null and no filters applied", () => {
		mockMobile(true);
		renderToolbar({ sort: null });
		const overflowBtn = screen.getByRole("button", { name: "Ещё" });
		const dot = overflowBtn.querySelector(".bg-primary");
		expect(dot).not.toBeInTheDocument();
	});
});
