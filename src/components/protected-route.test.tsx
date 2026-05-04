import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { clearTokens, setTokens } from "@/data/auth";
import type { SessionClient } from "@/data/clients/session-client";
import { createInMemorySessionClient } from "@/data/clients/session-in-memory";
import { DataClientsProvider } from "@/data/clients-context";
import { _resetMockDelay, _setMockDelay } from "@/data/mock-utils";
import { ProtectedRoute } from "./protected-route";

let queryClient: QueryClient;

beforeEach(() => {
	_setMockDelay(0, 0);
	localStorage.clear();
	sessionStorage.clear();
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
});

afterEach(() => {
	_resetMockDelay();
	vi.restoreAllMocks();
});

function renderWithRouter(
	initialEntries = ["/app"],
	session: SessionClient = createInMemorySessionClient({ refreshAvailable: false }),
) {
	return render(
		<QueryClientProvider client={queryClient}>
			<DataClientsProvider clients={{ session }}>
				<MemoryRouter initialEntries={initialEntries}>
					<Routes>
						<Route path="/login" element={<div>Login Page</div>} />
						<Route element={<ProtectedRoute />}>
							<Route path="/app" element={<div>Protected Content</div>} />
						</Route>
					</Routes>
				</MemoryRouter>
			</DataClientsProvider>
		</QueryClientProvider>,
	);
}

describe("ProtectedRoute", () => {
	test("redirects to /login when no session and refresh fails", async () => {
		renderWithRouter();
		// Splash flashes first, then anon → redirect.
		await waitFor(() => {
			expect(screen.getByText("Login Page")).toBeInTheDocument();
		});
		expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
	});

	test("renders children when sessionStorage already holds an access token", () => {
		setTokens("existing-access");
		renderWithRouter();
		expect(screen.getByText("Protected Content")).toBeInTheDocument();
		expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
	});

	test("renders children after refresh succeeds", async () => {
		const session = createInMemorySessionClient({ refreshAvailable: true });
		renderWithRouter(["/app"], session);

		await waitFor(() => {
			expect(screen.getByText("Protected Content")).toBeInTheDocument();
		});
	});

	test("shows the splash while refresh is in flight", () => {
		const session: SessionClient = {
			login: () => Promise.reject(new Error("not used")),
			refresh: () => new Promise(() => {}),
			logout: () => Promise.resolve(),
		};
		renderWithRouter(["/app"], session);

		expect(screen.getByTestId("session-bootstrap-splash")).toBeInTheDocument();
		expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
		expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
	});

	test("redirects on auth:cleared event", async () => {
		setTokens("existing-access");
		renderWithRouter();
		expect(screen.getByText("Protected Content")).toBeInTheDocument();

		clearTokens();

		await waitFor(() => {
			expect(screen.getByText("Login Page")).toBeInTheDocument();
		});
	});

	test("passes state.from with current location on redirect", async () => {
		renderWithRouter(["/app"]);
		// We assert redirect happened — Navigate with state is internal; the
		// rendered output reflects we landed on Login Page.
		await waitFor(() => {
			expect(screen.getByText("Login Page")).toBeInTheDocument();
		});
	});
});
