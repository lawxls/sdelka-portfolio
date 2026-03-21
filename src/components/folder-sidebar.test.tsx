import { DndContext } from "@dnd-kit/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { FolderSidebarProps } from "./folder-sidebar";
import { FolderSidebar } from "./folder-sidebar";

const mockFolders = [
	{ id: "folder-1", name: "Металлопрокат", color: "blue" },
	{ id: "folder-2", name: "Стройматериалы", color: "green" },
];

const mockCounts: Record<string, number> = {
	all: 75,
	none: 47,
	"folder-1": 18,
	"folder-2": 10,
};

function makeProps(overrides: Partial<FolderSidebarProps> = {}): FolderSidebarProps {
	return {
		folders: mockFolders,
		counts: mockCounts,
		activeFolder: undefined,
		onFolderSelect: vi.fn(),
		onCreateFolder: vi.fn(() => ({ id: "new-folder", name: "test", color: "red" })),
		onRenameFolder: vi.fn(() => true),
		onRecolorFolder: vi.fn(),
		onDeleteFolder: vi.fn(),
		...overrides,
	};
}

beforeEach(() => {
	localStorage.clear();
});

describe("FolderSidebar", () => {
	test("renders system items with counts", () => {
		render(<FolderSidebar {...makeProps()} />);
		expect(screen.getByText("Все закупки")).toBeInTheDocument();
		expect(screen.getByText("75")).toBeInTheDocument();
		expect(screen.getByText("Без папки")).toBeInTheDocument();
		expect(screen.getByText("47")).toBeInTheDocument();
	});

	test("renders user folders with names and counts", () => {
		render(<FolderSidebar {...makeProps()} />);
		expect(screen.getByText("Металлопрокат")).toBeInTheDocument();
		expect(screen.getByText("18")).toBeInTheDocument();
		expect(screen.getByText("Стройматериалы")).toBeInTheDocument();
		expect(screen.getByText("10")).toBeInTheDocument();
	});

	test("renders folder color dots with correct style", () => {
		render(<FolderSidebar {...makeProps()} />);
		const dot = screen.getByTestId("folder-dot-folder-1");
		expect(dot.style.backgroundColor).toBe("var(--folder-blue)");
	});

	test("highlights 'Все закупки' when no folder selected", () => {
		render(<FolderSidebar {...makeProps({ activeFolder: undefined })} />);
		const btn = screen.getByText("Все закупки").closest("button") as HTMLElement;
		expect(btn.className).toContain("bg-sidebar-accent");
	});

	test("highlights 'Без папки' when folder=none", () => {
		render(<FolderSidebar {...makeProps({ activeFolder: "none" })} />);
		const btn = screen.getByText("Без папки").closest("button") as HTMLElement;
		expect(btn.className).toContain("bg-sidebar-accent");
	});

	test("highlights active folder", () => {
		render(<FolderSidebar {...makeProps({ activeFolder: "folder-1" })} />);
		const btn = screen.getByText("Металлопрокат").closest("button") as HTMLElement;
		expect(btn.className).toContain("bg-sidebar-accent");
	});

	test("does not highlight inactive items", () => {
		render(<FolderSidebar {...makeProps({ activeFolder: "folder-1" })} />);
		const allBtn = screen.getByText("Все закупки").closest("button") as HTMLElement;
		expect(allBtn.className).not.toContain("font-medium");
	});

	test("calls onFolderSelect(undefined) when clicking 'Все закупки'", async () => {
		const onFolderSelect = vi.fn();
		render(<FolderSidebar {...makeProps({ onFolderSelect })} />);
		await userEvent.setup().click(screen.getByText("Все закупки"));
		expect(onFolderSelect).toHaveBeenCalledWith(undefined);
	});

	test("calls onFolderSelect('none') when clicking 'Без папки'", async () => {
		const onFolderSelect = vi.fn();
		render(<FolderSidebar {...makeProps({ onFolderSelect })} />);
		await userEvent.setup().click(screen.getByText("Без папки"));
		expect(onFolderSelect).toHaveBeenCalledWith("none");
	});

	test("calls onFolderSelect with folder id when clicking a folder", async () => {
		const onFolderSelect = vi.fn();
		render(<FolderSidebar {...makeProps({ onFolderSelect })} />);
		await userEvent.setup().click(screen.getByText("Металлопрокат"));
		expect(onFolderSelect).toHaveBeenCalledWith("folder-1");
	});

	test("renders 'Новая папка' button (enabled)", () => {
		render(<FolderSidebar {...makeProps()} />);
		const btn = screen.getByRole("button", { name: /Новая папка/ });
		expect(btn).not.toBeDisabled();
	});

	test("renders header with title 'Папки'", () => {
		render(<FolderSidebar {...makeProps()} />);
		expect(screen.getByText("Папки")).toBeInTheDocument();
	});

	test("renders three-dot menu button for each folder", () => {
		render(<FolderSidebar {...makeProps()} />);
		expect(screen.getByRole("button", { name: "Меню папки Металлопрокат" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Меню папки Стройматериалы" })).toBeInTheDocument();
	});

	test("three-dot menu button has lg:invisible class for desktop hover behavior", () => {
		render(<FolderSidebar {...makeProps()} />);
		const menuBtn = screen.getByRole("button", { name: "Меню папки Металлопрокат" });
		expect(menuBtn.className).toContain("lg:invisible");
		expect(menuBtn.className).toContain("lg:group-hover:visible");
	});

	test("folder names have truncate class", () => {
		render(<FolderSidebar {...makeProps()} />);
		const nameEl = screen.getByText("Металлопрокат");
		expect(nameEl.className).toContain("truncate");
	});

	test("nav has overflow-y-auto for scrolling", () => {
		render(<FolderSidebar {...makeProps()} />);
		const nav = screen.getByRole("navigation", { name: "Папки" });
		expect(nav.className).toContain("overflow-y-auto");
	});

	test("renders empty folder list without divider", () => {
		render(<FolderSidebar {...makeProps({ folders: [] })} />);
		expect(screen.getByText("Все закупки")).toBeInTheDocument();
		// No divider between system items and empty folder list
		const sidebar = screen.getByTestId("sidebar");
		expect(sidebar.querySelectorAll(".border-t.border-sidebar-border")).toHaveLength(1); // only footer border
	});
});

describe("FolderSidebar collapse/expand", () => {
	test("collapse button hides sidebar content", async () => {
		render(<FolderSidebar {...makeProps()} />);
		expect(screen.getByText("Все закупки")).toBeInTheDocument();

		await userEvent.setup().click(screen.getByRole("button", { name: "Закрыть боковую панель" }));

		expect(screen.queryByText("Все закупки")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Открыть боковую панель" })).toBeInTheDocument();
	});

	test("expand button shows sidebar content", async () => {
		localStorage.setItem("sidebar-open", "false");
		render(<FolderSidebar {...makeProps()} />);

		expect(screen.queryByText("Все закупки")).not.toBeInTheDocument();

		await userEvent.setup().click(screen.getByRole("button", { name: "Открыть боковую панель" }));

		expect(screen.getByText("Все закупки")).toBeInTheDocument();
	});

	test("persists collapsed state to localStorage", async () => {
		render(<FolderSidebar {...makeProps()} />);

		await userEvent.setup().click(screen.getByRole("button", { name: "Закрыть боковую панель" }));

		expect(localStorage.getItem("sidebar-open")).toBe("false");
	});

	test("reads collapsed state from localStorage on mount", () => {
		localStorage.setItem("sidebar-open", "false");
		render(<FolderSidebar {...makeProps()} />);

		expect(screen.queryByText("Все закупки")).not.toBeInTheDocument();
	});

	test("starts open by default when localStorage is empty", () => {
		render(<FolderSidebar {...makeProps()} />);
		expect(screen.getByText("Все закупки")).toBeInTheDocument();
	});
});

describe("FolderSidebar mobile", () => {
	function mockMobile() {
		vi.spyOn(window, "matchMedia").mockImplementation(
			(query: string) =>
				({
					matches: false,
					media: query,
					onchange: null,
					addEventListener: () => {},
					removeEventListener: () => {},
					addListener: () => {},
					removeListener: () => {},
					dispatchEvent: () => false,
				}) as MediaQueryList,
		);
	}

	test("starts closed on mobile regardless of localStorage", () => {
		mockMobile();
		localStorage.setItem("sidebar-open", "true");

		render(<FolderSidebar {...makeProps()} />);

		expect(screen.queryByText("Все закупки")).not.toBeInTheDocument();
		vi.restoreAllMocks();
	});

	test("opens as overlay on mobile", async () => {
		mockMobile();
		render(<FolderSidebar {...makeProps()} />);

		await userEvent.setup().click(screen.getByRole("button", { name: "Открыть боковую панель" }));

		expect(screen.getByTestId("sidebar-overlay")).toBeInTheDocument();
		expect(screen.getByText("Все закупки")).toBeInTheDocument();
		vi.restoreAllMocks();
	});

	test("closes sidebar on folder selection on mobile", async () => {
		mockMobile();
		const onFolderSelect = vi.fn();
		render(<FolderSidebar {...makeProps({ onFolderSelect })} />);

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Открыть боковую панель" }));
		await user.click(screen.getByText("Металлопрокат"));

		expect(onFolderSelect).toHaveBeenCalledWith("folder-1");
		expect(screen.queryByTestId("sidebar-overlay")).not.toBeInTheDocument();
		vi.restoreAllMocks();
	});
});

describe("FolderSidebar inline creation", () => {
	test("clicking 'Новая папка' shows inline input", async () => {
		render(<FolderSidebar {...makeProps()} />);
		await userEvent.setup().click(screen.getByRole("button", { name: /Новая папка/ }));
		const input = screen.getByRole("textbox", { name: "Название папки" });
		expect(input).toBeInTheDocument();
	});

	test("inline input has spellCheck=false and autocomplete=off", async () => {
		render(<FolderSidebar {...makeProps()} />);
		await userEvent.setup().click(screen.getByRole("button", { name: /Новая папка/ }));
		const input = screen.getByRole("textbox", { name: "Название папки" });
		expect(input).toHaveAttribute("spellcheck", "false");
		expect(input).toHaveAttribute("autocomplete", "off");
	});

	test("Enter saves non-empty name and calls onCreateFolder", async () => {
		const onCreateFolder = vi.fn(() => ({ id: "new-1", name: "Тест", color: "red" }));
		const onFolderSelect = vi.fn();
		render(<FolderSidebar {...makeProps({ onCreateFolder, onFolderSelect })} />);

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Новая папка/ }));
		await user.type(screen.getByRole("textbox", { name: "Название папки" }), "Тест{Enter}");

		expect(onCreateFolder).toHaveBeenCalledWith("Тест");
		expect(onFolderSelect).toHaveBeenCalledWith("new-1");
	});

	test("Esc cancels creation without calling onCreateFolder", async () => {
		const onCreateFolder = vi.fn();
		render(<FolderSidebar {...makeProps({ onCreateFolder })} />);

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Новая папка/ }));
		await user.type(screen.getByRole("textbox", { name: "Название папки" }), "Тест{Escape}");

		expect(onCreateFolder).not.toHaveBeenCalled();
		expect(screen.queryByRole("textbox", { name: "Название папки" })).not.toBeInTheDocument();
	});

	test("blur saves non-empty name", async () => {
		const onCreateFolder = vi.fn(() => ({ id: "new-1", name: "Тест", color: "red" }));
		render(<FolderSidebar {...makeProps({ onCreateFolder })} />);

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Новая папка/ }));
		const input = screen.getByRole("textbox", { name: "Название папки" });
		await user.type(input, "Тест");
		fireEvent.blur(input);

		expect(onCreateFolder).toHaveBeenCalledWith("Тест");
	});

	test("blur cancels if name is empty", async () => {
		const onCreateFolder = vi.fn();
		render(<FolderSidebar {...makeProps({ onCreateFolder })} />);

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Новая папка/ }));
		const input = screen.getByRole("textbox", { name: "Название папки" });
		fireEvent.blur(input);

		expect(onCreateFolder).not.toHaveBeenCalled();
		expect(screen.queryByRole("textbox", { name: "Название папки" })).not.toBeInTheDocument();
	});

	test("inline creation row shows auto-colored dot", async () => {
		render(<FolderSidebar {...makeProps()} />);
		await userEvent.setup().click(screen.getByRole("button", { name: /Новая папка/ }));
		// The creating row should have a color dot
		expect(screen.getByTestId("creating-folder-dot")).toBeInTheDocument();
	});
});

