import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { setTokens } from "@/data/auth";
import { server } from "@/test-msw";
import { makeSettings, mockHostname } from "@/test-utils";
import { ProfilePage } from "./profile-page";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const MOCK_SETTINGS = makeSettings();

let queryClient: QueryClient;

function LoginStub() {
	return <div data-testid="login-page">Login</div>;
}

function renderProfile(initialEntries = ["/profile"]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route path="/profile" element={<ProfilePage />} />
					<Route path="/login" element={<LoginStub />} />
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

	test("Настройки tab shows password form", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => {
				return HttpResponse.json(MOCK_SETTINGS);
			}),
		);

		renderProfile(["/profile?tab=settings"]);

		await waitFor(() => {
			expect(screen.getByText("Безопасность")).toBeInTheDocument();
		});
	});

	test("account form renders fields populated with server data", async () => {
		server.use(http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)));

		renderProfile();

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
		});

		expect(screen.getByLabelText("Фамилия")).toHaveValue("Иванов");
		expect(screen.getByLabelText("Email")).toHaveValue("ivan@example.com");
		expect(screen.getByLabelText("Email")).toHaveAttribute("readOnly");
		expect(screen.getByLabelText("Телефон")).toHaveValue("9991234567");
		expect(screen.getByLabelText("Получать сервисные уведомления на почту")).toBeChecked();
	});

	test("save button is disabled until a field is changed", async () => {
		server.use(http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)));

		renderProfile();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		});

		await user.clear(screen.getByLabelText("Имя"));
		await user.type(screen.getByLabelText("Имя"), "Пётр");

		expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
	});

	test("submitting sends only changed fields and shows success toast", async () => {
		let patchBody: Record<string, unknown> | null = null;
		server.use(
			http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)),
			http.patch("/api/v1/auth/settings", async ({ request }) => {
				patchBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json({ ...MOCK_SETTINGS, ...patchBody });
			}),
		);

		renderProfile();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
		});

		await user.clear(screen.getByLabelText("Имя"));
		await user.type(screen.getByLabelText("Имя"), "Пётр");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(patchBody).toEqual({ first_name: "Пётр" });
		});

		expect(toast.success).toHaveBeenCalledWith("Изменения сохранены");
	});

	test("save button disables again after successful save", async () => {
		let current = { ...MOCK_SETTINGS };
		server.use(
			http.get("/api/v1/auth/settings", () => HttpResponse.json(current)),
			http.patch("/api/v1/auth/settings", async ({ request }) => {
				const body = (await request.json()) as Record<string, unknown>;
				current = { ...current, ...(body as typeof current) };
				return HttpResponse.json(current);
			}),
		);

		renderProfile();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
		});

		await user.clear(screen.getByLabelText("Имя"));
		await user.type(screen.getByLabelText("Имя"), "Пётр");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		});
	});

	test("server field-level errors display inline", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)),
			http.patch("/api/v1/auth/settings", () => {
				return HttpResponse.json({ first_name: ["Слишком длинное имя"] }, { status: 400 });
			}),
		);

		renderProfile();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
		});

		await user.clear(screen.getByLabelText("Имя"));
		await user.type(screen.getByLabelText("Имя"), "Пётр");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(screen.getByText("Слишком длинное имя")).toBeInTheDocument();
		});
	});

	test("non-field server error shows toast", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)),
			http.patch("/api/v1/auth/settings", () => {
				return HttpResponse.json({ detail: "Ошибка сервера" }, { status: 400 });
			}),
		);

		renderProfile();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
		});

		await user.clear(screen.getByLabelText("Имя"));
		await user.type(screen.getByLabelText("Имя"), "Пётр");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Ошибка сервера");
		});
	});

	test("phone change prepends +7 in PATCH request", async () => {
		let patchBody: Record<string, unknown> | null = null;
		server.use(
			http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)),
			http.patch("/api/v1/auth/settings", async ({ request }) => {
				patchBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json({ ...MOCK_SETTINGS, ...patchBody });
			}),
		);

		renderProfile();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Телефон")).toHaveValue("9991234567");
		});

		await user.clear(screen.getByLabelText("Телефон"));
		await user.type(screen.getByLabelText("Телефон"), "1112223344");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(patchBody).toEqual({ phone: "+71112223344" });
		});
	});

	test("toggling mailing checkbox marks form as dirty", async () => {
		server.use(http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)));

		renderProfile();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		});

		await user.click(screen.getByLabelText("Получать сервисные уведомления на почту"));

		expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
	});

	test("settings tab renders password form with three fields", async () => {
		server.use(http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)));

		renderProfile(["/profile?tab=settings"]);

		await waitFor(() => {
			expect(screen.getByText("Безопасность")).toBeInTheDocument();
		});

		expect(screen.getByLabelText("Текущий пароль")).toBeInTheDocument();
		expect(screen.getByLabelText("Новый пароль")).toBeInTheDocument();
		expect(screen.getByLabelText("Подтвердите пароль")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Изменить пароль" })).toBeInTheDocument();
	});

	test("password mismatch shows client-side error on submit", async () => {
		server.use(http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)));

		renderProfile(["/profile?tab=settings"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Текущий пароль")).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText("Текущий пароль"), "oldpass");
		await user.type(screen.getByLabelText("Новый пароль"), "newpass123");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "different");
		await user.click(screen.getByRole("button", { name: "Изменить пароль" }));

		expect(screen.getByText("Пароли не совпадают")).toBeInTheDocument();
	});

	test("successful password change shows toast and redirects to /login", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)),
			http.post("/api/v1/auth/change-password", () => {
				return HttpResponse.json({ detail: "Пароль успешно изменён" });
			}),
		);

		renderProfile(["/profile?tab=settings"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Текущий пароль")).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText("Текущий пароль"), "oldpass");
		await user.type(screen.getByLabelText("Новый пароль"), "newpass123");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "newpass123");
		await user.click(screen.getByRole("button", { name: "Изменить пароль" }));

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith("Пароль успешно изменён");
		});

		await waitFor(() => {
			expect(screen.getByTestId("login-page")).toBeInTheDocument();
		});
	});

	test("wrong current password error shows toast", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)),
			http.post("/api/v1/auth/change-password", () => {
				return HttpResponse.json({ detail: "Неверный текущий пароль" }, { status: 400 });
			}),
		);

		renderProfile(["/profile?tab=settings"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Текущий пароль")).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText("Текущий пароль"), "wrong");
		await user.type(screen.getByLabelText("Новый пароль"), "newpass123");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "newpass123");
		await user.click(screen.getByRole("button", { name: "Изменить пароль" }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Неверный текущий пароль");
		});
	});

	test("weak password errors show inline under new password field", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)),
			http.post("/api/v1/auth/change-password", () => {
				return HttpResponse.json({ new_password: ["Пароль слишком короткий"] }, { status: 400 });
			}),
		);

		renderProfile(["/profile?tab=settings"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Текущий пароль")).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText("Текущий пароль"), "oldpass");
		await user.type(screen.getByLabelText("Новый пароль"), "short");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "short");
		await user.click(screen.getByRole("button", { name: "Изменить пароль" }));

		await waitFor(() => {
			expect(screen.getByText("Пароль слишком короткий")).toBeInTheDocument();
		});
	});

	test("submit button shows loading state during request", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)),
			http.post("/api/v1/auth/change-password", () => {
				return new Promise(() => {}); // never resolves
			}),
		);

		renderProfile(["/profile?tab=settings"]);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Текущий пароль")).toBeInTheDocument();
		});

		await user.type(screen.getByLabelText("Текущий пароль"), "oldpass");
		await user.type(screen.getByLabelText("Новый пароль"), "newpass123");
		await user.type(screen.getByLabelText("Подтвердите пароль"), "newpass123");
		await user.click(screen.getByRole("button", { name: "Изменить пароль" }));

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Изменить пароль" })).toBeDisabled();
		});
	});
});
