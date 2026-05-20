import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthLayout } from "@/components/auth-layout";
import type { SessionClient } from "@/data/clients/session-client";
import { createInMemorySessionClient } from "@/data/clients/session-in-memory";
import { DataClientsProvider } from "@/data/clients-context";
import { TooManyRequestsError } from "@/data/errors";
import { _resetMockDelay, _setMockDelay } from "@/data/mock-utils";
import { fakeSessionClient } from "@/data/test-clients-provider";
import { mockHostname } from "@/test-utils";
import { LoginPage } from "./login-page";

let queryClient: QueryClient;

type InitialEntries = ComponentProps<typeof MemoryRouter>["initialEntries"];

function buildSession(): SessionClient {
	return createInMemorySessionClient({
		users: [
			{ email: "a@b.com", password: "pass1234", user: { id: 1, email: "a@b.com" } },
			{
				email: "unverified@b.com",
				password: "pass1234",
				user: { id: 2, email: "unverified@b.com" },
				verified: false,
			},
		],
		refreshAvailable: false,
	});
}

function renderLogin(initialEntries: InitialEntries = ["/login"], session: SessionClient = buildSession()) {
	return render(
		<QueryClientProvider client={queryClient}>
			<DataClientsProvider clients={{ session }}>
				<MemoryRouter initialEntries={initialEntries}>
					<Routes>
						<Route element={<AuthLayout />}>
							<Route path="/login" element={<LoginPage />} />
						</Route>
						<Route path="/" element={<div>ProcurementInquiries Page</div>} />
						<Route path="/inquiries" element={<div>ProcurementInquiries Page</div>} />
						<Route path="/positions" element={<div>Positions Page</div>} />
						<Route path="/analytics" element={<div>Analytics Page</div>} />
						<Route path="/forgot-password" element={<div>Forgot Password</div>} />
						<Route path="/resend-confirmation" element={<ResendConfirmationSpy />} />
					</Routes>
				</MemoryRouter>
			</DataClientsProvider>
		</QueryClientProvider>,
	);
}

function ResendConfirmationSpy() {
	const loc = useLocation();
	return <div>Resend Confirmation Page · {loc.search}</div>;
}

beforeEach(() => {
	_setMockDelay(0, 0);
	mockHostname("acme.localhost");
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
});

afterEach(() => {
	localStorage.clear();
	sessionStorage.clear();
	_resetMockDelay();
	vi.restoreAllMocks();
});