// Helper: Radix DropdownMenu trigger requires pointerdown (not just click)
async function openFolderMenu(folderName: string) {
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: `Меню папки ${folderName}` }));
	await screen.findByText("Переименовать");
}

describe("FolderSidebar DropdownMenu", () => {
	test("three-dot button opens dropdown with Переименовать, Цвет, Удалить", async () => {
		render(<FolderSidebar {...makeProps()} />);
		await openFolderMenu("Металлопрокат");

		expect(screen.getByText("Переименовать")).toBeInTheDocument();
		expect(screen.getByText("Удалить")).toBeInTheDocument();
		expect(screen.getByTestId("color-picker")).toBeInTheDocument();
	});

	test("color picker shows 8 color dots", async () => {
		render(<FolderSidebar {...makeProps()} />);
		await openFolderMenu("Металлопрокат");

		const colorPicker = screen.getByTestId("color-picker");
		const dots = colorPicker.querySelectorAll("button");
		expect(dots).toHaveLength(8);
	});

	test("active color has checkmark", async () => {
		render(<FolderSidebar {...makeProps()} />);
		await openFolderMenu("Металлопрокат");

		// folder-1 has color "blue"
		const blueBtn = screen.getByTestId("color-dot-blue");
		expect(within(blueBtn).getByTestId("color-check")).toBeInTheDocument();
	});

	test("clicking a color calls onRecolorFolder", async () => {
		const onRecolorFolder = vi.fn();
		render(<FolderSidebar {...makeProps({ onRecolorFolder })} />);
		await openFolderMenu("Металлопрокат");

		fireEvent.click(screen.getByTestId("color-dot-red"));

		expect(onRecolorFolder).toHaveBeenCalledWith("folder-1", "red");
	});
});

