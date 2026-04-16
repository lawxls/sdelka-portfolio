import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setTokens } from "@/data/auth";
import * as authApi from "@/data/auth-api";
import * as settingsApi from "@/data/settings-api";
import { _resetWorkspaceStore, _setUserSettings, fetchSettingsMock } from "@/data/workspace-mock-data";
import { makeSettings, mockHostname } from "@/test-utils";
import { ProfileSettingsPage } from "./profile-settings-page";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const MOCK_SETTINGS = makeSettings({ patronymic: "Иванович" });

let queryClient: QueryClient;

function renderPage() {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={["/settings/profile"]}>
				<Routes>
					<Route path="*" element={<ProfileSettingsPage />} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	localStorage.clear();
	mockHostname("acme.localhost");
	setTokens("test-access", "test-refresh");
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	vi.spyOn(console, "error").mockImplementation(() => {});
	_setUserSettings(MOCK_SETTINGS);
});

afterEach(() => {
	_resetWorkspaceStore();
	vi.restoreAllMocks();
});

describe("ProfileSettingsPage", () => {
	test("renders user data from mock store in form fields", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
		});
		expect(screen.getByLabelText("Фамилия")).toHaveValue("Иванов");
		expect(screen.getByLabelText("Отчество")).toHaveValue("Иванович");
		expect(screen.getByLabelText("Почта")).toHaveValue("ivan@example.com");
	});

	test("email field is read-only", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByLabelText("Почта")).toBeInTheDocument();
		});
		expect(screen.getByLabelText("Почта")).toHaveAttribute("readOnly");
	});

	test("save patches the store with changed fields only", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
		});

		await user.clear(screen.getByLabelText("Имя"));
		await user.type(screen.getByLabelText("Имя"), "Пётр");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(async () => {
			const current = await fetchSettingsMock();
			expect(current.first_name).toBe("Пётр");
			expect(current.last_name).toBe(MOCK_SETTINGS.last_name);
		});
		expect(toast.success).toHaveBeenCalledWith("Изменения сохранены");
	});

	test("inline validation error for invalid phone", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Номер телефона")).toBeInTheDocument();
		});

		await user.clear(screen.getByLabelText("Номер телефона"));
		await user.type(screen.getByLabelText("Номер телефона"), "abc");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		expect(screen.getByText(/неверный формат/i)).toBeInTheDocument();
	});

	test("Изменить пароль section renders with description and button", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Изменить пароль" })).toBeInTheDocument();
		});
		expect(screen.getByText("Получить письмо со ссылкой для обновления пароля")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Изменить пароль" })).toBeInTheDocument();
	});

	test("Изменить пароль calls forgotPassword with user email", async () => {
		const forgotSpy = vi.spyOn(authApi, "forgotPassword");

		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Изменить пароль" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Изменить пароль" }));

		await waitFor(() => {
			expect(forgotSpy).toHaveBeenCalledWith("ivan@example.com");
		});
		expect(toast.success).toHaveBeenCalledWith("Письмо отправлено");
	});

	test("shows error state with retry button when settings request fails", async () => {
		vi.spyOn(settingsApi, "fetchSettings").mockRejectedValueOnce(new Error("boom"));
		renderPage();
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();
		});
		expect(screen.queryByTestId("profile-skeleton")).not.toBeInTheDocument();
	});

	test("submit button is disabled during in-flight request", async () => {
		vi.spyOn(settingsApi, "patchSettings").mockReturnValueOnce(new Promise<never>(() => {}));

		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
		});

		await user.clear(screen.getByLabelText("Имя"));
		await user.type(screen.getByLabelText("Имя"), "Пётр");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		});
	});

	test("email notifications checkbox reflects mailing_allowed from API", async () => {
		_setUserSettings(makeSettings({ patronymic: "Иванович", mailing_allowed: false }));
		renderPage();
		await waitFor(() => {
			expect(screen.getByRole("checkbox", { name: /уведомления/i })).toBeInTheDocument();
		});
		expect(screen.getByRole("checkbox", { name: /уведомления/i })).not.toBeChecked();
	});

	test("toggling email notifications checkbox enables Save", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("checkbox", { name: /уведомления/i })).toBeInTheDocument();
		});

		expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		await user.click(screen.getByRole("checkbox", { name: /уведомления/i }));
		expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
	});

	test("save includes mailing_allowed in the persisted store", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("checkbox", { name: /уведомления/i })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("checkbox", { name: /уведомления/i }));
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(async () => {
			const current = await fetchSettingsMock();
			expect(current.mailing_allowed).toBe(false);
		});
		expect(toast.success).toHaveBeenCalledWith("Изменения сохранены");
	});
});
