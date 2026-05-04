import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { SessionClient } from "@/data/clients/session-client";
import { createInMemorySessionClient } from "@/data/clients/session-in-memory";
import { _resetMockDelay, _setMockDelay } from "@/data/mock-utils";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient } from "@/test-utils";
import { SettingsSidebar } from "./settings-sidebar";

function renderSidebar(
	initialPath = "/settings/profile",
	session: SessionClient = createInMemorySessionClient({ refreshAvailable: true }),
) {
	const queryClient = createTestQueryClient();
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ session }}>
			<MemoryRouter initialEntries={[initialPath]}>
				<Routes>
					<Route path="*" element={<SettingsSidebar />} />
				</Routes>
			</MemoryRouter>
		</TestClientsProvider>,
	);
}

describe("SettingsSidebar sections", () => {
	test("renders Пользователь section with Профиль item", () => {
		renderSidebar();
		expect(screen.getByText("Пользователь")).toBeInTheDocument();
		expect(screen.getByText("Профиль")).toBeInTheDocument();
	});

	test("renders Рабочее пространство section with all items including Почты", () => {
		renderSidebar();
		expect(screen.getByText("Рабочее пространство")).toBeInTheDocument();
		expect(screen.getByText("Общие настройки")).toBeInTheDocument();
		expect(screen.getByText("Компании")).toBeInTheDocument();
		expect(screen.getByText("Сотрудники")).toBeInTheDocument();
		expect(screen.getByText("Почты")).toBeInTheDocument();
	});

	test("Аккаунт section contains Тарифы and no Выход", () => {
		renderSidebar();
		expect(screen.getByText("Аккаунт")).toBeInTheDocument();
		expect(screen.getByText("Тарифы")).toBeInTheDocument();
		expect(screen.queryByText("Выход")).not.toBeInTheDocument();
	});

	test("workspace items appear in expected order", () => {
		renderSidebar();
		const sectionLabel = screen.getByText("Рабочее пространство");
		const section = sectionLabel.closest("div")?.parentElement as HTMLElement;
		const buttons = section.querySelectorAll("button");
		expect(buttons[0]).toHaveTextContent("Общие настройки");
		expect(buttons[1]).toHaveTextContent("Компании");
		expect(buttons[2]).toHaveTextContent("Сотрудники");
		expect(buttons[3]).toHaveTextContent("Почты");
	});
});

describe("SettingsSidebar active item", () => {
	test("highlights Профиль when at /settings/profile", () => {
		renderSidebar("/settings/profile");
		const btn = screen.getByText("Профиль").closest("button") as HTMLElement;
		expect(btn.className).toContain("bg-sidebar-accent");
	});

	test("highlights Почты when at /settings/emails", () => {
		renderSidebar("/settings/emails");
		const btn = screen.getByText("Почты").closest("button") as HTMLElement;
		expect(btn.className).toContain("bg-sidebar-accent");
	});

	test("highlights Тарифы when at /settings/tariffs", () => {
		renderSidebar("/settings/tariffs");
		const btn = screen.getByText("Тарифы").closest("button") as HTMLElement;
		expect(btn.className).toContain("bg-sidebar-accent");
	});

	test("does not highlight inactive items", () => {
		renderSidebar("/settings/profile");
		const btn = screen.getByText("Компании").closest("button") as HTMLElement;
		expect(btn.className).not.toContain("font-medium");
	});
});

describe("SettingsSidebar logout", () => {
	beforeEach(() => {
		_setMockDelay(0, 0);
		localStorage.clear();
		sessionStorage.clear();
	});

	afterEach(() => {
		_resetMockDelay();
		vi.restoreAllMocks();
	});

	test("renders Выйти option", () => {
		renderSidebar();
		expect(screen.getByRole("button", { name: "Выйти" })).toBeInTheDocument();
	});

	test("Выйти uses destructive styling", () => {
		renderSidebar();
		const btn = screen.getByRole("button", { name: "Выйти" });
		expect(btn.className).toContain("text-destructive");
	});

	test("clicking Выйти invokes the logout flow and clears the access token", async () => {
		sessionStorage.setItem("auth-access-token", "token");
		const logout = vi.fn().mockResolvedValue(undefined);
		const session: SessionClient = {
			login: () => Promise.reject(new Error("not used")),
			refresh: () => Promise.reject(new Error("not used")),
			logout,
			register: () => Promise.reject(new Error("not used")),
			confirmEmail: () => Promise.reject(new Error("not used")),
			checkEmail: () => Promise.reject(new Error("not used")),
			resendConfirmation: () => Promise.reject(new Error("not used")),
		};
		renderSidebar("/settings/profile", session);

		await userEvent.setup().click(screen.getByRole("button", { name: "Выйти" }));

		await waitFor(() => {
			expect(logout).toHaveBeenCalledOnce();
		});
		await waitFor(() => {
			expect(sessionStorage.getItem("auth-access-token")).toBeNull();
		});
	});
});
