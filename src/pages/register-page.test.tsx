import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthLayout } from "@/components/auth-layout";
import { server } from "@/test-msw";
import { mockHostname } from "@/test-utils";
import { RegisterPage } from "./register-page";

let queryClient: QueryClient;

function renderRegister(initialEntries = ["/register?code=ABC12"]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route element={<AuthLayout />}>
						<Route path="/register" element={<RegisterPage />} />
					</Route>
					<Route path="/login" element={<div>Login Page</div>} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

function setupValidInvitation() {
	server.use(
		http.post("/api/v1/auth/verify-invitation-code", () => {
			return HttpResponse.json({ valid: true });
		}),
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

describe("RegisterPage", () => {
	// --- Invitation code validation ---

	test("redirects to /login when no invitation code in URL or localStorage", async () => {
		renderRegister(["/register"]);
		await waitFor(() => {
			expect(screen.getByText("Login Page")).toBeInTheDocument();
		});
	});

	test("redirects to /login when invitation code is invalid", async () => {
		server.use(
			http.post("/api/v1/auth/verify-invitation-code", () => {
				return HttpResponse.json({ valid: false });
			}),
		);

		renderRegister();
		await waitFor(() => {
			expect(screen.getByText("Login Page")).toBeInTheDocument();
		});
	});

	test("stores invitation code from URL param in localStorage", async () => {
		setupValidInvitation();
		renderRegister();
		await waitFor(() => {
			expect(localStorage.getItem("auth-invitation-code")).toBe("ABC12");
		});
	});

	test("uses invitation code from localStorage when not in URL", async () => {
		localStorage.setItem("auth-invitation-code", "SAVED1");
		server.use(
			http.post("/api/v1/auth/verify-invitation-code", () => {
				return HttpResponse.json({ valid: true });
			}),
		);

		renderRegister(["/register"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Регистрация" })).toBeInTheDocument();
		});
	});

	// --- Stage 1: Email ---

	test("stage 1: renders email input after valid invitation", async () => {
		setupValidInvitation();
		renderRegister();
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Регистрация" })).toBeInTheDocument();
		});
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Продолжить" })).toBeInTheDocument();
	});

	test("stage 1: advances to stage 2 when email is not taken", async () => {
		setupValidInvitation();
		server.use(
			http.post("/api/v1/auth/check-email", () => {
				return HttpResponse.json({ exists: false });
			}),
		);

		renderRegister();
		await waitFor(() => {
			expect(screen.getByLabelText("Email")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toBeInTheDocument();
		});
	});

	test("stage 1: shows error when email already exists", async () => {
		setupValidInvitation();
		server.use(
			http.post("/api/v1/auth/check-email", () => {
				return HttpResponse.json({ exists: true });
			}),
		);

		renderRegister();
		await waitFor(() => {
			expect(screen.getByLabelText("Email")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "taken@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => {
			expect(screen.getByText("Этот email уже зарегистрирован")).toBeInTheDocument();
		});
	});

	// --- Stage 2: Details ---

	test("stage 2: renders name, phone, password, confirm password fields", async () => {
		setupValidInvitation();
		server.use(http.post("/api/v1/auth/check-email", () => HttpResponse.json({ exists: false })));

		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toBeInTheDocument();
			expect(screen.getByLabelText("Телефон")).toBeInTheDocument();
			expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
			expect(screen.getByLabelText("Подтвердите пароль")).toBeInTheDocument();
		});
	});

	test("stage 2: phone input shows +7 prefix", async () => {
		setupValidInvitation();
		server.use(http.post("/api/v1/auth/check-email", () => HttpResponse.json({ exists: false })));

		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => {
			expect(screen.getByText("+7")).toBeInTheDocument();
		});
	});

	test("stage 2: shows password validation error for short password", async () => {
		setupValidInvitation();
		server.use(http.post("/api/v1/auth/check-email", () => HttpResponse.json({ exists: false })));

		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());
		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("Пароль"), "short");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "short");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => {
			expect(screen.getByText("Пароль должен содержать минимум 8 символов")).toBeInTheDocument();
		});
	});

	test("stage 2: shows error when passwords do not match", async () => {
		setupValidInvitation();
		server.use(http.post("/api/v1/auth/check-email", () => HttpResponse.json({ exists: false })));

		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());
		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "differentPass");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => {
			expect(screen.getByText("Пароли не совпадают")).toBeInTheDocument();
		});
	});

	test("stage 2: successful registration advances to stage 3", async () => {
		setupValidInvitation();
		server.use(
			http.post("/api/v1/auth/check-email", () => HttpResponse.json({ exists: false })),
			http.post("/api/v1/auth/register", () =>
				HttpResponse.json({ access: "a", refresh: "r", user: { email: "new@user.com" } }, { status: 201 }),
			),
		);

		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());
		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "securePass1");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => {
			expect(screen.getByText("Проверьте почту")).toBeInTheDocument();
			expect(screen.getByText("new@user.com")).toBeInTheDocument();
		});
	});

	test("stage 2: clears invitation code from localStorage after successful registration", async () => {
		setupValidInvitation();
		server.use(
			http.post("/api/v1/auth/check-email", () => HttpResponse.json({ exists: false })),
			http.post("/api/v1/auth/register", () =>
				HttpResponse.json({ access: "a", refresh: "r", user: { email: "new@user.com" } }, { status: 201 }),
			),
		);

		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());

		// Invitation code was stored
		expect(localStorage.getItem("auth-invitation-code")).toBe("ABC12");

		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());
		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "securePass1");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => {
			expect(screen.getByText("Проверьте почту")).toBeInTheDocument();
		});
		expect(localStorage.getItem("auth-invitation-code")).toBeNull();
	});

	test("stage 2: displays field-level API errors inline", async () => {
		setupValidInvitation();
		server.use(
			http.post("/api/v1/auth/check-email", () => HttpResponse.json({ exists: false })),
			http.post("/api/v1/auth/register", () =>
				HttpResponse.json({ password: "Пароль слишком похож на email" }, { status: 400 }),
			),
		);

		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());
		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "securePass1");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => {
			expect(screen.getByText("Пароль слишком похож на email")).toBeInTheDocument();
		});
	});

	test("stage 2: displays detail API errors as banner", async () => {
		setupValidInvitation();
		server.use(
			http.post("/api/v1/auth/check-email", () => HttpResponse.json({ exists: false })),
			http.post("/api/v1/auth/register", () =>
				HttpResponse.json({ detail: "Код приглашения недействителен" }, { status: 400 }),
			),
		);

		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());
		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "securePass1");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => {
			expect(screen.getByText("Код приглашения недействителен")).toBeInTheDocument();
		});
	});

	test("stage 2: sends phone with +7 prefix concatenated", async () => {
		setupValidInvitation();
		let capturedBody: unknown;
		server.use(
			http.post("/api/v1/auth/check-email", () => HttpResponse.json({ exists: false })),
			http.post("/api/v1/auth/register", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ access: "a", refresh: "r", user: { email: "new@user.com" } }, { status: 201 });
			}),
		);

		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());
		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "securePass1");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => expect(screen.getByText("Проверьте почту")).toBeInTheDocument());
		expect((capturedBody as Record<string, unknown>).phone).toBe("+79991234567");
	});

	// --- Stage 3: Confirmation ---

	test("stage 3: shows login link", async () => {
		setupValidInvitation();
		server.use(
			http.post("/api/v1/auth/check-email", () => HttpResponse.json({ exists: false })),
			http.post("/api/v1/auth/register", () =>
				HttpResponse.json({ access: "a", refresh: "r", user: { email: "new@user.com" } }, { status: 201 }),
			),
		);

		renderRegister();
		await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Email"), "new@user.com");
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		await waitFor(() => expect(screen.getByLabelText("Имя")).toBeInTheDocument());
		await user.type(screen.getByLabelText("Имя"), "Иван");
		await user.type(screen.getByLabelText("Телефон"), "9991234567");
		await user.type(screen.getByLabelText("Пароль"), "securePass1");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "securePass1");
		await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

		await waitFor(() => expect(screen.getByText("Проверьте почту")).toBeInTheDocument());
		const loginLink = screen.getByRole("link", { name: "Войти" });
		expect(loginLink).toHaveAttribute("href", "/login");
	});

	// --- Cross-navigation ---

	test("renders 'Уже есть аккаунт? Войти' link", async () => {
		setupValidInvitation();
		renderRegister();
		await waitFor(() => {
			expect(screen.getByRole("link", { name: "Войти" })).toBeInTheDocument();
		});
	});

	// --- Russian text ---

	test("all text is in Russian", async () => {
		setupValidInvitation();
		renderRegister();
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Регистрация" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Продолжить" })).toBeInTheDocument();
		});
	});
});
