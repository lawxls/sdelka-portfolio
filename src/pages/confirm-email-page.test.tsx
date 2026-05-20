import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthLayout } from "@/components/auth-layout";
import type { SessionClient } from "@/data/clients/session-client";
import { ValidationError } from "@/data/errors";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { mockHostname } from "@/test-utils";
import { ConfirmEmailPage } from "./confirm-email-page";

let queryClient: QueryClient;

function buildSession(overrides: Partial<SessionClient> = {}): SessionClient {
	return {
		login: vi.fn(),
		refresh: vi.fn(),
		logout: vi.fn(),
		register: vi.fn(),
		confirmEmail: vi.fn(),
		checkEmail: vi.fn(),
		resendConfirmation: vi.fn(),
		forgotPassword: vi.fn(),
		resetPassword: vi.fn(),
		requestPasswordChange: vi.fn(),
		impersonate: vi.fn(),
		...overrides,
	};
}

function renderConfirmEmail(initialEntries: string[], session: SessionClient) {
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ session }}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route element={<AuthLayout />}>
						<Route path="/confirm-email" element={<ConfirmEmailPage />} />
					</Route>
					<Route path="/login" element={<div>Login Page</div>} />
					<Route path="/inquiries" element={<div>Inquiries Page</div>} />
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

describe("ConfirmEmailPage", () => {
	test("shows error when uid or token is missing from URL", () => {
		const session = buildSession();
		renderConfirmEmail(["/confirm-email"], session);
		expect(screen.getByText("Ссылка недействительна")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Перейти к входу" })).toBeInTheDocument();
		expect(session.confirmEmail).not.toHaveBeenCalled();
	});

	test("calls confirmEmail with both uid and token from query string", async () => {
		const confirmEmail = vi
			.fn()
			.mockResolvedValue({ access: "fresh-access", refresh: "fresh-refresh", user: { id: "1", email: "x@y.z" } });
		const session = buildSession({ confirmEmail });
		renderConfirmEmail(["/confirm-email?uid=test-uid&token=test-token"], session);

		await waitFor(() => {
			expect(confirmEmail).toHaveBeenCalledWith({ uid: "test-uid", token: "test-token" });
		});
	});

	test("on success: stores access token, redirects to /inquiries (auto-login)", async () => {
		const confirmEmail = vi
			.fn()
			.mockResolvedValue({ access: "fresh-access", refresh: "fresh-refresh", user: { id: "1", email: "x@y.z" } });
		const session = buildSession({ confirmEmail });
		renderConfirmEmail(["/confirm-email?uid=good-uid&token=good-token"], session);

		await waitFor(() => {
			expect(screen.getByText("Inquiries Page")).toBeInTheDocument();
		});
		expect(sessionStorage.getItem("auth-access-token")).toBe("fresh-access");
	});

	test("on invalid/expired link: shows Russian error and link back to login", async () => {
		const confirmEmail = vi.fn().mockRejectedValue(new ValidationError({}, { code: "invalid_or_expired_link" }));
		const session = buildSession({ confirmEmail });
		renderConfirmEmail(["/confirm-email?uid=bad-uid&token=bad-token"], session);

		await waitFor(() => {
			expect(screen.getByText("Ссылка недействительна или истекла")).toBeInTheDocument();
		});
		expect(screen.getByRole("link", { name: "Перейти к входу" })).toBeInTheDocument();
		expect(sessionStorage.getItem("auth-access-token")).toBeNull();
	});

	test("error state surfaces a link to /resend-confirmation so the user can request a fresh link", async () => {
		const confirmEmail = vi.fn().mockRejectedValue(new ValidationError({}, { code: "invalid_or_expired_link" }));
		const session = buildSession({ confirmEmail });
		renderConfirmEmail(["/confirm-email?uid=bad-uid&token=bad-token"], session);

		await waitFor(() => {
			const resendLink = screen.getByRole("link", { name: "Отправить ссылку ещё раз" });
			expect(resendLink).toBeInTheDocument();
			expect(resendLink).toHaveAttribute("href", "/resend-confirmation");
		});
	});

	test("fires confirmEmail exactly once under StrictMode double-mount (token self-invalidates after activate)", async () => {
		const confirmEmail = vi
			.fn()
			.mockResolvedValue({ access: "fresh-access", refresh: "fresh-refresh", user: { id: "1", email: "x@y.z" } });
		const session = buildSession({ confirmEmail });
		render(
			<StrictMode>
				<TestClientsProvider queryClient={queryClient} clients={{ session }}>
					<MemoryRouter initialEntries={["/confirm-email?uid=u&token=t"]}>
						<Routes>
							<Route path="/confirm-email" element={<ConfirmEmailPage />} />
							<Route path="/inquiries" element={<div>Inquiries Page</div>} />
						</Routes>
					</MemoryRouter>
				</TestClientsProvider>
			</StrictMode>,
		);

		await waitFor(() => {
			expect(confirmEmail).toHaveBeenCalled();
		});
		expect(confirmEmail).toHaveBeenCalledTimes(1);
	});

	test("redirects to /inquiries under StrictMode", async () => {
		const confirmEmail = vi
			.fn()
			.mockResolvedValue({ access: "fresh-access", refresh: "fresh-refresh", user: { id: "1", email: "x@y.z" } });
		const session = buildSession({ confirmEmail });
		render(
			<StrictMode>
				<TestClientsProvider queryClient={queryClient} clients={{ session }}>
					<MemoryRouter initialEntries={["/confirm-email?uid=u&token=t"]}>
						<Routes>
							<Route path="/confirm-email" element={<ConfirmEmailPage />} />
							<Route path="/inquiries" element={<div>Inquiries Page</div>} />
						</Routes>
					</MemoryRouter>
				</TestClientsProvider>
			</StrictMode>,
		);

		await waitFor(() => {
			expect(screen.getByText("Inquiries Page")).toBeInTheDocument();
		});
	});

	test("renders pending state while confirmEmail is in flight", () => {
		// Mutation never resolves — page stays in the loading branch.
		const confirmEmail = vi.fn().mockReturnValue(new Promise(() => {}));
		const session = buildSession({ confirmEmail });
		renderConfirmEmail(["/confirm-email?uid=u&token=t"], session);

		expect(screen.getByRole("heading", { name: "Подтверждение email" })).toBeInTheDocument();
		expect(screen.getByText("Подтверждаем ваш email…")).toBeInTheDocument();
	});
});