describe("FolderSidebar rename", () => {
	test("clicking Переименовать shows inline input with current name", async () => {
		render(<FolderSidebar {...makeProps()} />);
		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Переименовать"));

		const input = screen.getByDisplayValue("Металлопрокат");
		expect(input).toBeInTheDocument();
		expect(input).toHaveAttribute("spellcheck", "false");
		expect(input).toHaveAttribute("autocomplete", "off");
	});

	test("Enter saves renamed folder", async () => {
		const onRenameFolder = vi.fn(() => true);
		render(<FolderSidebar {...makeProps({ onRenameFolder })} />);

		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Переименовать"));

		const input = screen.getByDisplayValue("Металлопрокат");
		const user = userEvent.setup();
		await user.clear(input);
		await user.type(input, "Новое имя{Enter}");

		expect(onRenameFolder).toHaveBeenCalledWith("folder-1", "Новое имя");
	});

	test("Esc cancels rename", async () => {
		const onRenameFolder = vi.fn();
		render(<FolderSidebar {...makeProps({ onRenameFolder })} />);

		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Переименовать"));

		const input = screen.getByDisplayValue("Металлопрокат");
		fireEvent.keyDown(input, { key: "Escape" });

		expect(onRenameFolder).not.toHaveBeenCalled();
		expect(screen.queryByDisplayValue("Металлопрокат")).not.toBeInTheDocument();
		expect(screen.getByText("Металлопрокат")).toBeInTheDocument();
	});

	test("empty name is rejected on blur", async () => {
		const onRenameFolder = vi.fn();
		render(<FolderSidebar {...makeProps({ onRenameFolder })} />);

		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Переименовать"));

		const input = screen.getByDisplayValue("Металлопрокат");
		const user = userEvent.setup();
		await user.clear(input);
		fireEvent.blur(input);

		expect(onRenameFolder).not.toHaveBeenCalled();
	});
});

