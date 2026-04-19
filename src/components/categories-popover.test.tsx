import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Folder } from "@/data/types";
import { CategoriesPopover } from "./categories-popover";

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

interface RenderOptions {
	activeFolder?: string | undefined;
	foldersLoading?: boolean;
	folders?: Folder[];
	onFolderSelect?: (folder: string | undefined) => void;
	onCreateFolder?: (name: string, color: string) => void;
	onRenameFolder?: (id: string, name: string) => void;
	onRecolorFolder?: (id: string, color: string) => void;
	onDeleteFolder?: (id: string) => void;
}

function renderPopover(opts: RenderOptions = {}) {
	const onFolderSelect = opts.onFolderSelect ?? vi.fn();
	const onCreateFolder = opts.onCreateFolder ?? vi.fn();
	const onRenameFolder = opts.onRenameFolder ?? vi.fn();
	const onRecolorFolder = opts.onRecolorFolder ?? vi.fn();
	const onDeleteFolder = opts.onDeleteFolder ?? vi.fn();

	const utils = render(
		<TooltipProvider>
			<CategoriesPopover
				folders={opts.folders ?? MOCK_FOLDERS}
				folderCounts={MOCK_COUNTS}
				foldersLoading={opts.foldersLoading}
				activeFolder={opts.activeFolder}
				onFolderSelect={onFolderSelect}
				onCreateFolder={onCreateFolder}
				onRenameFolder={onRenameFolder}
				onRecolorFolder={onRecolorFolder}
				onDeleteFolder={onDeleteFolder}
			/>
		</TooltipProvider>,
	);

	return {
		...utils,
		mocks: { onFolderSelect, onCreateFolder, onRenameFolder, onRecolorFolder, onDeleteFolder },
	};
}

function openPopover() {
	fireEvent.click(screen.getByRole("button", { name: "Категории" }));
}

async function openFolderMenu(folderName: string) {
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: `Меню категории ${folderName}` }));
	await screen.findByText("Переименовать");
}

beforeEach(() => {
	localStorage.clear();
});

describe("CategoriesPopover — trigger", () => {
	test("renders trigger button", () => {
		renderPopover();
		expect(screen.getByRole("button", { name: "Категории" })).toBeInTheDocument();
	});

	test("no active dot when no folder is selected", () => {
		renderPopover();
		const btn = screen.getByRole("button", { name: "Категории" });
		expect(btn.querySelector(".bg-primary")).not.toBeInTheDocument();
	});

	test("shows active dot when a folder is selected", () => {
		renderPopover({ activeFolder: "f1" });
		const btn = screen.getByRole("button", { name: "Категории" });
		expect(btn.querySelector(".bg-primary")).toBeInTheDocument();
	});

	test("shows active dot when activeFolder is 'none'", () => {
		renderPopover({ activeFolder: "none" });
		const btn = screen.getByRole("button", { name: "Категории" });
		expect(btn.querySelector(".bg-primary")).toBeInTheDocument();
	});

	test("no active dot when activeFolder is 'archive'", () => {
		renderPopover({ activeFolder: "archive" });
		const btn = screen.getByRole("button", { name: "Категории" });
		expect(btn.querySelector(".bg-primary")).not.toBeInTheDocument();
	});
});

describe("CategoriesPopover — list", () => {
	test("does not render 'Все закупки' entry", () => {
		renderPopover();
		openPopover();

		expect(screen.queryByText("Все закупки")).not.toBeInTheDocument();
	});

	test("renders 'Без категории' with count", () => {
		renderPopover();
		openPopover();

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

		const dot = screen.getByTestId("categories-folder-dot-f1");
		expect(dot.style.backgroundColor).toBe("var(--folder-blue)");
	});

	test("clicking Без категории calls onFolderSelect('none')", () => {
		const onFolderSelect = vi.fn();
		renderPopover({ onFolderSelect });
		openPopover();

		fireEvent.click(screen.getByText("Без категории"));
		expect(onFolderSelect).toHaveBeenCalledWith("none");
	});

	test("clicking active 'Без категории' clears the selection", () => {
		const onFolderSelect = vi.fn();
		renderPopover({ activeFolder: "none", onFolderSelect });
		openPopover();

		fireEvent.click(screen.getByText("Без категории"));
		expect(onFolderSelect).toHaveBeenCalledWith(undefined);
	});

	test("clicking a folder calls onFolderSelect with folder id", () => {
		const onFolderSelect = vi.fn();
		renderPopover({ onFolderSelect });
		openPopover();

		fireEvent.click(screen.getByText("Металлопрокат"));
		expect(onFolderSelect).toHaveBeenCalledWith("f1");
	});

	test("clicking active folder clears the selection", () => {
		const onFolderSelect = vi.fn();
		renderPopover({ activeFolder: "f1", onFolderSelect });
		openPopover();

		fireEvent.click(screen.getByText("Металлопрокат"));
		expect(onFolderSelect).toHaveBeenCalledWith(undefined);
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

		expect(screen.getByTestId("categories-folder-skeletons")).toBeInTheDocument();
		expect(screen.queryByText("Металлопрокат")).not.toBeInTheDocument();
	});
});

