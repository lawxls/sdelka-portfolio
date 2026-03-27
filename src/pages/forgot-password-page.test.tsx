import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthLayout } from "@/components/auth-layout";
import { server } from "@/test-msw";
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
		server.use(
			http.post("/api/v1/auth/forgot-password", () => {
				return HttpResponse.json({ detail: "Password reset email sent" });
			}),
		);

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

	test("button disabled during submission", async () => {
		let resolveRequest: (() => void) | undefined;
		server.use(
			http.post("/api/v1/auth/forgot-password", () => {
				return new Promise((resolve) => {
					resolveRequest = () => resolve(HttpResponse.json({ detail: "sent" }));
				});
			}),
		);

		renderForgotPassword();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Email"), "user@example.com");
		await user.click(screen.getByRole("button", { name: "Отправить" }));

		expect(screen.getByRole("button", { name: "Отправить" })).toBeDisabled();

		resolveRequest?.();
	});

	test("shows error message when request fails", async () => {
		server.use(
			http.post("/api/v1/auth/forgot-password", () => {
				return HttpResponse.json({ detail: "Server error" }, { status: 500 });
			}),
		);

		renderForgotPassword();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Email"), "user@example.com");
		await user.click(screen.getByRole("button", { name: "Отправить" }));

		await waitFor(() => {
			expect(screen.getByText("Не удалось отправить запрос. Попробуйте позже")).toBeInTheDocument();
		});
		// Should stay on the form, not show confirmation
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		// Button re-enabled after failure
		expect(screen.getByRole("button", { name: "Отправить" })).toBeEnabled();
	});

	test("submits email and shows confirmation message", async () => {
		server.use(
			http.post("/api/v1/auth/forgot-password", () => {
				return HttpResponse.json({ detail: "Password reset email sent" });
			}),
		);

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