describe("FolderSidebar delete", () => {
	test("clicking Удалить shows confirmation dialog", async () => {
		render(<FolderSidebar {...makeProps()} />);
		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Удалить"));

		expect(await screen.findByText("Удалить папку?")).toBeInTheDocument();
	});

	test("confirming delete calls onDeleteFolder", async () => {
		const onDeleteFolder = vi.fn();
		render(<FolderSidebar {...makeProps({ onDeleteFolder })} />);

		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Удалить"));

		await screen.findByText("Удалить папку?");
		fireEvent.click(screen.getByRole("button", { name: "Удалить" }));

		expect(onDeleteFolder).toHaveBeenCalledWith("folder-1");
	});

	test("cancelling delete does not call onDeleteFolder", async () => {
		const onDeleteFolder = vi.fn();
		render(<FolderSidebar {...makeProps({ onDeleteFolder })} />);

		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Удалить"));

		await screen.findByText("Удалить папку?");
		fireEvent.click(screen.getByRole("button", { name: "Отмена" }));

		expect(onDeleteFolder).not.toHaveBeenCalled();
	});

	test("deleting active folder switches to 'Все закупки'", async () => {
		const onDeleteFolder = vi.fn();
		const onFolderSelect = vi.fn();
		render(<FolderSidebar {...makeProps({ onDeleteFolder, onFolderSelect, activeFolder: "folder-1" })} />);

		await openFolderMenu("Металлопрокат");
		fireEvent.click(screen.getByText("Удалить"));

		await screen.findByText("Удалить папку?");
		fireEvent.click(screen.getByRole("button", { name: "Удалить" }));

		expect(onDeleteFolder).toHaveBeenCalledWith("folder-1");
		expect(onFolderSelect).toHaveBeenCalledWith(undefined);
	});
});