describe("LoginPage", () => {
	test("renders email and password floating inputs", () => {
		renderLogin();
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
	});

	test("renders heading and forgot password link", () => {
		renderLogin();
		expect(screen.getByRole("heading", { name: "Вход" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Забыли пароль?" })).toBeInTheDocument();
	});

	test("forgot password link navigates to /forgot-password", async () => {
		renderLogin();
		const user = userEvent.setup();
		await user.click(screen.getByRole("link", { name: "Забыли пароль?" }));
		expect(screen.getByText("Forgot Password")).toBeInTheDocument();
	});

	test("submits login with valid credentials and redirects to /inquiries", async () => {
		renderLogin();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Email"), "a@b.com");
		await user.type(screen.getByLabelText("Пароль"), "pass1234");
		await user.click(screen.getByRole("button", { name: "Войти" }));

		await waitFor(() => {
			expect(screen.getByText("ProcurementInquiries Page")).toBeInTheDocument();
		});
		expect(sessionStorage.getItem("auth-access-token")).toBeTruthy();
	});

	test("redirects to /resend-confirmation?email=… on 403 email_not_verified instead of inline error", async () => {
		renderLogin();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Email"), "unverified@b.com");
		await user.type(screen.getByLabelText("Пароль"), "pass1234");
		await user.click(screen.getByRole("button", { name: "Войти" }));

		await waitFor(() => {
			expect(screen.getByText(/Resend Confirmation Page/)).toBeInTheDocument();
		});
		expect(screen.getByText(/email=unverified%40b\.com/)).toBeInTheDocument();
		// No inline banner — the user is redirected before any error UI renders.
		expect(screen.queryByText("Подтвердите почту, чтобы войти")).not.toBeInTheDocument();
	});

	test("shows Russian invalid_credentials error on bad password", async () => {
		renderLogin();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Email"), "a@b.com");
		await user.type(screen.getByLabelText("Пароль"), "wrong-password");
		await user.click(screen.getByRole("button", { name: "Войти" }));

		await waitFor(() => {
			expect(screen.getByText("Неверный пароль или почта")).toBeInTheDocument();
		});
		expect(sessionStorage.getItem("auth-access-token")).toBeNull();
	});

	test("redirects to state.from location after login", async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<DataClientsProvider clients={{ session: buildSession() }}>
					<MemoryRouter initialEntries={[{ pathname: "/login", state: { from: { pathname: "/analytics" } } }]}>
						<Routes>
							<Route element={<AuthLayout />}>
								<Route path="/login" element={<LoginPage />} />
							</Route>
							<Route path="/analytics" element={<div>Analytics Page</div>} />
						</Routes>
					</MemoryRouter>
				</DataClientsProvider>
			</QueryClientProvider>,
		);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Email"), "a@b.com");
		await user.type(screen.getByLabelText("Пароль"), "pass1234");
		await user.click(screen.getByRole("button", { name: "Войти" }));

		await waitFor(() => {
			expect(screen.getByText("Analytics Page")).toBeInTheDocument();
		});
	});

	test("preserves query and hash from state.from on redirect", async () => {
		let currentLocation: { search: string; hash: string } | undefined;

		function LocationSpy() {
			const loc = useLocation();
			currentLocation = { search: loc.search, hash: loc.hash };
			return <div>Positions Page</div>;
		}

		render(
			<QueryClientProvider client={queryClient}>
				<DataClientsProvider clients={{ session: buildSession() }}>
					<MemoryRouter
						initialEntries={[
							{
								pathname: "/login",
								state: { from: { pathname: "/positions", search: "?folder=none", hash: "#details" } },
							},
						]}
					>
						<Routes>
							<Route element={<AuthLayout />}>
								<Route path="/login" element={<LoginPage />} />
							</Route>
							<Route path="/positions" element={<LocationSpy />} />
						</Routes>
					</MemoryRouter>
				</DataClientsProvider>
			</QueryClientProvider>,
		);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Email"), "a@b.com");
		await user.type(screen.getByLabelText("Пароль"), "pass1234");
		await user.click(screen.getByRole("button", { name: "Войти" }));

		await waitFor(() => {
			expect(screen.getByText("Positions Page")).toBeInTheDocument();
		});
		expect(currentLocation?.search).toBe("?folder=none");
		expect(currentLocation?.hash).toBe("#details");
	});

	test("repeat 429 with the same Retry-After restarts the throttle countdown", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		try {
			const login = vi
				.fn()
				.mockRejectedValueOnce(new TooManyRequestsError(2))
				.mockRejectedValueOnce(new TooManyRequestsError(2));
			const session = fakeSessionClient({ login });

			render(
				<QueryClientProvider client={queryClient}>
					<DataClientsProvider clients={{ session }}>
						<MemoryRouter initialEntries={["/login"]}>
							<Routes>
								<Route element={<AuthLayout />}>
									<Route path="/login" element={<LoginPage />} />
								</Route>
							</Routes>
						</MemoryRouter>
					</DataClientsProvider>
				</QueryClientProvider>,
			);
			const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

			await user.type(screen.getByLabelText("Email"), "a@b.com");
			await user.type(screen.getByLabelText("Пароль"), "pass1234");
			await user.click(screen.getByRole("button", { name: "Войти" }));

			await waitFor(() => expect(screen.getByRole("button", { name: /Подождите 2 с/ })).toBeInTheDocument());

			// Run the countdown to zero so the button re-enables.
			await act(async () => {
				vi.advanceTimersByTime(2000);
			});
			await waitFor(() => expect(screen.getByRole("button", { name: "Войти" })).toBeEnabled());

			// Second 429 with the same retryAfter must restart the countdown.
			await user.click(screen.getByRole("button", { name: "Войти" }));
			await waitFor(() => expect(screen.getByRole("button", { name: /Подождите 2 с/ })).toBeInTheDocument());
		} finally {
			vi.useRealTimers();
		}
	});

	test("all text is in Russian", () => {
		renderLogin();
		expect(screen.getByRole("heading", { name: "Вход" })).toBeInTheDocument();
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Забыли пароль?" })).toBeInTheDocument();
	});
});
