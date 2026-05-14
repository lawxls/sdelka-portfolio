import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthLayout } from "@/components/auth-layout";
import type { SessionClient } from "@/data/clients/session-client";
import { ValidationError } from "@/data/errors";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { ImpersonatePage } from "./impersonate-page";

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

function renderImpersonate(initialEntries: string[], session: SessionClient) {
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ session }}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route element={<AuthLayout />}>
						<Route path="/impersonate" element={<ImpersonatePage />} />
					</Route>
					<Route path="/login" element={<div>Login Page</div>} />
					<Route path="/inquiries" element={<div>Inquiries Page</div>} />
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
	sessionStorage.clear();
	vi.restoreAllMocks();
});

describe("ImpersonatePage", () => {
	test("shows error when handoff is missing from URL", () => {
		const session = buildSession();
		renderImpersonate(["/impersonate"], session);
		expect(screen.getByText("Ссылка недействительна")).toBeInTheDocument();
		expect(session.impersonate).not.toHaveBeenCalled();
	});

	test("calls impersonate with handoff from query string", async () => {
		const impersonate = vi
			.fn()
			.mockResolvedValue({ access: "fresh-access", refresh: "fresh-refresh", user: { id: 1, email: "x@y.z" } });
		const session = buildSession({ impersonate });
		renderImpersonate(["/impersonate?handoff=signed-blob"], session);

		await waitFor(() => {
			expect(impersonate).toHaveBeenCalledWith({ handoff: "signed-blob" });
		});
	});

	test("on success: stores tokens, redirects to inquiries", async () => {
		const impersonate = vi
			.fn()
			.mockResolvedValue({ access: "fresh-access", refresh: "fresh-refresh", user: { id: 1, email: "x@y.z" } });
		const session = buildSession({ impersonate });
		renderImpersonate(["/impersonate?handoff=signed-blob"], session);

		await waitFor(() => {
			expect(screen.getByText("Inquiries Page")).toBeInTheDocument();
		});
		expect(sessionStorage.getItem("auth-access-token")).toBe("fresh-access");
		expect(sessionStorage.getItem("auth-refresh-token")).toBe("fresh-refresh");
	});

	test("on invalid/expired handoff: shows Russian error and link to /login", async () => {
		const impersonate = vi.fn().mockRejectedValue(new ValidationError({}, { code: "invalid_or_expired_link" }));
		const session = buildSession({ impersonate });
		renderImpersonate(["/impersonate?handoff=bad"], session);

		await waitFor(() => {
			expect(screen.getByText("Ссылка недействительна или истекла")).toBeInTheDocument();
		});
		expect(screen.getByRole("link", { name: "Перейти к входу" })).toBeInTheDocument();
		expect(sessionStorage.getItem("auth-access-token")).toBeNull();
	});

	test("renders pending state while impersonate is in flight", () => {
		const impersonate = vi.fn().mockReturnValue(new Promise(() => {}));
		const session = buildSession({ impersonate });
		renderImpersonate(["/impersonate?handoff=signed-blob"], session);

		expect(screen.getByRole("heading", { name: "Входим как пользователь" })).toBeInTheDocument();
		expect(screen.getByText("Открываем сессию…")).toBeInTheDocument();
	});
});