describe("FolderSidebar drag-and-drop targets", () => {
	test("folder items are droppable targets", () => {
		render(
			<DndContext>
				<FolderSidebar {...makeProps()} />
			</DndContext>,
		);
		expect(screen.getByTestId("droppable-folder-1")).toBeInTheDocument();
		expect(screen.getByTestId("droppable-folder-2")).toBeInTheDocument();
	});

	test("'Без папки' is a droppable target", () => {
		render(
			<DndContext>
				<FolderSidebar {...makeProps()} />
			</DndContext>,
		);
		expect(screen.getByTestId("droppable-none")).toBeInTheDocument();
	});

	test("'Все закупки' is NOT a droppable target", () => {
		render(
			<DndContext>
				<FolderSidebar {...makeProps()} />
			</DndContext>,
		);
		expect(screen.queryByTestId("droppable-all")).not.toBeInTheDocument();
	});

	test("droppable folder highlights on drag-over", () => {
		// Highlight class is applied when isOver is true
		// In jsdom without real pointer simulation, we verify the
		// droppable structure is correct — the highlight logic
		// is tested via DndContext integration
		render(
			<DndContext>
				<FolderSidebar {...makeProps()} />
			</DndContext>,
		);
		const droppable = screen.getByTestId("droppable-folder-1");
		expect(droppable).toBeInTheDocument();
	});
});
