import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthLayout } from "@/components/auth-layout";
import type { SessionClient } from "@/data/clients/session-client";
import { fakeSessionClient, TestClientsProvider } from "@/data/test-clients-provider";
import { mockHostname } from "@/test-utils";
import { ForgotPasswordPage } from "./forgot-password-page";

let queryClient: QueryClient;

function buildSession(overrides: Partial<SessionClient> = {}): SessionClient {
	return fakeSessionClient({
		forgotPassword: vi.fn().mockResolvedValue(undefined),
		...overrides,
	});
}

function renderForgotPassword({
	initialEntries = ["/forgot-password"],
	session = buildSession(),
}: {
	initialEntries?: string[];
	session?: SessionClient;
} = {}) {
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ session }}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route element={<AuthLayout />}>
						<Route path="/forgot-password" element={<ForgotPasswordPage />} />
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

	test("submitting fires forgotPassword with the email", async () => {
		const forgotPassword = vi.fn().mockResolvedValue(undefined);
		const session = buildSession({ forgotPassword });
		renderForgotPassword({ session });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Email"), "user@example.com");
		await user.click(screen.getByRole("button", { name: "Отправить" }));

		await waitFor(() => {
			expect(forgotPassword).toHaveBeenCalledWith({ email: "user@example.com" });
		});
	});

	test("shows the anti-enumeration success copy after submission", async () => {
		renderForgotPassword();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Email"), "user@example.com");
		await user.click(screen.getByRole("button", { name: "Отправить" }));

		await waitFor(() => {
			expect(screen.getByText("Проверьте почту")).toBeInTheDocument();
		});
		expect(
			screen.getByText("Если аккаунт существует, мы отправили ссылку для восстановления пароля"),
		).toBeInTheDocument();
		expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
	});

	test("backend rejection still surfaces the success copy (anti-enumeration: defense-in-depth)", async () => {
		const forgotPassword = vi.fn().mockRejectedValue(new Error("network blip"));
		const session = buildSession({ forgotPassword });
		renderForgotPassword({ session });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Email"), "user@example.com");
		await user.click(screen.getByRole("button", { name: "Отправить" }));

		await waitFor(() => {
			expect(screen.getByText("Проверьте почту")).toBeInTheDocument();
		});
	});
});
