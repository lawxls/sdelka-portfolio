import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthLayout } from "@/components/auth-layout";
import { mockHostname } from "@/test-utils";
import { ResetPasswordPage } from "./reset-password-page";

let queryClient: QueryClient;

function renderResetPassword(initialEntries = ["/reset-password"]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route element={<AuthLayout />}>
						<Route path="/reset-password" element={<ResetPasswordPage />} />
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

describe("ResetPasswordPage", () => {
	test("shows error when no token in URL", () => {
		renderResetPassword(["/reset-password"]);
		expect(screen.getByText("Ссылка недействительна")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Перейти к входу" })).toBeInTheDocument();
	});

	test("renders password inputs with toggle and submit button", () => {
		renderResetPassword(["/reset-password?token=uid-token-123"]);
		expect(screen.getByRole("heading", { name: "Новый пароль" })).toBeInTheDocument();
		expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
		expect(screen.getByLabelText("Подтвердите пароль")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Сохранить" })).toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: "Показать пароль" })).toHaveLength(2);
	});

	test("shows inline error for short password", async () => {
		renderResetPassword(["/reset-password?token=uid-token-123"]);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Пароль"), "short");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "short");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		expect(screen.getByText("Пароль должен содержать минимум 8 символов")).toBeInTheDocument();
	});

	test("shows inline error for all-numeric password", async () => {
		renderResetPassword(["/reset-password?token=uid-token-123"]);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Пароль"), "12345678");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "12345678");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		expect(screen.getByText("Пароль не может состоять только из цифр")).toBeInTheDocument();
	});

	test("submits and shows success message", async () => {
		renderResetPassword(["/reset-password?token=uid-token-123"]);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Пароль"), "newSecure1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "newSecure1");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(screen.getByText("Пароль изменён")).toBeInTheDocument();
		});
		expect(screen.getByRole("link", { name: "Перейти к входу" })).toBeInTheDocument();
	});

	test("shows error when passwords do not match", async () => {
		renderResetPassword(["/reset-password?token=uid-token-123"]);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "differentPass1");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		expect(screen.getByText("Пароли не совпадают")).toBeInTheDocument();
	});

	test("login link navigates on success", async () => {
		renderResetPassword(["/reset-password?token=uid-token-123"]);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Пароль"), "newSecure1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "newSecure1");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(screen.getByRole("link", { name: "Перейти к входу" })).toBeInTheDocument();
		});
		await user.click(screen.getByRole("link", { name: "Перейти к входу" }));
		expect(screen.getByText("Login Page")).toBeInTheDocument();
	});

	test("all text is in Russian", () => {
		renderResetPassword(["/reset-password?token=uid-token-123"]);
		expect(screen.getByRole("heading", { name: "Новый пароль" })).toBeInTheDocument();
		expect(screen.getByText("Введите новый пароль")).toBeInTheDocument();
		expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
		expect(screen.getByLabelText("Подтвердите пароль")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Сохранить" })).toBeInTheDocument();
	});
});
