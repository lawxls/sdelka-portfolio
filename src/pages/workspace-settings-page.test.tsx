import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { WorkspaceSettingsPage } from "./workspace-settings-page";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function renderPage() {
	return render(<WorkspaceSettingsPage />);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("WorkspaceSettingsPage", () => {
	describe("agent instructions textarea", () => {
		test("renders with placeholder", () => {
			renderPage();
			expect(screen.getByPlaceholderText(/всегда уточняй/i)).toBeInTheDocument();
		});
	});

	describe("save flow", () => {
		test("save button disabled when no changes", () => {
			renderPage();
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		});

		test("save button enabled after instructions change", async () => {
			renderPage();
			const user = userEvent.setup();
			await user.type(screen.getByPlaceholderText(/всегда уточняй/i), "Тест");
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
		});

		test("save triggers toast and resets dirty state", async () => {
			renderPage();
			const user = userEvent.setup();
			await user.type(screen.getByPlaceholderText(/всегда уточняй/i), "Новые инструкции");
			await user.click(screen.getByRole("button", { name: "Сохранить" }));
			expect(toast.success).toHaveBeenCalledWith("Изменения сохранены");
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		});
	});
});
