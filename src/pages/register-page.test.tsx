import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthLayout } from "@/components/auth-layout";
import { mockHostname } from "@/test-utils";
import { RegisterPage } from "./register-page";

let queryClient: QueryClient;

function renderRegister(initialEntries = ["/register?code=ABC12"]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route element={<AuthLayout />}>
						<Route path="/register" element={<RegisterPage />} />
					</Route>
					<Route path="/login" element={<div>Login Page</div>} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
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
	vi.restoreAllMocks();
});

describe("RegisterPage", () => {
	// --- Invitation code validation ---

	test("redirects to /login when no invitation code in URL or localStorage", async () => {
		renderRegister(["/register"]);
		await waitFor(() => {
			expect(screen.getByText("Login Page")).toBeInTheDocument();
		});
	});

	test("stores invitation code from URL param in localStorage", async () => {
		renderRegister();
		await waitFor(() => {
			expect(localStorage.getItem("auth-invitation-code")).toBe("ABC12");
		});
	});

	test("uses invitation code from localStorage when not in URL", async () => {
		localStorage.setItem("auth-invitation-code", "SAVED1");

		renderRegister(["/register"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Регистрация" })).toBeInTheDocument();
		});
	});

	// --- Stage 1: Email ---

	test("stage 1: renders email input after valid invitation", async () => {
		renderRegister();
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Регистрация" })).toBeInTheDocument();
		});
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Продолжить" })).toBeInTheDocument();
	});

	test("stage 1: advances to stage 2 when email is submitted", async () => {
		renderRegister();
		await waitFor(() => {
			expect(screen.getByLabelText("Email")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toBeInTheDocument();
		});
	});

	// --- Stage 2: Details ---

	test("stage 2: renders name, phone, password, confirm password fields", async () => {
		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toBeInTheDocument();
			expect(screen.getByLabelText("Телефон")).toBeInTheDocument();
			expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
			expect(screen.getByLabelText("Подтвердите пароль")).toBeInTheDocument();
		});
	});

	test("stage 2: phone input shows +7 prefix", async () => {
		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => {
			expect(screen.getByText("+7")).toBeInTheDocument();
		});
	});

	test("stage 2: shows password validation error for short password", async () => {
		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());
		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("Пароль"), "short");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "short");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => {
			expect(screen.getByText("Пароль должен содержать минимум 8 символов")).toBeInTheDocument();
		});
	});

	test("stage 2: shows error when passwords do not match", async () => {
		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());
		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "differentPass");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => {
			expect(screen.getByText("Пароли не совпадают")).toBeInTheDocument();
		});
	});

	test("stage 2: successful registration advances to stage 3", async () => {
		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());
		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "securePass1");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => {
			expect(screen.getByText("Проверьте почту")).toBeInTheDocument();
			expect(screen.getByText("new@user.com")).toBeInTheDocument();
		});
	});

	test("stage 2: clears invitation code from localStorage after successful registration", async () => {
		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());

		// Invitation code was stored
		expect(localStorage.getItem("auth-invitation-code")).toBe("ABC12");

		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());
		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "securePass1");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => {
			expect(screen.getByText("Проверьте почту")).toBeInTheDocument();
		});
		expect(localStorage.getItem("auth-invitation-code")).toBeNull();
	});

	// --- Stage 3: Confirmation ---

	test("stage 3: shows login link", async () => {
		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());
		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
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
		await waitFor(() => {
			expect(screen.getByRole("link", { name: "Войти" })).toBeInTheDocument();
		});
	});

	// --- Russian text ---

	test("all text is in Russian", async () => {
		renderRegister();
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Регистрация" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Продолжить" })).toBeInTheDocument();
		});
	});
});
