import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { SupportClient } from "@/data/clients/support-client";
import { TooManyRequestsError } from "@/data/errors";
import { fakeSupportClient, TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient } from "@/test-utils";
import { SupportDialog } from "./support-dialog";

vi.mock("sonner", () => ({
	toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

function renderDialog(options: { onOpenChange?: (open: boolean) => void; client?: SupportClient } = {}) {
	const onOpenChange = options.onOpenChange ?? vi.fn();
	const client = options.client ?? fakeSupportClient({ send: vi.fn().mockResolvedValue(undefined) });
	const queryClient = createTestQueryClient();
	render(
		<TestClientsProvider queryClient={queryClient} clients={{ support: client }}>
			<SupportDialog open={true} onOpenChange={onOpenChange} />
		</TestClientsProvider>,
	);
	return { onOpenChange, client };
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("SupportDialog", () => {
	test("renders title, textarea, and send button when open", () => {
		renderDialog();
		expect(screen.getByRole("dialog", { name: "Поддержка" })).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Отправить/i })).toBeInTheDocument();
	});

	test("send button is disabled when message is empty", () => {
		renderDialog();
		expect(screen.getByRole("button", { name: /Отправить/i })).toBeDisabled();
	});

	test("send button enables when user types a non-empty message", async () => {
		const user = userEvent.setup();
		renderDialog();
		await user.type(screen.getByRole("textbox"), "Проблема с почтой");
		expect(screen.getByRole("button", { name: /Отправить/i })).toBeEnabled();
	});

	test("submitting sends the message, closes the dialog, and shows a success toast", async () => {
		const { toast } = await import("sonner");
		const send = vi.fn().mockResolvedValue(undefined);
		const onOpenChange = vi.fn();
		const user = userEvent.setup();
		renderDialog({ onOpenChange, client: fakeSupportClient({ send }) });

		await user.type(screen.getByRole("textbox"), "Проблема с почтой");
		await user.click(screen.getByRole("button", { name: /Отправить/i }));

		await waitFor(() => expect(send).toHaveBeenCalledWith({ message: "Проблема с почтой", attachments: [] }));
		await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Сообщение отправлено"));
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
	});

	test("shows an error and keeps the dialog open when sending fails", async () => {
		const { toast } = await import("sonner");
		const send = vi.fn().mockRejectedValue(new Error("boom"));
		const onOpenChange = vi.fn();
		const user = userEvent.setup();
		renderDialog({ onOpenChange, client: fakeSupportClient({ send }) });

		await user.type(screen.getByRole("textbox"), "Не работает");
		await user.click(screen.getByRole("button", { name: /Отправить/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(/не удалось отправить/i);
		expect(toast.success).not.toHaveBeenCalled();
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
	});

	test("surfaces a throttle message on 429", async () => {
		const send = vi.fn().mockRejectedValue(new TooManyRequestsError(null));
		const user = userEvent.setup();
		renderDialog({ client: fakeSupportClient({ send }) });

		await user.type(screen.getByRole("textbox"), "Срочный вопрос");
		await user.click(screen.getByRole("button", { name: /Отправить/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(/слишком много обращений/i);
	});

	test("file input accepts image attachments alongside documents", () => {
		renderDialog();
		const input = document.querySelector("input[type='file']") as HTMLInputElement;
		expect(input.accept).toContain(".png");
		expect(input.accept).toContain(".jpg");
		expect(input.accept).toContain(".pdf");
	});

	test("attaches an image and forwards it to the client", async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const user = userEvent.setup();
		renderDialog({ client: fakeSupportClient({ send }) });

		const input = document.querySelector("input[type='file']") as HTMLInputElement;
		const png = new File([new Uint8Array(1024)], "screenshot.png", { type: "image/png" });
		await user.upload(input, png);
		await user.type(screen.getByRole("textbox"), "Скриншот ошибки");
		await user.click(screen.getByRole("button", { name: /Отправить/i }));

		await waitFor(() => expect(send).toHaveBeenCalledWith({ message: "Скриншот ошибки", attachments: [png] }));
	});

	test("renders two messenger links labeled WhatsApp and Telegram", () => {
		renderDialog();
		const list = screen.getByRole("list", { name: "Мессенджеры поддержки" });
		const links = within(list).getAllByRole("link");
		expect(links).toHaveLength(2);
		expect(screen.queryByRole("link", { name: "MAX" })).not.toBeInTheDocument();
		expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
			"href",
			"https://wa.me/message/K6I2YVKDY4XGH1",
		);
		expect(screen.getByRole("link", { name: "Telegram" })).toHaveAttribute("href", "https://t.me/SdelkaAI");
	});

	test("messenger links open in a new tab with rel='noopener noreferrer'", () => {
		renderDialog();
		for (const name of ["WhatsApp", "Telegram"]) {
			const link = screen.getByRole("link", { name });
			expect(link).toHaveAttribute("target", "_blank");
			expect(link).toHaveAttribute("rel", "noopener noreferrer");
		}
	});
});
