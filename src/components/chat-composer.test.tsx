import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ChatComposer } from "./chat-composer";

describe("ChatComposer", () => {
	test("renders textarea and send button", () => {
		render(<ChatComposer onSend={vi.fn()} />);
		expect(screen.getByRole("textbox")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отправить" })).toBeInTheDocument();
	});

	test("send button disabled when textarea is empty", () => {
		render(<ChatComposer onSend={vi.fn()} />);
		expect(screen.getByRole("button", { name: "Отправить" })).toBeDisabled();
	});

	test("calls onSend with trimmed body and clears textarea on success", async () => {
		const user = userEvent.setup();
		const onSend = vi.fn().mockResolvedValue(undefined);
		render(<ChatComposer onSend={onSend} />);

		await user.type(screen.getByRole("textbox"), "  Здравствуйте!  ");
		await user.click(screen.getByRole("button", { name: "Отправить" }));

		expect(onSend).toHaveBeenCalledWith("Здравствуйте!");
		expect(screen.getByRole("textbox")).toHaveValue("");
	});

	test("does not clear textarea on failed send", async () => {
		const user = userEvent.setup();
		const onSend = vi.fn().mockRejectedValue(new Error("fail"));
		render(<ChatComposer onSend={onSend} />);

		await user.type(screen.getByRole("textbox"), "Тестовое сообщение");
		await user.click(screen.getByRole("button", { name: "Отправить" }));

		expect(screen.getByRole("textbox")).toHaveValue("Тестовое сообщение");
	});

	test("send button disabled and shows spinner while isPending", () => {
		render(<ChatComposer onSend={vi.fn()} isPending />);
		const btn = screen.getByRole("button", { name: "Отправить" });
		expect(btn).toBeDisabled();
		expect(btn.querySelector(".animate-spin")).toBeInTheDocument();
	});

	test("displays error message", () => {
		render(<ChatComposer onSend={vi.fn()} error="Не удалось отправить сообщение" />);
		expect(screen.getByText("Не удалось отправить сообщение")).toBeInTheDocument();
	});

	test("textarea has rows=3 for multi-line input", () => {
		render(<ChatComposer onSend={vi.fn()} />);
		expect(screen.getByRole("textbox")).toHaveAttribute("rows", "3");
	});

	test("textarea disabled while isPending", () => {
		render(<ChatComposer onSend={vi.fn()} isPending />);
		expect(screen.getByRole("textbox")).toBeDisabled();
	});
});
