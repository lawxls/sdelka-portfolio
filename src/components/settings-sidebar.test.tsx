import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import type { SessionClient } from "@/data/clients/session-client";
import { createInMemorySessionClient } from "@/data/clients/session-in-memory";
import type { CurrentEmployee } from "@/data/domains/profile";
import { _resetMockDelay, _setMockDelay } from "@/data/mock-utils";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient, makeMe } from "@/test-utils";
import { SettingsSidebar } from "./settings-sidebar";

function renderSidebar(
	initialPath = "/settings/profile",
	session: SessionClient = createInMemorySessionClient({ refreshAvailable: true }),
	me: CurrentEmployee = makeMe(),
) {
	const queryClient = createTestQueryClient();
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ session, profile: createInMemoryProfileClient({ me }) }}>
			<MemoryRouter initialEntries={[initialPath]}>
				<Routes>
					<Route path="*" element={<SettingsSidebar />} />
				</Routes>
			</MemoryRouter>
		</TestClientsProvider>,
	);
}

describe("SettingsSidebar sections", () => {
	test("Аккаунт section is first and contains Профиль then Тарифы", async () => {
		renderSidebar();
		const sectionLabel = await screen.findByText("Аккаунт");
		const section = sectionLabel.closest("div")?.parentElement as HTMLElement;
		const buttons = section.querySelectorAll("button");
		expect(buttons[0]).toHaveTextContent("Профиль");
		expect(buttons[1]).toHaveTextContent("Тарифы");
	});

	test("does not render the legacy Пользователь section header", async () => {
		renderSidebar();
		await screen.findByText("Аккаунт");
		expect(screen.queryByText("Пользователь")).not.toBeInTheDocument();
	});

	test("renders Рабочее пространство section with all items including Почты", async () => {
		renderSidebar();
		expect(await screen.findByText("Рабочее пространство")).toBeInTheDocument();
		expect(screen.getByText("Общие настройки")).toBeInTheDocument();
		expect(screen.getByText("Компании")).toBeInTheDocument();
		expect(screen.getByText("Сотрудники")).toBeInTheDocument();
		expect(screen.getByText("Почты")).toBeInTheDocument();
	});

	test("workspace items appear in expected order", async () => {
		renderSidebar();
		const sectionLabel = await screen.findByText("Рабочее пространство");
		const section = sectionLabel.closest("div")?.parentElement as HTMLElement;
		const buttons = section.querySelectorAll("button");
		expect(buttons[0]).toHaveTextContent("Общие настройки");
		expect(buttons[1]).toHaveTextContent("Компании");
		expect(buttons[2]).toHaveTextContent("Сотрудники");
		expect(buttons[3]).toHaveTextContent("Почты");
	});
});

describe("SettingsSidebar active item", () => {
	test("highlights Профиль when at /settings/profile", async () => {
		renderSidebar("/settings/profile");
		const btn = (await screen.findByText("Профиль")).closest("button") as HTMLElement;
		expect(btn.className).toContain("bg-sidebar-accent");
	});

	test("highlights Почты when at /settings/emails", async () => {
		renderSidebar("/settings/emails");
		const btn = (await screen.findByText("Почты")).closest("button") as HTMLElement;
		expect(btn.className).toContain("bg-sidebar-accent");
	});

	test("highlights Тарифы when at /settings/tariffs", async () => {
		renderSidebar("/settings/tariffs");
		const btn = (await screen.findByText("Тарифы")).closest("button") as HTMLElement;
		expect(btn.className).toContain("bg-sidebar-accent");
	});

	test("does not highlight inactive items", async () => {
		renderSidebar("/settings/profile");
		const btn = (await screen.findByText("Компании")).closest("button") as HTMLElement;
		expect(btn.className).not.toContain("font-medium");
	});
});

describe("SettingsSidebar permission filtering", () => {
	test("user with only emails view sees Почты but no other workspace items", async () => {
		const me = makeMe({
			role: "user",
			isWorkspaceOwner: false,
			permissions: {
				id: "p-1",
				employeeId: "1",
				procurementInquiries: "none",
				positions: "none",
				tasks: "none",
				workspaceSettings: "none",
				companies: "none",
				employees: "none",
				emails: "view",
			},
		});
		renderSidebar("/settings/profile", createInMemorySessionClient({ refreshAvailable: true }), me);
		expect(await screen.findByText("Почты")).toBeInTheDocument();
		expect(screen.queryByText("Общие настройки")).not.toBeInTheDocument();
		expect(screen.queryByText("Компании")).not.toBeInTheDocument();
		expect(screen.queryByText("Сотрудники")).not.toBeInTheDocument();
	});

	test("Рабочее пространство header collapses when all workspace items are hidden", async () => {
		const me = makeMe({
			role: "user",
			isWorkspaceOwner: false,
			permissions: {
				id: "p-1",
				employeeId: "1",
				procurementInquiries: "view",
				positions: "view",
				tasks: "view",
				workspaceSettings: "none",
				companies: "none",
				employees: "none",
				emails: "none",
			},
		});
		renderSidebar("/settings/profile", createInMemorySessionClient({ refreshAvailable: true }), me);
		expect(await screen.findByText("Аккаунт")).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.queryByText("Рабочее пространство")).not.toBeInTheDocument();
		});
	});

	test("Аккаунт section is always rendered, even for archived-only user", async () => {
		const me = makeMe({ role: null, permissions: null, isWorkspaceOwner: false });
		renderSidebar("/settings/profile", createInMemorySessionClient({ refreshAvailable: true }), me);
		expect(await screen.findByText("Аккаунт")).toBeInTheDocument();
		expect(screen.getByText("Профиль")).toBeInTheDocument();
		expect(screen.getByText("Тарифы")).toBeInTheDocument();
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

	test("renders Выйти option", async () => {
		renderSidebar();
		expect(await screen.findByRole("button", { name: "Выйти" })).toBeInTheDocument();
	});

	test("Выйти uses destructive styling", async () => {
		renderSidebar();
		const btn = await screen.findByRole("button", { name: "Выйти" });
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
			forgotPassword: () => Promise.reject(new Error("not used")),
			resetPassword: () => Promise.reject(new Error("not used")),
			requestPasswordChange: () => Promise.reject(new Error("not used")),
			impersonate: () => Promise.reject(new Error("not used")),
			inviteAccept: () => Promise.reject(new Error("not used")),
		};
		renderSidebar("/settings/profile", session);

		await userEvent.setup().click(await screen.findByRole("button", { name: "Выйти" }));

		await waitFor(() => {
			expect(logout).toHaveBeenCalledOnce();
		});
		await waitFor(() => {
			expect(sessionStorage.getItem("auth-access-token")).toBeNull();
		});
	});
});
