import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthLayout } from "@/components/auth-layout";
import { mockHostname } from "@/test-utils";
import { ConfirmEmailPage } from "./confirm-email-page";

let queryClient: QueryClient;

function renderConfirmEmail(initialEntries = ["/confirm-email"]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route element={<AuthLayout />}>
						<Route path="/confirm-email" element={<ConfirmEmailPage />} />
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

describe("ConfirmEmailPage", () => {
	test("shows error when no token in URL", () => {
		renderConfirmEmail(["/confirm-email"]);
		expect(screen.getByText("Ссылка недействительна")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Перейти к входу" })).toBeInTheDocument();
	});

	test("shows success message on confirmed email", async () => {
		renderConfirmEmail(["/confirm-email?token=uid-token-123"]);

		await waitFor(() => {
			expect(screen.getByText("Email подтверждён")).toBeInTheDocument();
		});
		expect(screen.getByRole("link", { name: "Перейти к входу" })).toBeInTheDocument();
	});

	test("login link navigates to /login on success", async () => {
		renderConfirmEmail(["/confirm-email?token=uid-token-123"]);

		await waitFor(() => {
			expect(screen.getByRole("link", { name: "Перейти к входу" })).toBeInTheDocument();
		});

		const user = userEvent.setup();
		await user.click(screen.getByRole("link", { name: "Перейти к входу" }));

		expect(screen.getByText("Login Page")).toBeInTheDocument();
	});

	test("all text is in Russian", async () => {
		renderConfirmEmail(["/confirm-email?token=uid-token-123"]);

		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Email подтверждён" })).toBeInTheDocument();
		});
		expect(screen.getByText("Ваш email успешно подтверждён")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Перейти к входу" })).toBeInTheDocument();
	});
});
