import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { SupportDialog } from "./support-dialog";

vi.mock("sonner", () => ({
	toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

describe("SupportDialog", () => {
	test("renders title, textarea, and send button when open", () => {
		render(<SupportDialog open={true} onOpenChange={() => {}} />);
		expect(screen.getByRole("dialog", { name: "Поддержка" })).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Отправить/i })).toBeInTheDocument();
	});

	test("send button is disabled when message is empty", () => {
		render(<SupportDialog open={true} onOpenChange={() => {}} />);
		expect(screen.getByRole("button", { name: /Отправить/i })).toBeDisabled();
	});

	test("send button enables when user types a non-empty message", async () => {
		const user = userEvent.setup();
		render(<SupportDialog open={true} onOpenChange={() => {}} />);
		await user.type(screen.getByRole("textbox"), "Проблема с почтой");
		expect(screen.getByRole("button", { name: /Отправить/i })).toBeEnabled();
	});

	test("submitting closes the dialog and shows success toast", async () => {
		const { toast } = await import("sonner");
		const onOpenChange = vi.fn();
		const user = userEvent.setup();
		render(<SupportDialog open={true} onOpenChange={onOpenChange} />);
		await user.type(screen.getByRole("textbox"), "Проблема с почтой");
		await user.click(screen.getByRole("button", { name: /Отправить/i }));
		await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Сообщение отправлено"));
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
	});

	test("renders three messenger links labeled MAX, WhatsApp, Telegram", () => {
		render(<SupportDialog open={true} onOpenChange={() => {}} />);
		const list = screen.getByRole("list", { name: "Мессенджеры поддержки" });
		const links = within(list).getAllByRole("link");
		expect(links).toHaveLength(3);
		expect(screen.getByRole("link", { name: "MAX" })).toHaveAttribute("target", "_blank");
		expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("target", "_blank");
		expect(screen.getByRole("link", { name: "Telegram" })).toHaveAttribute("target", "_blank");
	});

	test("messenger links have rel='noopener noreferrer'", () => {
		render(<SupportDialog open={true} onOpenChange={() => {}} />);
		for (const name of ["MAX", "WhatsApp", "Telegram"]) {
			expect(screen.getByRole("link", { name })).toHaveAttribute("rel", "noopener noreferrer");
		}
	});
});
