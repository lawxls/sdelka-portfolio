import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CompanySummary, FilterState } from "@/data/types";
import { makeCompany } from "@/test-utils";
import { FiltersPopover } from "./filters-popover";

const COMPANIES: CompanySummary[] = [
	makeCompany("c1", { name: "Альфа", procurementItemCount: 15 }),
	makeCompany("c2", { name: "Бета", procurementItemCount: 8 }),
];

const DEFAULT_FILTERS: FilterState = { deviation: "all", status: "all" };

interface RenderOptions {
	filters?: FilterState;
	companies?: CompanySummary[];
	selectedCompany?: string | undefined;
	showCompanies?: boolean;
	onFiltersChange?: (filters: FilterState) => void;
	onCompanySelect?: (company: string | undefined) => void;
}

function renderPopover(opts: RenderOptions = {}) {
	const onFiltersChange = opts.onFiltersChange ?? vi.fn();
	const onCompanySelect = opts.onCompanySelect ?? vi.fn();

	const utils = render(
		<TooltipProvider>
			<FiltersPopover
				filters={opts.filters ?? DEFAULT_FILTERS}
				onFiltersChange={onFiltersChange}
				companies={opts.companies ?? COMPANIES}
				selectedCompany={opts.selectedCompany}
				onCompanySelect={onCompanySelect}
				showCompanies={opts.showCompanies ?? false}
			/>
		</TooltipProvider>,
	);

	return { ...utils, mocks: { onFiltersChange, onCompanySelect } };
}

function openPopover() {
	fireEvent.click(screen.getByRole("button", { name: "Фильтры" }));
}

beforeEach(() => {
	localStorage.clear();
});

describe("FiltersPopover — section visibility", () => {
	test("renders deviation and status sections by default", () => {
		renderPopover();
		openPopover();

		expect(screen.getByTestId("filters-section-deviation")).toBeInTheDocument();
		expect(screen.getByTestId("filters-section-status")).toBeInTheDocument();
	});

	test("does not render category section", () => {
		renderPopover();
		openPopover();

		expect(screen.queryByTestId("filters-section-category")).not.toBeInTheDocument();
		expect(screen.queryByText("Все закупки")).not.toBeInTheDocument();
	});

	test("hides Компания section in single-company workspace", () => {
		renderPopover({ showCompanies: false });
		openPopover();

		expect(screen.queryByTestId("filters-section-company")).not.toBeInTheDocument();
	});

	test("shows Компания section in multi-company workspace", () => {
		renderPopover({ showCompanies: true });
		openPopover();

		expect(screen.getByTestId("filters-section-company")).toBeInTheDocument();
		expect(screen.getByText("Альфа")).toBeInTheDocument();
		expect(screen.getByText("Бета")).toBeInTheDocument();
	});

	test("sections appear in order: Компания → Отклонение → Статус", () => {
		renderPopover({ showCompanies: true });
		openPopover();

		const sections = [
			screen.getByTestId("filters-section-company"),
			screen.getByTestId("filters-section-deviation"),
			screen.getByTestId("filters-section-status"),
		];

		for (let i = 0; i < sections.length - 1; i++) {
			expect(sections[i].compareDocumentPosition(sections[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		}
	});
});

describe("FiltersPopover — Компания section", () => {
	test("shows company name and procurement count", () => {
		renderPopover({ showCompanies: true });
		openPopover();

		const section = screen.getByTestId("filters-section-company");
		expect(within(section).getByText("Альфа")).toBeInTheDocument();
		expect(within(section).getByText("15")).toBeInTheDocument();
	});

	test("selecting a company calls onCompanySelect with id", () => {
		const onCompanySelect = vi.fn();
		renderPopover({ showCompanies: true, onCompanySelect });
		openPopover();

		fireEvent.click(screen.getByText("Альфа"));
		expect(onCompanySelect).toHaveBeenCalledWith("c1");
	});

	test("selecting an already-selected company clears it", () => {
		const onCompanySelect = vi.fn();
		renderPopover({ showCompanies: true, selectedCompany: "c1", onCompanySelect });
		openPopover();

		fireEvent.click(screen.getByText("Альфа"));
		expect(onCompanySelect).toHaveBeenCalledWith(undefined);
	});

	test("active company row has highlight class", () => {
		renderPopover({ showCompanies: true, selectedCompany: "c1" });
		openPopover();

		const btn = screen.getByText("Альфа").closest("button") as HTMLElement;
		expect(btn.className).toContain("text-highlight-foreground");
	});
});

describe("FiltersPopover — Отклонение section", () => {
	test("renders deviation presets", () => {
		renderPopover();
		openPopover();

		const section = screen.getByTestId("filters-section-deviation");
		expect(within(section).getByText("С переплатой")).toBeInTheDocument();
		expect(within(section).getByText("С экономией")).toBeInTheDocument();
	});

	test("clicking a preset toggles deviation filter", () => {
		const onFiltersChange = vi.fn();
		renderPopover({ onFiltersChange });
		openPopover();

		fireEvent.click(screen.getByText("С переплатой"));
		expect(onFiltersChange).toHaveBeenCalledWith({ deviation: "overpaying", status: "all" });
	});

	test("clicking an active preset resets it", () => {
		const onFiltersChange = vi.fn();
		renderPopover({ filters: { deviation: "overpaying", status: "all" }, onFiltersChange });
		openPopover();

		fireEvent.click(screen.getByText("С переплатой"));
		expect(onFiltersChange).toHaveBeenCalledWith({ deviation: "all", status: "all" });
	});

	test("highlights active deviation preset", () => {
		renderPopover({ filters: { deviation: "saving", status: "all" } });
		openPopover();

		const btn = screen.getByText("С экономией").closest("button") as HTMLElement;
		expect(btn.className).toContain("text-highlight-foreground");
	});
});

describe("FiltersPopover — Статус section", () => {
	test("renders all status presets", () => {
		renderPopover();
		openPopover();

		const section = screen.getByTestId("filters-section-status");
		expect(within(section).getByText("Ищем поставщиков")).toBeInTheDocument();
		expect(within(section).getByText("Ведём переговоры")).toBeInTheDocument();
		expect(within(section).getByText("Переговоры завершены")).toBeInTheDocument();
	});

	test("clicking a preset toggles status filter", () => {
		const onFiltersChange = vi.fn();
		renderPopover({ onFiltersChange });
		openPopover();

		fireEvent.click(screen.getByText("Ищем поставщиков"));
		expect(onFiltersChange).toHaveBeenCalledWith({ deviation: "all", status: "searching" });
	});

	test("clicking an active status resets it", () => {
		const onFiltersChange = vi.fn();
		renderPopover({ filters: { deviation: "all", status: "searching" }, onFiltersChange });
		openPopover();

		fireEvent.click(screen.getByText("Ищем поставщиков"));
		expect(onFiltersChange).toHaveBeenCalledWith({ deviation: "all", status: "all" });
	});
});

describe("FiltersPopover — trigger", () => {
	test("filter button has no active dot when filters are default", () => {
		renderPopover();
		const btn = screen.getByRole("button", { name: "Фильтры" });
		expect(btn.querySelector(".bg-primary")).not.toBeInTheDocument();
	});

	test("filter button shows active dot when deviation or status is set", () => {
		renderPopover({ filters: { deviation: "overpaying", status: "all" } });
		const btn = screen.getByRole("button", { name: "Фильтры" });
		expect(btn.querySelector(".bg-primary")).toBeInTheDocument();
	});
});
