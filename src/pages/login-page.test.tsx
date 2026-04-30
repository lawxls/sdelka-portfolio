import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthLayout } from "@/components/auth-layout";
import { mockHostname } from "@/test-utils";
import { LoginPage } from "./login-page";

let queryClient: QueryClient;

function renderLogin(initialEntries = ["/login"]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route element={<AuthLayout />}>
						<Route path="/login" element={<LoginPage />} />
					</Route>
					<Route path="/tenders" element={<div>Tenders Page</div>} />
					<Route path="/positions" element={<div>Positions Page</div>} />
					<Route path="/analytics" element={<div>Analytics Page</div>} />
					<Route path="/forgot-password" element={<div>Forgot Password</div>} />
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

	test("submits login with any credentials and redirects to /tenders", async () => {
		renderLogin();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Email"), "a@b.com");
		await user.type(screen.getByLabelText("Пароль"), "pass1234");
		await user.click(screen.getByRole("button", { name: "Войти" }));

		await waitFor(() => {
			expect(screen.getByText("Tenders Page")).toBeInTheDocument();
		});
		expect(localStorage.getItem("auth-access-token")).toBeTruthy();
	});

	test("redirects to state.from location after login", async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={[{ pathname: "/login", state: { from: { pathname: "/analytics" } } }]}>
					<Routes>
						<Route element={<AuthLayout />}>
							<Route path="/login" element={<LoginPage />} />
						</Route>
						<Route path="/analytics" element={<div>Analytics Page</div>} />
					</Routes>
				</MemoryRouter>
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

	test("all text is in Russian", () => {
		renderLogin();
		expect(screen.getByRole("heading", { name: "Вход" })).toBeInTheDocument();
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Забыли пароль?" })).toBeInTheDocument();
	});
});
