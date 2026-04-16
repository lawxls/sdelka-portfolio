import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthLayout } from "@/components/auth-layout";
import { mockHostname } from "@/test-utils";
import { ForgotPasswordPage } from "./forgot-password-page";

let queryClient: QueryClient;

function renderForgotPassword(initialEntries = ["/forgot-password"]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route element={<AuthLayout />}>
						<Route path="/forgot-password" element={<ForgotPasswordPage />} />
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

describe("ForgotPasswordPage", () => {
	test("renders email input and submit button", () => {
		renderForgotPassword();
		expect(screen.getByRole("heading", { name: "Восстановление пароля" })).toBeInTheDocument();
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отправить" })).toBeInTheDocument();
	});

	test("back to login link navigates to /login", async () => {
		renderForgotPassword();
		const user = userEvent.setup();
		await user.click(screen.getByRole("link", { name: "Назад к входу" }));
		expect(screen.getByText("Login Page")).toBeInTheDocument();
	});

	test("shows back to login link after submission", async () => {
		renderForgotPassword();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Email"), "user@example.com");
		await user.click(screen.getByRole("button", { name: "Отправить" }));

		await waitFor(() => {
			expect(screen.getByText("Проверьте почту")).toBeInTheDocument();
		});
		await user.click(screen.getByRole("link", { name: "Назад к входу" }));
		expect(screen.getByText("Login Page")).toBeInTheDocument();
	});

	test("all text is in Russian", () => {
		renderForgotPassword();
		expect(screen.getByRole("heading", { name: "Восстановление пароля" })).toBeInTheDocument();
		expect(screen.getByText("Введите email для восстановления доступа")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отправить" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Назад к входу" })).toBeInTheDocument();
	});

	test("submits email and shows confirmation message", async () => {
		renderForgotPassword();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Email"), "user@example.com");
		await user.click(screen.getByRole("button", { name: "Отправить" }));

		await waitFor(() => {
			expect(screen.getByText("Проверьте почту")).toBeInTheDocument();
		});
		expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
	});
});
