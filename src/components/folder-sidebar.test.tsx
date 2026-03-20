import { render, screen } from "@testing-library/react";
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

	test("renders 'Новая папка' button (disabled placeholder)", () => {
		render(<FolderSidebar {...makeProps()} />);
		const btn = screen.getByRole("button", { name: /Новая папка/ });
		expect(btn).toBeDisabled();
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