describe("CategoriesPopover — folder CRUD (create)", () => {
	test("renders 'Создать категорию' button at the bottom of the list", () => {
		renderPopover();
		openPopover();

		const section = screen.getByTestId("categories-section");
		const createBtn = screen.getByRole("button", { name: /Создать категорию/ });
		expect(section).toContainElement(createBtn);

		const folderBtn = screen.getByText("Металлопрокат").closest("button") as HTMLElement;
		expect(createBtn.compareDocumentPosition(folderBtn) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
	});

	test("clicking 'Создать категорию' reveals inline input", async () => {
		renderPopover();
		openPopover();

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Создать категорию/ }));
		expect(await screen.findByRole("textbox", { name: "Название категории" })).toBeInTheDocument();
	});

	test("Enter with a name calls onCreateFolder with next unused color", async () => {
		const onCreateFolder = vi.fn();
		renderPopover({ onCreateFolder });
		openPopover();

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Создать категорию/ }));

		const input = await screen.findByRole("textbox", { name: "Название категории" });
		await user.type(input, "Тест{Enter}");

		expect(onCreateFolder).toHaveBeenCalledWith("Тест", "red");
	});

	test("color picker changes the saved color", async () => {
		const onCreateFolder = vi.fn();
		renderPopover({ onCreateFolder });
		openPopover();

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Создать категорию/ }));

		const colorToggle = await screen.findByRole("button", { name: "Выбрать цвет категории" });
		await user.click(colorToggle);
		await user.click(screen.getByRole("button", { name: "Цвет: purple" }));

		const input = screen.getByRole("textbox", { name: "Название категории" });
		await user.type(input, "Разное{Enter}");

		expect(onCreateFolder).toHaveBeenCalledWith("Разное", "purple");
	});

	test("Esc cancels creation", async () => {
		const onCreateFolder = vi.fn();
		renderPopover({ onCreateFolder });
		openPopover();

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Создать категорию/ }));

		const input = await screen.findByRole("textbox", { name: "Название категории" });
		await user.type(input, "Тест{Escape}");

		expect(onCreateFolder).not.toHaveBeenCalled();
		expect(screen.queryByRole("textbox", { name: "Название категории" })).not.toBeInTheDocument();
	});
});

describe("CategoriesPopover — folder CRUD (rename)", () => {
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

describe("CategoriesPopover — folder CRUD (recolor)", () => {
	test("color picker shows 8 dots", async () => {
		renderPopover();
		openPopover();
		await openFolderMenu("Металлопрокат");

		const picker = screen.getByTestId("categories-color-picker-f1");
		const dots = picker.querySelectorAll("button");
		expect(dots).toHaveLength(8);
	});

	test("active color has checkmark", async () => {
		renderPopover();
		openPopover();
		await openFolderMenu("Металлопрокат");

		const blueBtn = screen.getByTestId("categories-color-dot-blue");
		expect(blueBtn.querySelector('[data-testid="categories-color-check"]')).toBeInTheDocument();
	});

	test("clicking a color calls onRecolorFolder", async () => {
		const onRecolorFolder = vi.fn();
		renderPopover({ onRecolorFolder });
		openPopover();
		await openFolderMenu("Металлопрокат");

		fireEvent.click(screen.getByTestId("categories-color-dot-red"));

		expect(onRecolorFolder).toHaveBeenCalledWith("f1", "red");
	});
});

describe("CategoriesPopover — folder CRUD (delete)", () => {
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

	test("deleting active folder clears the folder selection", async () => {
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
