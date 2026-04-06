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
	describe("deadline stepper", () => {
		test("renders with default value 3", () => {
			renderPage();
			expect(screen.getByLabelText("Дедлайн на ответ")).toHaveValue("3");
		});

		test("plus button increments by 1", async () => {
			renderPage();
			const user = userEvent.setup();
			await user.click(screen.getByRole("button", { name: "Увеличить" }));
			expect(screen.getByLabelText("Дедлайн на ответ")).toHaveValue("4");
		});

		test("minus button decrements by 1", async () => {
			renderPage();
			const user = userEvent.setup();
			await user.click(screen.getByRole("button", { name: "Уменьшить" }));
			expect(screen.getByLabelText("Дедлайн на ответ")).toHaveValue("2");
		});

		test("minus button disables at min (1)", async () => {
			renderPage();
			const user = userEvent.setup();
			const minus = screen.getByRole("button", { name: "Уменьшить" });
			// Click down to 1
			for (let i = 0; i < 2; i++) await user.click(minus);
			expect(screen.getByLabelText("Дедлайн на ответ")).toHaveValue("1");
			expect(minus).toBeDisabled();
		});

		test("plus button disables at max (30)", async () => {
			renderPage();
			const user = userEvent.setup();
			const input = screen.getByLabelText("Дедлайн на ответ");
			const plus = screen.getByRole("button", { name: "Увеличить" });
			// Type 30 directly
			await user.clear(input);
			await user.type(input, "30");
			expect(plus).toBeDisabled();
		});

		test("manual input clamps to bounds on blur", async () => {
			renderPage();
			const user = userEvent.setup();
			const input = screen.getByLabelText("Дедлайн на ответ");
			await user.clear(input);
			await user.type(input, "50");
			await user.tab(); // blur
			expect(input).toHaveValue("30");
		});

		test("manual input clamps to min on blur", async () => {
			renderPage();
			const user = userEvent.setup();
			const input = screen.getByLabelText("Дедлайн на ответ");
			await user.clear(input);
			await user.type(input, "0");
			await user.tab();
			expect(input).toHaveValue("1");
		});
	});

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

		test("save button enabled after deadline change", async () => {
			renderPage();
			const user = userEvent.setup();
			await user.click(screen.getByRole("button", { name: "Увеличить" }));
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
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
			await user.click(screen.getByRole("button", { name: "Увеличить" }));
			await user.click(screen.getByRole("button", { name: "Сохранить" }));
			expect(toast.success).toHaveBeenCalledWith("Изменения сохранены");
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
		});

		test("save resets dirty tracking to new values", async () => {
			renderPage();
			const user = userEvent.setup();
			// Change deadline to 4, save
			await user.click(screen.getByRole("button", { name: "Увеличить" }));
			await user.click(screen.getByRole("button", { name: "Сохранить" }));
			// Now 4 is the baseline — changing back to 3 should be dirty
			await user.click(screen.getByRole("button", { name: "Уменьшить" }));
			expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
		});
	});
});
