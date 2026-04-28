import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setTokens } from "@/data/auth";
import type { ProfileClient } from "@/data/clients/profile-client";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import { fakeProfileClient, TestClientsProvider } from "@/data/test-clients-provider";
import { makeSettings, mockHostname } from "@/test-utils";
import { ProfilePage } from "./profile-page";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const MOCK_SETTINGS = makeSettings();

let queryClient: QueryClient;
let profileClient: ProfileClient;

function LoginStub() {
	return <div data-testid="login-page">Login</div>;
}

function renderProfile(opts: { initialEntries?: string[]; profile?: ProfileClient } = {}) {
	profileClient = opts.profile ?? createInMemoryProfileClient({ settings: MOCK_SETTINGS });
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ profile: profileClient }}>
			<MemoryRouter initialEntries={opts.initialEntries ?? ["/profile"]}>
				<Routes>
					<Route path="/profile" element={<ProfilePage />} />
					<Route path="/login" element={<LoginStub />} />
				</Routes>
			</MemoryRouter>
		</TestClientsProvider>,
	);
}

beforeEach(() => {
	localStorage.clear();
	mockHostname("acme.localhost");
	setTokens("test-access");
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("ProfilePage", () => {
	test("shows loading skeleton while fetching", () => {
		renderProfile({
			profile: fakeProfileClient({
				settings: () => new Promise(() => {}),
			}),
		});

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
		renderProfile({ initialEntries: ["/profile?tab=settings"] });

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
		const profile = createInMemoryProfileClient({ settings: MOCK_SETTINGS });
		const original = profile.settings;
		profile.settings = vi.fn().mockRejectedValueOnce(new Error("boom")).mockImplementation(original);

		renderProfile({ profile });

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
		renderProfile({ initialEntries: ["/profile?tab=settings"] });

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
			const current = await profileClient.settings();
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

	test("save failure surfaces generic toast", async () => {
		const profile = createInMemoryProfileClient({ settings: MOCK_SETTINGS });
		profile.update = vi.fn().mockRejectedValueOnce(new Error("boom"));

		renderProfile({ profile });
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
		});

		await user.clear(screen.getByLabelText("Имя"));
		await user.type(screen.getByLabelText("Имя"), "Пётр");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Произошла ошибка. Попробуйте ещё раз.");
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
			const current = await profileClient.settings();
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
		renderProfile({ initialEntries: ["/profile?tab=settings"] });

		await waitFor(() => {
			expect(screen.getByText("Безопасность")).toBeInTheDocument();
		});

		expect(screen.getByLabelText("Текущий пароль")).toBeInTheDocument();
		expect(screen.getByLabelText("Новый пароль")).toBeInTheDocument();
		expect(screen.getByLabelText("Подтвердите пароль")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Изменить пароль" })).toBeInTheDocument();
	});

	test("password mismatch shows client-side error on submit", async () => {
		renderProfile({ initialEntries: ["/profile?tab=settings"] });
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
		renderProfile({ initialEntries: ["/profile?tab=settings"] });
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
		const profile = createInMemoryProfileClient({ settings: MOCK_SETTINGS });
		profile.changePassword = () => new Promise(() => {});

		renderProfile({ initialEntries: ["/profile?tab=settings"], profile });
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
