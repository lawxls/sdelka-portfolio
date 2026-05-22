import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthLayout } from "@/components/auth-layout";
import type { SessionClient } from "@/data/clients/session-client";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { ResendConfirmationPage } from "./resend-confirmation-page";

let queryClient: QueryClient;

function buildSession(overrides: Partial<SessionClient> = {}): SessionClient {
	return {
		login: vi.fn(),
		refresh: vi.fn(),
		logout: vi.fn(),
		register: vi.fn(),
		confirmEmail: vi.fn(),
		checkEmail: vi.fn(),
		resendConfirmation: vi.fn().mockResolvedValue(undefined),
		forgotPassword: vi.fn(),
		resetPassword: vi.fn(),
		requestPasswordChange: vi.fn(),
		impersonate: vi.fn(),
		inviteAccept: vi.fn(),
		...overrides,
	};
}

function renderResend(initialEntries: string[], session: SessionClient) {
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ session }}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route element={<AuthLayout />}>
						<Route path="/resend-confirmation" element={<ResendConfirmationPage />} />
					</Route>
					<Route path="/login" element={<div>Login Page</div>} />
				</Routes>
			</MemoryRouter>
		</TestClientsProvider>,
	);
}

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("ResendConfirmationPage", () => {
	test("renders email input pre-filled from ?email= query param", () => {
		const session = buildSession();
		renderResend(["/resend-confirmation?email=user@example.com"], session);
		expect(screen.getByLabelText("Email")).toHaveValue("user@example.com");
	});

	test("renders an empty email input when ?email= is absent", () => {
		const session = buildSession();
		renderResend(["/resend-confirmation"], session);
		expect(screen.getByLabelText("Email")).toHaveValue("");
	});

	test("submitting fires resendConfirmation with the email and shows the anti-enumeration success copy", async () => {
		const resendConfirmation = vi.fn().mockResolvedValue(undefined);
		const session = buildSession({ resendConfirmation });
		renderResend(["/resend-confirmation?email=user@example.com"], session);

		await userEvent.setup().click(screen.getByRole("button", { name: "Отправить ссылку" }));

		await waitFor(() => {
			expect(resendConfirmation).toHaveBeenCalledWith("user@example.com");
		});
		expect(screen.getByRole("heading", { name: "Проверьте почту" })).toBeInTheDocument();
		expect(screen.getByText(/Если аккаунт существует/)).toBeInTheDocument();
	});

	test("still shows the success copy when the backend rejects (no enumeration leak)", async () => {
		const resendConfirmation = vi.fn().mockRejectedValue(new Error("network blip"));
		const session = buildSession({ resendConfirmation });
		renderResend(["/resend-confirmation?email=user@example.com"], session);

		await userEvent.setup().click(screen.getByRole("button", { name: "Отправить ссылку" }));

		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Проверьте почту" })).toBeInTheDocument();
		});
		expect(resendConfirmation).toHaveBeenCalledOnce();
	});

	test("renders a link back to /login on the form view", () => {
		const session = buildSession();
		renderResend(["/resend-confirmation?email=user@example.com"], session);
		expect(screen.getByRole("link", { name: "Назад к входу" })).toBeInTheDocument();
	});

	test("renders a link back to /login on the success view", async () => {
		const session = buildSession();
		renderResend(["/resend-confirmation?email=user@example.com"], session);

		await userEvent.setup().click(screen.getByRole("button", { name: "Отправить ссылку" }));

		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Проверьте почту" })).toBeInTheDocument();
		});
		expect(screen.getByRole("link", { name: "Назад к входу" })).toBeInTheDocument();
	});
});
