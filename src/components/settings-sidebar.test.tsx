import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import * as auth from "@/data/auth";
import { SettingsSidebar } from "./settings-sidebar";

function renderSidebar(
	props: { open?: boolean; onOpenChange?: (v: boolean) => void } = {},
	initialPath = "/settings/profile",
) {
	const { open = true, onOpenChange = vi.fn() } = props;
	return render(
		<MemoryRouter initialEntries={[initialPath]}>
			<Routes>
				<Route path="*" element={<SettingsSidebar open={open} onOpenChange={onOpenChange} />} />
			</Routes>
		</MemoryRouter>,
	);
}

function mockNonDesktop() {
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

beforeEach(() => {
	localStorage.clear();
});

describe("SettingsSidebar sections", () => {
	test("renders Пользователь section with Профиль item", () => {
		renderSidebar();
		expect(screen.getByText("Пользователь")).toBeInTheDocument();
		expect(screen.getByText("Профиль")).toBeInTheDocument();
	});

	test("renders Рабочее пространство section with Компании and Сотрудники", () => {
		renderSidebar();
		expect(screen.getByText("Рабочее пространство")).toBeInTheDocument();
		expect(screen.getByText("Компании")).toBeInTheDocument();
		expect(screen.getByText("Сотрудники")).toBeInTheDocument();
	});

	test("renders Выход item at the bottom", () => {
		renderSidebar();
		expect(screen.getByText("Выход")).toBeInTheDocument();
	});
});

describe("SettingsSidebar active item", () => {
	test("highlights Профиль when at /settings/profile", () => {
		renderSidebar({}, "/settings/profile");
		const btn = screen.getByText("Профиль").closest("button") as HTMLElement;
		expect(btn.className).toContain("bg-sidebar-accent");
	});

	test("highlights Компании when at /settings/companies", () => {
		renderSidebar({}, "/settings/companies");
		const btn = screen.getByText("Компании").closest("button") as HTMLElement;
		expect(btn.className).toContain("bg-sidebar-accent");
	});

	test("highlights Сотрудники when at /settings/employees", () => {
		renderSidebar({}, "/settings/employees");
		const btn = screen.getByText("Сотрудники").closest("button") as HTMLElement;
		expect(btn.className).toContain("bg-sidebar-accent");
	});

	test("does not highlight inactive items", () => {
		renderSidebar({}, "/settings/profile");
		const btn = screen.getByText("Компании").closest("button") as HTMLElement;
		expect(btn.className).not.toContain("font-medium");
	});
});

describe("SettingsSidebar logout", () => {
	test("clicking Выход calls clearTokens", async () => {
		const clearTokens = vi.spyOn(auth, "clearTokens").mockImplementation(() => {});
		renderSidebar();

		await userEvent.setup().click(screen.getByText("Выход"));

		expect(clearTokens).toHaveBeenCalledOnce();
		vi.restoreAllMocks();
	});
});

describe("SettingsSidebar collapse/expand", () => {
	test("when closed, shows expand button and hides nav content", () => {
		renderSidebar({ open: false });
		expect(screen.queryByText("Профиль")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Открыть боковую панель" })).toBeInTheDocument();
	});

	test("expand button calls onOpenChange(true)", async () => {
		const onOpenChange = vi.fn();
		renderSidebar({ open: false, onOpenChange });

		await userEvent.setup().click(screen.getByRole("button", { name: "Открыть боковую панель" }));

		expect(onOpenChange).toHaveBeenCalledWith(true);
	});

	test("close button calls onOpenChange(false)", async () => {
		const onOpenChange = vi.fn();
		renderSidebar({ open: true, onOpenChange });

		await userEvent.setup().click(screen.getByRole("button", { name: "Закрыть боковую панель" }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});

describe("SettingsSidebar mobile", () => {
	test("renders as overlay when open on mobile", () => {
		mockNonDesktop();
		renderSidebar({ open: true });

		expect(screen.getByTestId("settings-sidebar-overlay")).toBeInTheDocument();
		expect(screen.getByText("Профиль")).toBeInTheDocument();
		vi.restoreAllMocks();
	});

	test("clicking backdrop calls onOpenChange(false) on mobile", async () => {
		mockNonDesktop();
		const onOpenChange = vi.fn();
		renderSidebar({ open: true, onOpenChange });

		// The backdrop is the aria-hidden div
		const overlay = screen.getByTestId("settings-sidebar-overlay");
		const backdrop = overlay.querySelector("[aria-hidden='true']") as HTMLElement;
		await userEvent.setup().click(backdrop);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		vi.restoreAllMocks();
	});

	test("does not persist to localStorage when closing on mobile", async () => {
		mockNonDesktop();
		const onOpenChange = vi.fn();
		renderSidebar({ open: true, onOpenChange });

		await userEvent.setup().click(screen.getByRole("button", { name: "Закрыть боковую панель" }));

		expect(localStorage.getItem("settings-sidebar-open")).toBeNull();
		vi.restoreAllMocks();
	});
});
