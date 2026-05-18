import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { setTokens } from "@/data/auth";
import type { WorkspaceSettingsClient } from "@/data/clients/workspace-settings-client";
import { createInMemoryWorkspaceSettingsClient } from "@/data/clients/workspace-settings-in-memory";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { mockHostname } from "@/test-utils";
import { WorkspaceSettingsPage } from "./workspace-settings-page";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

let queryClient: QueryClient;
let workspaceSettings: WorkspaceSettingsClient;

function renderPage(opts: { workspaceSettings?: WorkspaceSettingsClient } = {}) {
	workspaceSettings = opts.workspaceSettings ?? createInMemoryWorkspaceSettingsClient();
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ workspaceSettings }}>
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

		test("hydrates from the workspace settings endpoint", async () => {
			renderPage({
				workspaceSettings: createInMemoryWorkspaceSettingsClient({
					settings: { agentInstructions: "Сохранённые инструкции" },
				}),
			});
			const textarea = await screen.findByPlaceholderText(/всегда уточняй/i);
			expect(textarea).toHaveValue("Сохранённые инструкции");
		});

		test("does not render the email signature section", async () => {
			renderPage();
			await screen.findByPlaceholderText(/всегда уточняй/i);
			expect(screen.queryByLabelText("Подпись")).not.toBeInTheDocument();
			expect(screen.queryByText(/Подпись в письмах/i)).not.toBeInTheDocument();
		});
	});

	describe("save flow", () => {
		test("save button disabled when no changes", async () => {
			renderPage();
			await screen.findByPlaceholderText(/всегда уточняй/i);
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		});

		test("save button enabled after instructions change", async () => {
			renderPage();
			const user = userEvent.setup();
			await user.type(await screen.findByPlaceholderText(/всегда уточняй/i), "Тест");
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
		});

		test("save persists instructions to the workspace settings endpoint", async () => {
			renderPage();
			const user = userEvent.setup();
			await user.type(await screen.findByPlaceholderText(/всегда уточняй/i), "Новые инструкции");
			await user.click(screen.getByRole("button", { name: "Сохранить" }));
			await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Изменения сохранены"));
			const current = await workspaceSettings.get();
			expect(current.agentInstructions).toBe("Новые инструкции");
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		});

		test("surfaces an error toast and keeps the form dirty when the request fails", async () => {
			const failing = createInMemoryWorkspaceSettingsClient();
			failing.update = vi.fn().mockRejectedValue(new Error("boom"));
			renderPage({ workspaceSettings: failing });
			const user = userEvent.setup();
			await user.type(await screen.findByPlaceholderText(/всегда уточняй/i), "Что-то");
			await user.click(screen.getByRole("button", { name: "Сохранить" }));
			await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Не удалось сохранить настройки"));
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
		});
	});
});
