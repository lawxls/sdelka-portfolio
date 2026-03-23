import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, test, vi } from "vitest";
import { setToken } from "@/data/auth";
import { server } from "@/test-msw";
import { AuthGate } from "./auth-gate";

function mockHostname(hostname: string) {
	vi.spyOn(window, "location", "get").mockReturnValue({
		...window.location,
		hostname,
	});
}

function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
}

function renderWithProviders(ui: React.ReactElement) {
	const qc = createTestQueryClient();
	return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("AuthGate", () => {
	test("shows 'Company not found' when getTenant() returns null", () => {
		mockHostname("localhost");
		renderWithProviders(
			<AuthGate>
				<div>App Content</div>
			</AuthGate>,
		);
		expect(screen.getByText("Компания не найдена")).toBeInTheDocument();
		expect(screen.queryByText("App Content")).not.toBeInTheDocument();
		expect(screen.queryByText("Код доступа")).not.toBeInTheDocument();
	});

	test("shows code input when no JWT token", () => {
		mockHostname("acme.localhost");
		renderWithProviders(
			<AuthGate>
				<div>App Content</div>
			</AuthGate>,
		);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Код доступа")).toBeInTheDocument();
		expect(screen.queryByText("App Content")).not.toBeInTheDocument();
	});

	test("validates token on load and shows children when valid", async () => {
		mockHostname("acme.localhost");
		setToken("valid-jwt");

		server.use(
			http.get("/api/v1/company/info/", () => {
				return HttpResponse.json({ name: "Acme Corp" });
			}),
		);

		renderWithProviders(
			<AuthGate>
				<div>App Content</div>
			</AuthGate>,
		);

		await waitFor(() => {
			expect(screen.getByText("App Content")).toBeInTheDocument();
		});
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	test("shows code input when token validation returns 401", async () => {
		mockHostname("acme.localhost");
		setToken("expired-jwt");

		server.use(
			http.get("/api/v1/company/info/", () => {
				return HttpResponse.json({ detail: "Invalid credentials." }, { status: 401 });
			}),
		);

		renderWithProviders(
			<AuthGate>
				<div>App Content</div>
			</AuthGate>,
		);

		await waitFor(() => {
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});
		expect(screen.queryByText("App Content")).not.toBeInTheDocument();
	});

	test("correct code entry stores JWT and shows children", async () => {
		mockHostname("acme.localhost");
		const user = userEvent.setup();

		server.use(
			http.post("/api/v1/company/validate-code", () => {
				return HttpResponse.json({ token: "new-jwt-token" });
			}),
			http.get("/api/v1/company/info/", () => {
				return HttpResponse.json({ name: "Acme Corp" });
			}),
		);

		renderWithProviders(
			<AuthGate>
				<div>App Content</div>
			</AuthGate>,
		);

		const cells = screen.getAllByRole("textbox");
		await user.click(cells[0]);
		await user.paste("Sd3lk");

		await waitFor(() => {
			expect(screen.getByText("App Content")).toBeInTheDocument();
		});
		expect(localStorage.getItem("auth-token")).toBe("new-jwt-token");
	});

	test("wrong code shows error and clears inputs", async () => {
		mockHostname("acme.localhost");
		const user = userEvent.setup();

		server.use(
			http.post("/api/v1/company/validate-code", () => {
				return HttpResponse.json({ detail: "Invalid credentials." }, { status: 401 });
			}),
		);

		renderWithProviders(
			<AuthGate>
				<div>App Content</div>
			</AuthGate>,
		);

		const cells = screen.getAllByRole("textbox");
		await user.click(cells[0]);
		await user.paste("WRONG");

		await waitFor(() => {
			expect(screen.getByText("Неверный код доступа")).toBeInTheDocument();
		});
		for (const cell of screen.getAllByRole("textbox")) {
			expect(cell).toHaveValue("");
		}
	});

	test("modal cannot be dismissed via Escape key", async () => {
		mockHostname("acme.localhost");
		const user = userEvent.setup();
		renderWithProviders(
			<AuthGate>
				<div>App Content</div>
			</AuthGate>,
		);

		await user.keyboard("{Escape}");

		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.queryByText("App Content")).not.toBeInTheDocument();
	});
});
