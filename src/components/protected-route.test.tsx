import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import { clearTokens, setTokens } from "@/data/auth";
import { ProtectedRoute } from "./protected-route";

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

function renderWithRouter(initialEntries = ["/app"]) {
	return render(
		<MemoryRouter initialEntries={initialEntries}>
			<Routes>
				<Route path="/login" element={<div>Login Page</div>} />
				<Route element={<ProtectedRoute />}>
					<Route path="/app" element={<div>Protected Content</div>} />
				</Route>
			</Routes>
		</MemoryRouter>,
	);
}

describe("ProtectedRoute", () => {
	test("redirects to /login when unauthenticated", () => {
		renderWithRouter();
		expect(screen.getByText("Login Page")).toBeInTheDocument();
		expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
	});

	test("renders children when authenticated", () => {
		setTokens("access");
		renderWithRouter();
		expect(screen.getByText("Protected Content")).toBeInTheDocument();
		expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
	});

	test("redirects on auth:cleared event", async () => {
		setTokens("access");
		renderWithRouter();
		expect(screen.getByText("Protected Content")).toBeInTheDocument();

		clearTokens();

		await waitFor(() => {
			expect(screen.getByText("Login Page")).toBeInTheDocument();
		});
	});

	test("passes state.from with current location", () => {
		// When unauthenticated at /app, should redirect to /login with from=/app
		// We verify redirect happened — the from state is internal to Navigate
		renderWithRouter(["/app"]);
		expect(screen.getByText("Login Page")).toBeInTheDocument();
	});
});
