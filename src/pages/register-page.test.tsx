import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthLayout } from "@/components/auth-layout";
import type { SessionClient } from "@/data/clients/session-client";
import { createInMemorySessionClient } from "@/data/clients/session-in-memory";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { mockHostname } from "@/test-utils";
import { RegisterPage } from "./register-page";

let queryClient: QueryClient;

function renderRegister({
	initialEntries = ["/register"],
	session,
}: {
	initialEntries?: string[];
	session?: SessionClient;
} = {}) {
	const sessionClient =
		session ??
		createInMemorySessionClient({
			users: [
				{
					email: "taken@example.com",
					password: "anything-1",
					user: { id: 1, email: "taken@example.com" },
				},
			],
		});
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ session: sessionClient }}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route element={<AuthLayout />}>
						<Route path="/register" element={<RegisterPage />} />
					</Route>
					<Route path="/login" element={<div>Login Page</div>} />
				</Routes>
			</MemoryRouter>
		</TestClientsProvider>,
	);
}

beforeEach(() => {
	mockHostname("acme.localhost");
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
});

afterEach(() => {
	localStorage.clear();
	sessionStorage.clear();
	vi.restoreAllMocks();
});

describe("RegisterPage", () => {
	// --- Stage 1: Email ---

	test("renders email input on mount (no invitation-code gate)", async () => {
		renderRegister();
		expect(screen.getByRole("heading", { name: "Регистрация" })).toBeInTheDocument();
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Продолжить" })).toBeInTheDocument();
	});

	test("stage 1: advances to stage 2 when email is unique", async () => {
		renderRegister();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toBeInTheDocument();
		});
	});

	test("stage 1: surfaces an inline 'email taken' error and stays on the email step", async () => {
		renderRegister();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "taken@example.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => {
			expect(screen.getByText("Этот email уже зарегистрирован")).toBeInTheDocument();
		});
		expect(screen.queryByLabelText("Имя")).not.toBeInTheDocument();
	});

	// --- Stage 2: Details ---

	test("stage 2: renders all required fields plus optional patronymic", async () => {
		renderRegister();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toBeInTheDocument();
		});
		expect(screen.getByLabelText("Фамилия")).toBeInTheDocument();
		expect(screen.getByLabelText("Отчество")).toBeInTheDocument();
		expect(screen.getByLabelText("Телефон")).toBeInTheDocument();
		expect(screen.getByLabelText("ИНН компании")).toBeInTheDocument();
		expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
		expect(screen.getByLabelText("Подтвердите пароль")).toBeInTheDocument();
	});

	test("stage 2: shows password validation error for short password", async () => {
		renderRegister();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));
		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());

		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Фамилия"), "Иванов");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("ИНН компании"), "7707083893");
		await user.type(screen.getByLabelText("Пароль"), "short");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "short");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => {
			expect(screen.getByText("Пароль должен содержать минимум 10 символов")).toBeInTheDocument();
		});
	});

	test("stage 2: shows error when passwords do not match", async () => {
		renderRegister();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));
		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());

		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Фамилия"), "Иванов");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("ИНН компании"), "7707083893");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "differentPass");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => {
			expect(screen.getByText("Пароли не совпадают")).toBeInTheDocument();
		});
	});

	test("stage 2: successful registration sends inn + password_confirm + phone in payload and advances to stage 3", async () => {
		const register = vi.fn().mockResolvedValue({ user: { id: 99, email: "new@user.com" } });
		const checkEmail = vi.fn().mockResolvedValue({ exists: false });
		const session: SessionClient = {
			login: vi.fn(),
			refresh: vi.fn(),
			logout: vi.fn(),
			register,
			confirmEmail: vi.fn(),
			checkEmail,
			resendConfirmation: vi.fn(),
			forgotPassword: vi.fn(),
			resetPassword: vi.fn(),
			requestPasswordChange: vi.fn(),
		};

		renderRegister({ session });
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));
		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());

		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Фамилия"), "Иванов");
		await user.type(screen.getByLabelText("Отчество"), "Петрович");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("ИНН компании"), "7707083893");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "securePass1");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => {
			expect(screen.getByText("Проверьте почту")).toBeInTheDocument();
		});
		expect(screen.getByText("new@user.com")).toBeInTheDocument();

		expect(register).toHaveBeenCalledWith({
			email: "new@user.com",
			password: "securePass1",
			password_confirm: "securePass1",
			first_name: "Иван",
			last_name: "Иванов",
			patronymic: "Петрович",
			phone: "+79991234567",
			inn: "7707083893",
		});
	});

	test("stage 2: omits patronymic from payload when left blank", async () => {
		const register = vi.fn().mockResolvedValue({ user: { id: 99, email: "new@user.com" } });
		const checkEmail = vi.fn().mockResolvedValue({ exists: false });
		const session: SessionClient = {
			login: vi.fn(),
			refresh: vi.fn(),
			logout: vi.fn(),
			register,
			confirmEmail: vi.fn(),
			checkEmail,
			resendConfirmation: vi.fn(),
			forgotPassword: vi.fn(),
			resetPassword: vi.fn(),
			requestPasswordChange: vi.fn(),
		};

		renderRegister({ session });
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));
		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());

		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Фамилия"), "Иванов");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("ИНН компании"), "7707083893");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "securePass1");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => expect(screen.getByText("Проверьте почту")).toBeInTheDocument());
		expect(register).toHaveBeenCalledWith(expect.objectContaining({ patronymic: undefined }));
	});

	test("stage 2: surfaces backend ValidationError field codes via the translator", async () => {
		const { ValidationError } = await import("@/data/errors");
		const register = vi
			.fn()
			.mockRejectedValue(
				new ValidationError({}, { password: [{ code: "password_too_common", message: "Too common" }] }),
			);
		const checkEmail = vi.fn().mockResolvedValue({ exists: false });
		const session: SessionClient = {
			login: vi.fn(),
			refresh: vi.fn(),
			logout: vi.fn(),
			register,
			confirmEmail: vi.fn(),
			checkEmail,
			resendConfirmation: vi.fn(),
			forgotPassword: vi.fn(),
			resetPassword: vi.fn(),
			requestPasswordChange: vi.fn(),
		};

		renderRegister({ session });
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));
		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());

		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Фамилия"), "Иванов");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("ИНН компании"), "7707083893");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "securePass1");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => {
			expect(screen.getByText("Пароль слишком распространён")).toBeInTheDocument();
		});
	});

	// --- Stage 3: Confirmation ---

	test("stage 3: shows confirmation screen with email and login link", async () => {
		renderRegister();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));
		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());

		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Фамилия"), "Иванов");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("ИНН компании"), "7707083893");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "securePass1");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => expect(screen.getByText("Проверьте почту")).toBeInTheDocument());
		const loginLink = screen.getByRole("link", { name: "Войти" });
		expect(loginLink).toHaveAttribute("href", "/login");
	});

	// --- Cross-navigation ---

	test("renders 'Уже есть аккаунт? Войти' link", async () => {
		renderRegister();
		expect(screen.getByRole("link", { name: "Войти" })).toBeInTheDocument();
	});
});
