import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ApiError } from "@/data/api-error";
import { setTokens } from "@/data/auth";
import * as settingsApi from "@/data/settings-api";
import { _resetWorkspaceStore, _setUserSettings, fetchSettingsMock } from "@/data/workspace-mock-data";
import { makeSettings, mockHostname } from "@/test-utils";
import { ProfilePage } from "./profile-page";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const MOCK_SETTINGS = makeSettings();

let queryClient: QueryClient;

function LoginStub() {
	return <div data-testid="login-page">Login</div>;
}

function renderProfile(initialEntries = ["/profile"]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route path="/profile" element={<ProfilePage />} />
					<Route path="/login" element={<LoginStub />} />
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

describe("ProfilePage", () => {
	test("shows loading skeleton while fetching", () => {
		vi.spyOn(settingsApi, "fetchSettings").mockReturnValueOnce(new Promise(() => {}));

		renderProfile();

		expect(screen.getByTestId("profile-skeleton")).toBeInTheDocument();
	});

	test("renders avatar with initials and color from avatar_icon", async () => {
		renderProfile();

		await waitFor(() => {
			expect(screen.getByText("ИИ")).toBeInTheDocument();
		});

		const avatar = screen.getByText("ИИ").closest("[data-testid='profile-avatar']");
		expect(avatar).toBeInTheDocument();
	});

	test("renders full name below avatar", async () => {
		renderProfile();

		await waitFor(() => {
			expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
		});
	});

	test("renders registration date in Russian locale", async () => {
		renderProfile();

		await waitFor(() => {
			const dateText = screen.getByTestId("profile-date-joined");
			expect(dateText).toHaveTextContent(/15/);
			expect(dateText).toHaveTextContent(/2024/);
		});
	});

	test("defaults to Аккаунт tab when no param", async () => {
		renderProfile();

		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Аккаунт" })).toHaveAttribute("aria-selected", "true");
		});

		expect(screen.getByRole("tab", { name: "Настройки" })).toHaveAttribute("aria-selected", "false");
	});

	test("switches to Настройки tab via URL param", async () => {
		renderProfile(["/profile?tab=settings"]);

		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Настройки" })).toHaveAttribute("aria-selected", "true");
		});

		expect(screen.getByRole("tab", { name: "Аккаунт" })).toHaveAttribute("aria-selected", "false");
	});

	test("clicking tab switches active tab", async () => {
		renderProfile();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Аккаунт" })).toHaveAttribute("aria-selected", "true");
		});

		await user.click(screen.getByRole("tab", { name: "Настройки" }));

		expect(screen.getByRole("tab", { name: "Настройки" })).toHaveAttribute("aria-selected", "true");
		expect(screen.getByRole("tab", { name: "Аккаунт" })).toHaveAttribute("aria-selected", "false");
	});

	test("shows error state with retry button on fetch failure", async () => {
		const spy = vi.spyOn(settingsApi, "fetchSettings");
		spy.mockRejectedValueOnce(new Error("boom"));

		renderProfile();

		await waitFor(() => {
			expect(screen.getByText("Не удалось загрузить профиль")).toBeInTheDocument();
		});

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Повторить" }));

		await waitFor(() => {
			expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
		});
	});

	test("Настройки tab shows password form", async () => {
		renderProfile(["/profile?tab=settings"]);

		await waitFor(() => {
			expect(screen.getByText("Безопасность")).toBeInTheDocument();
		});
	});

	test("account form renders fields populated with server data", async () => {
		renderProfile();

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
		});

		expect(screen.getByLabelText("Фамилия")).toHaveValue("Иванов");
		expect(screen.getByLabelText("Email")).toHaveValue("ivan@example.com");
		expect(screen.getByLabelText("Email")).toHaveAttribute("readOnly");
		expect(screen.getByLabelText("Телефон")).toHaveValue("9991234567");
		expect(screen.getByLabelText("Получать сервисные уведомления на почту")).toBeChecked();
	});

	test("save button is disabled until a field is changed", async () => {
		renderProfile();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		});

		await user.clear(screen.getByLabelText("Имя"));
		await user.type(screen.getByLabelText("Имя"), "Пётр");

		expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
	});

	test("submitting persists the patch and shows success toast", async () => {
		renderProfile();
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
		});

		expect(toast.success).toHaveBeenCalledWith("Изменения сохранены");
	});

	test("save button disables again after successful save", async () => {
		renderProfile();
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

	test("server field-level errors display inline", async () => {
		vi.spyOn(settingsApi, "patchSettings").mockRejectedValueOnce(
			new ApiError(400, { first_name: ["Слишком длинное имя"] }),
		);

		renderProfile();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
		});

		await user.clear(screen.getByLabelText("Имя"));
		await user.type(screen.getByLabelText("Имя"), "Пётр");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(screen.getByText("Слишком длинное имя")).toBeInTheDocument();
		});
	});

	test("non-field server error shows toast", async () => {
		vi.spyOn(settingsApi, "patchSettings").mockRejectedValueOnce(new ApiError(400, { detail: "Ошибка сервера" }));

		renderProfile();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
		});

		await user.clear(screen.getByLabelText("Имя"));
		await user.type(screen.getByLabelText("Имя"), "Пётр");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Ошибка сервера");
		});
	});

	test("phone change prepends +7 in the persisted store", async () => {
		renderProfile();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Телефон")).toHaveValue("9991234567");
		});

		await user.clear(screen.getByLabelText("Телефон"));
		await user.type(screen.getByLabelText("Телефон"), "1112223344");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(async () => {
			const current = await fetchSettingsMock();
			expect(current.phone).toBe("+71112223344");
		});
	});

	test("toggling mailing checkbox marks form as dirty", async () => {
		renderProfile();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		});

		await user.click(screen.getByLabelText("Получать сервисные уведомления на почту"));

		expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
	});

	test("settings tab renders password form with three fields", async () => {
		renderProfile(["/profile?tab=settings"]);

		await waitFor(() => {
			expect(screen.getByText("Безопасность")).toBeInTheDocument();
		});

		expect(screen.getByLabelText("Текущий пароль")).toBeInTheDocument();
		expect(screen.getByLabelText("Новый пароль")).toBeInTheDocument();
		expect(screen.getByLabelText("Подтвердите пароль")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Изменить пароль" })).toBeInTheDocument();
	});

	test("password mismatch shows client-side error on submit", async () => {
		renderProfile(["/profile?tab=settings"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Текущий пароль")).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText("Текущий пароль"), "oldpass");
		await user.type(screen.getByLabelText("Новый пароль"), "newpass123");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "different");
		await user.click(screen.getByRole("button", { name: "Изменить пароль" }));

		expect(screen.getByText("Пароли не совпадают")).toBeInTheDocument();
	});

	test("successful password change shows toast and redirects to /login", async () => {
		renderProfile(["/profile?tab=settings"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Текущий пароль")).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText("Текущий пароль"), "oldpass");
		await user.type(screen.getByLabelText("Новый пароль"), "newpass123");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "newpass123");
		await user.click(screen.getByRole("button", { name: "Изменить пароль" }));

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith("Пароль успешно изменён");
		});

		await waitFor(() => {
			expect(screen.getByTestId("login-page")).toBeInTheDocument();
		});
	});

	test("submit button shows loading state during request", async () => {
		vi.spyOn(settingsApi, "changePassword").mockReturnValueOnce(new Promise(() => {}));

		renderProfile(["/profile?tab=settings"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Текущий пароль")).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText("Текущий пароль"), "oldpass");
		await user.type(screen.getByLabelText("Новый пароль"), "newpass123");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "newpass123");
		await user.click(screen.getByRole("button", { name: "Изменить пароль" }));

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Изменить пароль" })).toBeDisabled();
		});
	});
});
