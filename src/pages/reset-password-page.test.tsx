import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthLayout } from "@/components/auth-layout";
import type { SessionClient } from "@/data/clients/session-client";
import { ValidationError } from "@/data/errors";
import { fakeSessionClient, TestClientsProvider } from "@/data/test-clients-provider";
import { mockHostname } from "@/test-utils";
import { ResetPasswordPage } from "./reset-password-page";

let queryClient: QueryClient;

function buildSession(overrides: Partial<SessionClient> = {}): SessionClient {
	return fakeSessionClient({
		resetPassword: vi.fn().mockResolvedValue(undefined),
		...overrides,
	});
}

function renderResetPassword({
	initialEntries = ["/reset-password"],
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
						<Route path="/reset-password" element={<ResetPasswordPage />} />
					</Route>
					<Route path="/login" element={<div>Login Page</div>} />
					<Route path="/forgot-password" element={<div>Forgot Password Page</div>} />
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

const VALID_LINK = "/reset-password?uid=42&token=reset-abc";

describe("ResetPasswordPage", () => {
	test("missing uid: shows invalid-link state with link to /forgot-password", () => {
		renderResetPassword({ initialEntries: ["/reset-password?token=only-token"] });
		expect(screen.getByRole("heading", { name: "Ссылка недействительна" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Запросить ссылку" })).toHaveAttribute("href", "/forgot-password");
	});

	test("missing token: shows invalid-link state with link to /forgot-password", () => {
		renderResetPassword({ initialEntries: ["/reset-password?uid=42"] });
		expect(screen.getByRole("heading", { name: "Ссылка недействительна" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Запросить ссылку" })).toHaveAttribute("href", "/forgot-password");
	});

	test("renders password inputs and submit button when uid+token present", () => {
		renderResetPassword({ initialEntries: [VALID_LINK] });
		expect(screen.getByRole("heading", { name: "Новый пароль" })).toBeInTheDocument();
		expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
		expect(screen.getByLabelText("Подтвердите пароль")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Сохранить" })).toBeInTheDocument();
	});

	test("inline error: short password (client-side validation)", async () => {
		renderResetPassword({ initialEntries: [VALID_LINK] });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Пароль"), "short");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "short");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		expect(screen.getByText("Пароль должен содержать минимум 10 символов")).toBeInTheDocument();
	});

	test("inline error: passwords do not match (client-side validation)", async () => {
		renderResetPassword({ initialEntries: [VALID_LINK] });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Пароль"), "newSecure1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "differentPass1");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		expect(screen.getByText("Пароли не совпадают")).toBeInTheDocument();
	});

	test("submit dispatches the full uid+token+new_password+new_password_confirm payload", async () => {
		const resetPassword = vi.fn().mockResolvedValue(undefined);
		const session = buildSession({ resetPassword });
		renderResetPassword({ initialEntries: [VALID_LINK], session });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Пароль"), "newSecure1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "newSecure1");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(resetPassword).toHaveBeenCalledWith({
				uid: "42",
				token: "reset-abc",
				new_password: "newSecure1",
				new_password_confirm: "newSecure1",
			});
		});
	});

	test("on success: shows 'Пароль изменён' with link to /login", async () => {
		renderResetPassword({ initialEntries: [VALID_LINK] });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Пароль"), "newSecure1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "newSecure1");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Пароль изменён" })).toBeInTheDocument();
		});
		await user.click(screen.getByRole("link", { name: "Перейти к входу" }));
		expect(screen.getByText("Login Page")).toBeInTheDocument();
	});

	test("on invalid_or_expired_link: surfaces translated banner with link to /forgot-password", async () => {
		const resetPassword = vi.fn().mockRejectedValue(new ValidationError({}, { code: "invalid_or_expired_link" }));
		const session = buildSession({ resetPassword });
		renderResetPassword({ initialEntries: [VALID_LINK], session });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Пароль"), "newSecure1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "newSecure1");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(screen.getByText("Ссылка недействительна или истекла")).toBeInTheDocument();
		});
		expect(screen.getByRole("link", { name: "Запросить новую ссылку" })).toHaveAttribute("href", "/forgot-password");
	});

	test("backend ValidationError on new_password surfaces a translated field error (password_too_common)", async () => {
		const resetPassword = vi
			.fn()
			.mockRejectedValue(
				new ValidationError({}, { new_password: [{ code: "password_too_common", message: "Too common" }] }),
			);
		const session = buildSession({ resetPassword });
		renderResetPassword({ initialEntries: [VALID_LINK], session });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Пароль"), "newSecure1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "newSecure1");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(screen.getByText("Пароль слишком распространён")).toBeInTheDocument();
		});
	});
});
