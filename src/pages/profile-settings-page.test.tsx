import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setTokens } from "@/data/auth";
import type { ProfileClient } from "@/data/clients/profile-client";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import type { SessionClient } from "@/data/clients/session-client";
import type { SubscriptionClient } from "@/data/clients/subscription-client";
import { createInMemorySubscriptionClient } from "@/data/clients/subscription-in-memory";
import { fakeSessionClient, TestClientsProvider } from "@/data/test-clients-provider";
import { makeMe, mockHostname } from "@/test-utils";
import { ProfileSettingsPage } from "./profile-settings-page";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const MOCK_ME = makeMe({ patronymic: "Иванович" });

let queryClient: QueryClient;
let profileClient: ProfileClient;

function renderPage(
	opts: { profile?: ProfileClient; session?: SessionClient; subscription?: SubscriptionClient } = {},
) {
	profileClient = opts.profile ?? createInMemoryProfileClient({ me: MOCK_ME });
	const session = opts.session ?? fakeSessionClient({ requestPasswordChange: vi.fn().mockResolvedValue(undefined) });
	const subscription = opts.subscription ?? createInMemorySubscriptionClient();
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ profile: profileClient, session, subscription }}>
			<MemoryRouter initialEntries={["/settings/profile"]}>
				<Routes>
					<Route path="*" element={<ProfileSettingsPage />} />
				</Routes>
			</MemoryRouter>
		</TestClientsProvider>,
	);
}

beforeEach(() => {
	localStorage.clear();
	sessionStorage.clear();
	mockHostname("acme.localhost");
	setTokens("test-access");
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("ProfileSettingsPage", () => {
	test("renders user data from mock store in form fields", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
		});
		expect(screen.getByLabelText("Фамилия")).toHaveValue("Иванов");
		expect(screen.getByLabelText("Отчество")).toHaveValue("Иванович");
		expect(screen.getByLabelText("Почта")).toHaveValue("ivan@example.com");
	});

	test("email field is read-only", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByLabelText("Почта")).toBeInTheDocument();
		});
		expect(screen.getByLabelText("Почта")).toHaveAttribute("readOnly");
	});

	test("save patches the store with changed fields only", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
		});

		await user.clear(screen.getByLabelText("Имя"));
		await user.type(screen.getByLabelText("Имя"), "Пётр");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(async () => {
			const current = await profileClient.me();
			expect(current.firstName).toBe("Пётр");
			expect(current.lastName).toBe(MOCK_ME.lastName);
		});
		expect(toast.success).toHaveBeenCalledWith("Изменения сохранены");
	});

	test("inline validation error for invalid phone", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByLabelText("Номер телефона")).toBeInTheDocument();
		});

		await user.clear(screen.getByLabelText("Номер телефона"));
		await user.type(screen.getByLabelText("Номер телефона"), "abc");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		expect(screen.getByText(/неверный формат/i)).toBeInTheDocument();
	});

	test("Изменить пароль section renders with description and CTA", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Изменить пароль" })).toBeInTheDocument();
		});
		expect(screen.getByText("Мы отправим ссылку для смены пароля на вашу почту")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отправить письмо" })).toBeInTheDocument();
	});

	test("CTA fires requestPasswordChange and surfaces success toast", async () => {
		const requestPasswordChange = vi.fn().mockResolvedValue(undefined);
		renderPage({ session: fakeSessionClient({ requestPasswordChange }) });
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Отправить письмо" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Отправить письмо" }));

		await waitFor(() => {
			expect(requestPasswordChange).toHaveBeenCalledOnce();
		});
		expect(requestPasswordChange).toHaveBeenCalledWith();
		expect(toast.success).toHaveBeenCalledWith("Письмо отправлено");
	});

	test("CTA failure surfaces error toast and leaves the user signed in", async () => {
		const requestPasswordChange = vi.fn().mockRejectedValue(new Error("boom"));
		renderPage({ session: fakeSessionClient({ requestPasswordChange }) });
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Отправить письмо" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Отправить письмо" }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Не удалось отправить письмо");
		});
	});

	test("shows error state with retry button when me request fails", async () => {
		const profile = createInMemoryProfileClient({ me: MOCK_ME });
		const original = profile.me;
		profile.me = vi.fn().mockRejectedValueOnce(new Error("boom")).mockImplementation(original);
		renderPage({ profile });
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();
		});
		expect(screen.queryByTestId("profile-skeleton")).not.toBeInTheDocument();
	});

	test("submit button is disabled during in-flight request", async () => {
		const profile = createInMemoryProfileClient({ me: MOCK_ME });
		profile.update = vi.fn(() => new Promise<never>(() => {}));
		renderPage({ profile });
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

	test("email notifications checkbox reflects mailingAllowed from API", async () => {
		renderPage({
			profile: createInMemoryProfileClient({
				me: makeMe({ patronymic: "Иванович", mailingAllowed: false }),
			}),
		});
		await waitFor(() => {
			expect(screen.getByRole("checkbox", { name: /уведомления/i })).toBeInTheDocument();
		});
		expect(screen.getByRole("checkbox", { name: /уведомления/i })).not.toBeChecked();
	});

	test("toggling email notifications checkbox enables Save", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("checkbox", { name: /уведомления/i })).toBeInTheDocument();
		});

		expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		await user.click(screen.getByRole("checkbox", { name: /уведомления/i }));
		expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
	});

	test("identity card renders inline tariff badge linking to tariffs", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByTestId("profile-avatar")).toBeInTheDocument();
		});
		const badge = await screen.findByTestId("current-tariff");
		expect(badge).toHaveTextContent("Бизнес");
		const link = badge.closest("a");
		expect(link).not.toBeNull();
		expect(link).toHaveAttribute("href", "/settings/tariffs");
	});

	test("Лимиты section renders three metrics", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByTestId("limits-section")).toBeInTheDocument();
		});
		expect(screen.getByTestId("metric-requests")).toHaveTextContent("12 / 15");
		expect(screen.getByTestId("metric-employees")).toHaveTextContent("3 / 5");
		expect(screen.getByTestId("metric-emails")).toHaveTextContent("184 / 500");
	});

	test("Сменить тариф links to /settings/tariffs", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByRole("link", { name: /сменить тариф/i })).toBeInTheDocument();
		});
		expect(screen.getByRole("link", { name: /сменить тариф/i })).toHaveAttribute("href", "/settings/tariffs");
	});

	test("Докупить запросы opens the top-up dialog", async () => {
		renderPage();
		const user = userEvent.setup();
		await waitFor(() => {
			expect(screen.getByRole("button", { name: /докупить запросы/i })).toBeInTheDocument();
		});
		await user.click(screen.getByRole("button", { name: /докупить запросы/i }));
		expect(await screen.findByTestId("top-up-dialog")).toBeInTheDocument();
	});

	test("save includes mailingAllowed in the persisted store", async () => {
		renderPage();
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByRole("checkbox", { name: /уведомления/i })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("checkbox", { name: /уведомления/i }));
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(async () => {
			const current = await profileClient.me();
			expect(current.mailingAllowed).toBe(false);
		});
		expect(toast.success).toHaveBeenCalledWith("Изменения сохранены");
	});
});
