import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CompanySummary, FilterState, Folder } from "@/data/types";
import { makeCompany } from "@/test-utils";
import { FiltersPopover } from "./filters-popover";

const MOCK_FOLDERS: Folder[] = [
	{ id: "f1", name: "Металлопрокат", color: "blue" },
	{ id: "f2", name: "Стройматериалы", color: "green" },
];

const MOCK_COUNTS: Record<string, number> = {
	all: 75,
	none: 47,
	f1: 18,
	f2: 10,
};

const COMPANIES: CompanySummary[] = [
	makeCompany("c1", { name: "Альфа", procurementItemCount: 15 }),
	makeCompany("c2", { name: "Бета", procurementItemCount: 8 }),
];

const DEFAULT_FILTERS: FilterState = { deviation: "all", status: "all" };

interface RenderOptions {
	filters?: FilterState;
	activeFolder?: string | undefined;
	companies?: CompanySummary[];
	selectedCompany?: string | undefined;
	showCompanies?: boolean;
	foldersLoading?: boolean;
	folders?: Folder[];
	onFiltersChange?: (filters: FilterState) => void;
	onFolderSelect?: (folder: string | undefined) => void;
	onCreateFolder?: (name: string) => void;
	onRenameFolder?: (id: string, name: string) => void;
	onRecolorFolder?: (id: string, color: string) => void;
	onDeleteFolder?: (id: string) => void;
	onCompanySelect?: (company: string | undefined) => void;
}

function renderPopover(opts: RenderOptions = {}) {
	const onFiltersChange = opts.onFiltersChange ?? vi.fn();
	const onFolderSelect = opts.onFolderSelect ?? vi.fn();
	const onCreateFolder = opts.onCreateFolder ?? vi.fn();
	const onRenameFolder = opts.onRenameFolder ?? vi.fn();
	const onRecolorFolder = opts.onRecolorFolder ?? vi.fn();
	const onDeleteFolder = opts.onDeleteFolder ?? vi.fn();
	const onCompanySelect = opts.onCompanySelect ?? vi.fn();

	const utils = render(
		<TooltipProvider>
			<FiltersPopover
				filters={opts.filters ?? DEFAULT_FILTERS}
				onFiltersChange={onFiltersChange}
				folders={opts.folders ?? MOCK_FOLDERS}
				folderCounts={MOCK_COUNTS}
				foldersLoading={opts.foldersLoading}
				activeFolder={opts.activeFolder}
				onFolderSelect={onFolderSelect}
				onCreateFolder={onCreateFolder}
				onRenameFolder={onRenameFolder}
				onRecolorFolder={onRecolorFolder}
				onDeleteFolder={onDeleteFolder}
				companies={opts.companies ?? COMPANIES}
				selectedCompany={opts.selectedCompany}
				onCompanySelect={onCompanySelect}
				showCompanies={opts.showCompanies ?? false}
			/>
		</TooltipProvider>,
	);

	return {
		...utils,
		mocks: {
			onFiltersChange,
			onFolderSelect,
			onCreateFolder,
			onRenameFolder,
			onRecolorFolder,
			onDeleteFolder,
			onCompanySelect,
		},
	};
}

function openPopover() {
	fireEvent.click(screen.getByRole("button", { name: "Фильтры" }));
}

beforeEach(() => {
	localStorage.clear();
});

