import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import * as auth from "@/data/auth";
import { SettingsSidebar } from "./settings-sidebar";

function renderSidebar(path = "/settings/profile", open = true) {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<SettingsSidebar open={open} onOpenChange={vi.fn()} />
		</MemoryRouter>,
	);
}

beforeEach(() => {
	vi.restoreAllMocks();
});

describe("SettingsSidebar", () => {
	test("renders section headers", () => {
		renderSidebar();
		expect(screen.getByText("Пользователь")).toBeInTheDocument();
		expect(screen.getByText("Рабочее пространство")).toBeInTheDocument();
	});

	test("renders nav items Профиль, Компании, Сотрудники", () => {
		renderSidebar();
		expect(screen.getByRole("link", { name: "Профиль" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Компании" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Сотрудники" })).toBeInTheDocument();
	});

	test("highlights active Профиль when on /settings/profile", () => {
		renderSidebar("/settings/profile");
		const link = screen.getByRole("link", { name: "Профиль" });
		expect(link).toHaveAttribute("aria-current", "page");
	});

	test("highlights active Компании when on /settings/companies", () => {
		renderSidebar("/settings/companies");
		const link = screen.getByRole("link", { name: "Компании" });
		expect(link).toHaveAttribute("aria-current", "page");
	});

	test("logout button calls clearTokens", async () => {
		const clearTokensSpy = vi.spyOn(auth, "clearTokens").mockImplementation(() => {});
		renderSidebar();
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Выйти" }));
		expect(clearTokensSpy).toHaveBeenCalledOnce();
	});

	test("when closed renders only open toggle button", () => {
		renderSidebar("/settings/profile", false);
		expect(screen.queryByRole("link", { name: "Профиль" })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Открыть настройки" })).toBeInTheDocument();
	});

	test("calls onOpenChange when close button clicked", async () => {
		const onOpenChange = vi.fn();
		const user = userEvent.setup();
		render(
			<MemoryRouter initialEntries={["/settings/profile"]}>
				<SettingsSidebar open onOpenChange={onOpenChange} />
			</MemoryRouter>,
		);
		await user.click(screen.getByRole("button", { name: "Закрыть настройки" }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
