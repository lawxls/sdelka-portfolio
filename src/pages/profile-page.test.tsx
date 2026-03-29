import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { setTokens } from "@/data/auth";
import { server } from "@/test-msw";
import { mockHostname } from "@/test-utils";
import { ProfilePage } from "./profile-page";

const MOCK_SETTINGS = {
	first_name: "Иван",
	last_name: "Иванов",
	email: "ivan@example.com",
	phone: "+79991234567",
	avatar_icon: "blue",
	date_joined: "2024-01-15T10:00:00Z",
	mailing_allowed: true,
};

let queryClient: QueryClient;

function renderProfile(initialEntries = ["/profile"]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route path="/profile" element={<ProfilePage />} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	localStorage.clear();
	mockHostname("acme.localhost");
	setTokens("test-access", "test-refresh");
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ProfilePage", () => {
	test("shows loading skeleton while fetching", () => {
		server.use(
			http.get("/api/v1/auth/settings", () => {
				return new Promise(() => {}); // never resolves
			}),
		);

		renderProfile();

		expect(screen.getByTestId("profile-skeleton")).toBeInTheDocument();
	});

	test("renders avatar with initials and color from avatar_icon", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => {
				return HttpResponse.json(MOCK_SETTINGS);
			}),
		);

		renderProfile();

		await waitFor(() => {
			expect(screen.getByText("ИИ")).toBeInTheDocument();
		});

		const avatar = screen.getByText("ИИ").closest("[data-testid='profile-avatar']");
		expect(avatar).toBeInTheDocument();
	});

	test("renders full name below avatar", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => {
				return HttpResponse.json(MOCK_SETTINGS);
			}),
		);

		renderProfile();

		await waitFor(() => {
			expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
		});
	});

	test("renders registration date in Russian locale", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => {
				return HttpResponse.json(MOCK_SETTINGS);
			}),
		);

		renderProfile();

		await waitFor(() => {
			const dateText = screen.getByTestId("profile-date-joined");
			expect(dateText).toHaveTextContent(/15/);
			expect(dateText).toHaveTextContent(/2024/);
		});
	});

	test("defaults to Аккаунт tab when no param", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => {
				return HttpResponse.json(MOCK_SETTINGS);
			}),
		);

		renderProfile();

		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Аккаунт" })).toHaveAttribute("aria-selected", "true");
		});

		expect(screen.getByRole("tab", { name: "Настройки" })).toHaveAttribute("aria-selected", "false");
	});

	test("switches to Настройки tab via URL param", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => {
				return HttpResponse.json(MOCK_SETTINGS);
			}),
		);

		renderProfile(["/profile?tab=settings"]);

		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Настройки" })).toHaveAttribute("aria-selected", "true");
		});

		expect(screen.getByRole("tab", { name: "Аккаунт" })).toHaveAttribute("aria-selected", "false");
	});

	test("clicking tab switches active tab", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => {
				return HttpResponse.json(MOCK_SETTINGS);
			}),
		);

		renderProfile();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Аккаунт" })).toHaveAttribute("aria-selected", "true");
		});

		await user.click(screen.getByRole("tab", { name: "Настройки" }));

		expect(screen.getByRole("tab", { name: "Настройки" })).toHaveAttribute("aria-selected", "true");
		expect(screen.getByRole("tab", { name: "Аккаунт" })).toHaveAttribute("aria-selected", "false");
	});

	test("shows error state with retry button on fetch failure", async () => {
		let attempt = 0;
		server.use(
			http.get("/api/v1/auth/settings", () => {
				attempt++;
				if (attempt === 1) {
					return HttpResponse.json({ detail: "Server error" }, { status: 500 });
				}
				return HttpResponse.json(MOCK_SETTINGS);
			}),
		);

		renderProfile();

		await waitFor(() => {
			expect(screen.getByText("Не удалось загрузить профиль")).toBeInTheDocument();
		});

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Повторить" }));

		await waitFor(() => {
			expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
		});
	});

	test("Аккаунт tab shows placeholder content", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => {
				return HttpResponse.json(MOCK_SETTINGS);
			}),
		);

		renderProfile();

		await waitFor(() => {
			expect(screen.getByTestId("account-tab-content")).toBeInTheDocument();
		});
	});

	test("Настройки tab shows placeholder content", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => {
				return HttpResponse.json(MOCK_SETTINGS);
			}),
		);

		renderProfile(["/profile?tab=settings"]);

		await waitFor(() => {
			expect(screen.getByTestId("settings-tab-content")).toBeInTheDocument();
		});
	});
});
