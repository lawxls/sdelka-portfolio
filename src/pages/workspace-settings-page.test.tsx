import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { setTokens } from "@/data/auth";
import type { ProfileClient } from "@/data/clients/profile-client";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { makeMe, mockHostname } from "@/test-utils";
import { WorkspaceSettingsPage } from "./workspace-settings-page";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

let queryClient: QueryClient;

function renderPage(opts: { profile?: ProfileClient } = {}) {
	const profile = opts.profile ?? createInMemoryProfileClient({ me: makeMe() });
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ profile }}>
			<WorkspaceSettingsPage />
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
	vi.clearAllMocks();
});

describe("WorkspaceSettingsPage", () => {
	describe("agent instructions textarea", () => {
		test("renders with placeholder", async () => {
			renderPage();
			expect(await screen.findByPlaceholderText(/всегда уточняй/i)).toBeInTheDocument();
		});
	});

	describe("email signature textarea", () => {
		test("prefills with «С уважением, {full name}» from current user", async () => {
			renderPage();
			const signature = await screen.findByLabelText("Подпись");
			expect(signature).toHaveValue("С уважением,\nИван Иванов");
		});

		test("description copy mentions ФИО, должность и контакты", async () => {
			renderPage();
			expect(await screen.findByText(/Будет добавляться в конце писем поставщикам/i)).toBeInTheDocument();
		});

		test("editing the signature enables Save", async () => {
			renderPage();
			const user = userEvent.setup();
			const signature = await screen.findByLabelText("Подпись");
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
			await user.type(signature, "\nДиректор по закупкам");
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
		});
	});

	describe("save flow", () => {
		test("save button disabled when no changes", async () => {
			renderPage();
			await screen.findByLabelText("Подпись");
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		});

		test("save button enabled after instructions change", async () => {
			renderPage();
			const user = userEvent.setup();
			await user.type(await screen.findByPlaceholderText(/всегда уточняй/i), "Тест");
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
		});

		test("save triggers toast and resets dirty state", async () => {
			renderPage();
			const user = userEvent.setup();
			await user.type(await screen.findByPlaceholderText(/всегда уточняй/i), "Новые инструкции");
			await user.click(screen.getByRole("button", { name: "Сохранить" }));
			await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Изменения сохранены"));
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		});
	});
});