describe("FiltersPopover — section visibility", () => {
	test("renders category, deviation, status sections by default", () => {
		renderPopover();
		openPopover();

		expect(screen.getByTestId("filters-section-category")).toBeInTheDocument();
		expect(screen.getByTestId("filters-section-deviation")).toBeInTheDocument();
		expect(screen.getByTestId("filters-section-status")).toBeInTheDocument();
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

	test("sections appear in order: Компания → Категория → Отклонение → Статус", () => {
		renderPopover({ showCompanies: true });
		openPopover();

		const sections = [
			screen.getByTestId("filters-section-company"),
			screen.getByTestId("filters-section-category"),
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

describe("FiltersPopover — Категория section", () => {
	test("renders system entries (Все закупки, Без категории) with counts", () => {
		renderPopover();
		openPopover();

		expect(screen.getByText("Все закупки")).toBeInTheDocument();
		expect(screen.getByText("75")).toBeInTheDocument();
		expect(screen.getByText("Без категории")).toBeInTheDocument();
		expect(screen.getByText("47")).toBeInTheDocument();
	});

	test("renders folders with names, counts, and color dots", () => {
		renderPopover();
		openPopover();

		expect(screen.getByText("Металлопрокат")).toBeInTheDocument();
		expect(screen.getByText("18")).toBeInTheDocument();
		expect(screen.getByText("Стройматериалы")).toBeInTheDocument();
		expect(screen.getByText("10")).toBeInTheDocument();

		const dot = screen.getByTestId("filters-folder-dot-f1");
		expect(dot.style.backgroundColor).toBe("var(--folder-blue)");
	});

	test("clicking Все закупки calls onFolderSelect(undefined)", () => {
		const onFolderSelect = vi.fn();
		renderPopover({ activeFolder: "f1", onFolderSelect });
		openPopover();

		fireEvent.click(screen.getByText("Все закупки"));
		expect(onFolderSelect).toHaveBeenCalledWith(undefined);
	});

	test("clicking Без категории calls onFolderSelect('none')", () => {
		const onFolderSelect = vi.fn();
		renderPopover({ onFolderSelect });
		openPopover();

		fireEvent.click(screen.getByText("Без категории"));
		expect(onFolderSelect).toHaveBeenCalledWith("none");
	});

	test("clicking a folder calls onFolderSelect with folder id", () => {
		const onFolderSelect = vi.fn();
		renderPopover({ onFolderSelect });
		openPopover();

		fireEvent.click(screen.getByText("Металлопрокат"));
		expect(onFolderSelect).toHaveBeenCalledWith("f1");
	});

	test("highlights active folder", () => {
		renderPopover({ activeFolder: "f1" });
		openPopover();

		const btn = screen.getByText("Металлопрокат").closest("button") as HTMLElement;
		expect(btn.className).toContain("text-highlight-foreground");
	});

	test("shows skeletons while foldersLoading", () => {
		renderPopover({ foldersLoading: true });
		openPopover();

		expect(screen.getByTestId("filters-folder-skeletons")).toBeInTheDocument();
		expect(screen.queryByText("Металлопрокат")).not.toBeInTheDocument();
	});
});

describe("FiltersPopover — folder CRUD (create)", () => {
	test("clicking Новая категория shows inline input", async () => {
		renderPopover();
		openPopover();

		fireEvent.click(screen.getByRole("button", { name: "Новая категория" }));
		expect(screen.getByRole("textbox", { name: "Название категории" })).toBeInTheDocument();
	});

	test("Enter with a name calls onCreateFolder", async () => {
		const onCreateFolder = vi.fn();
		renderPopover({ onCreateFolder });
		openPopover();

		fireEvent.click(screen.getByRole("button", { name: "Новая категория" }));
		const input = screen.getByRole("textbox", { name: "Название категории" });
		const user = userEvent.setup();
		await user.type(input, "Тест{Enter}");

		expect(onCreateFolder).toHaveBeenCalledWith("Тест");
	});

	test("Esc cancels creation", async () => {
		const onCreateFolder = vi.fn();
		renderPopover({ onCreateFolder });
		openPopover();

		fireEvent.click(screen.getByRole("button", { name: "Новая категория" }));
		const input = screen.getByRole("textbox", { name: "Название категории" });
		const user = userEvent.setup();
		await user.type(input, "Тест{Escape}");

		expect(onCreateFolder).not.toHaveBeenCalled();
		expect(screen.queryByRole("textbox", { name: "Название категории" })).not.toBeInTheDocument();
	});

	test("creation row shows color dot", async () => {
		renderPopover();
		openPopover();

		fireEvent.click(screen.getByRole("button", { name: "Новая категория" }));
		expect(screen.getByTestId("creating-folder-dot")).toBeInTheDocument();
	});
});

async function openFolderMenu(folderName: string) {
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: `Меню категории ${folderName}` }));
	await screen.findByText("Переименовать");
}

describe("FiltersPopover — folder CRUD (rename)", () => {
	test("clicking Переименовать shows inline input with current name", async () => {
		renderPopover();
		openPopover();
		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Переименовать"));

		const input = screen.getByDisplayValue("Металлопрокат");
		expect(input).toBeInTheDocument();
	});

	test("Enter saves renamed folder", async () => {
		const onRenameFolder = vi.fn();
		renderPopover({ onRenameFolder });
		openPopover();
		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Переименовать"));

		const input = screen.getByDisplayValue("Металлопрокат");
		const user = userEvent.setup();
		await user.clear(input);
		await user.type(input, "Новое имя{Enter}");

		expect(onRenameFolder).toHaveBeenCalledWith("f1", "Новое имя");
	});

	test("Esc cancels rename", async () => {
		const onRenameFolder = vi.fn();
		renderPopover({ onRenameFolder });
		openPopover();
		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Переименовать"));

		const input = screen.getByDisplayValue("Металлопрокат");
		fireEvent.keyDown(input, { key: "Escape" });

		expect(onRenameFolder).not.toHaveBeenCalled();
	});
});

describe("FiltersPopover — folder CRUD (recolor)", () => {
	test("color picker shows 8 dots", async () => {
		renderPopover();
		openPopover();
		await openFolderMenu("Металлопрокат");

		const picker = screen.getByTestId("filters-color-picker-f1");
		const dots = picker.querySelectorAll("button");
		expect(dots).toHaveLength(8);
	});

	test("active color has checkmark", async () => {
		renderPopover();
		openPopover();
		await openFolderMenu("Металлопрокат");

		const blueBtn = screen.getByTestId("filters-color-dot-blue");
		expect(within(blueBtn).getByTestId("filters-color-check")).toBeInTheDocument();
	});

	test("clicking a color calls onRecolorFolder", async () => {
		const onRecolorFolder = vi.fn();
		renderPopover({ onRecolorFolder });
		openPopover();
		await openFolderMenu("Металлопрокат");

		fireEvent.click(screen.getByTestId("filters-color-dot-red"));

		expect(onRecolorFolder).toHaveBeenCalledWith("f1", "red");
	});
});

describe("FiltersPopover — folder CRUD (delete)", () => {
	test("clicking Удалить shows confirmation dialog", async () => {
		renderPopover();
		openPopover();
		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Удалить"));

		expect(await screen.findByText("Удалить категорию?")).toBeInTheDocument();
	});

	test("confirming delete calls onDeleteFolder", async () => {
		const onDeleteFolder = vi.fn();
		renderPopover({ onDeleteFolder });
		openPopover();
		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Удалить"));

		await screen.findByText("Удалить категорию?");
		fireEvent.click(screen.getByRole("button", { name: "Удалить" }));

		expect(onDeleteFolder).toHaveBeenCalledWith("f1");
	});

	test("cancelling delete does not call onDeleteFolder", async () => {
		const onDeleteFolder = vi.fn();
		renderPopover({ onDeleteFolder });
		openPopover();
		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Удалить"));

		await screen.findByText("Удалить категорию?");
		fireEvent.click(screen.getByRole("button", { name: "Отмена" }));

		expect(onDeleteFolder).not.toHaveBeenCalled();
	});

	test("deleting active folder switches to Все закупки", async () => {
		const onDeleteFolder = vi.fn();
		const onFolderSelect = vi.fn();
		renderPopover({ activeFolder: "f1", onDeleteFolder, onFolderSelect });
		openPopover();
		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Удалить"));

		await screen.findByText("Удалить категорию?");
		fireEvent.click(screen.getByRole("button", { name: "Удалить" }));

		expect(onDeleteFolder).toHaveBeenCalledWith("f1");
		expect(onFolderSelect).toHaveBeenCalledWith(undefined);
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
		expect(within(section).getByText("Ожидание аналитики")).toBeInTheDocument();
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
