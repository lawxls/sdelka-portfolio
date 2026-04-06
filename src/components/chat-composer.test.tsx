import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ChatComposer } from "./chat-composer";

function makeFile(name: string, size: number, type = "application/pdf"): File {
	const content = new Uint8Array(size);
	return new File([content], name, { type });
}

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

	test("calls onSend with trimmed body, empty files, and clears textarea on success", async () => {
		const user = userEvent.setup();
		const onSend = vi.fn().mockResolvedValue(undefined);
		render(<ChatComposer onSend={onSend} />);

		await user.type(screen.getByRole("textbox"), "  Здравствуйте!  ");
		await user.click(screen.getByRole("button", { name: "Отправить" }));

		expect(onSend).toHaveBeenCalledWith("Здравствуйте!", []);
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

	describe("file attachments", () => {
		test("renders attach button", () => {
			render(<ChatComposer onSend={vi.fn()} />);
			expect(screen.getByRole("button", { name: "Прикрепить файл" })).toBeInTheDocument();
		});

		test("file input accepts only document types", () => {
			render(<ChatComposer onSend={vi.fn()} />);
			const input = document.querySelector("input[type='file']") as HTMLInputElement;
			expect(input).toBeInTheDocument();
			expect(input.accept).toBe(".pdf,.xlsx,.xls,.doc,.docx,.csv");
		});

		test("file input supports multiple files", () => {
			render(<ChatComposer onSend={vi.fn()} />);
			const input = document.querySelector("input[type='file']") as HTMLInputElement;
			expect(input).toHaveAttribute("multiple");
		});

		test("attaching a file shows chip with name, size, and remove button", async () => {
			const user = userEvent.setup();
			render(<ChatComposer onSend={vi.fn()} />);

			const input = document.querySelector("input[type='file']") as HTMLInputElement;
			const file = makeFile("contract.pdf", 245_000);
			await user.upload(input, file);

			expect(screen.getByText("contract.pdf")).toBeInTheDocument();
			expect(screen.getByText("239 КБ")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /удалить contract\.pdf/i })).toBeInTheDocument();
		});

		test("clicking remove deletes the file from pending list", async () => {
			const user = userEvent.setup();
			render(<ChatComposer onSend={vi.fn()} />);

			const input = document.querySelector("input[type='file']") as HTMLInputElement;
			await user.upload(input, makeFile("contract.pdf", 100_000));

			expect(screen.getByText("contract.pdf")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: /удалить contract\.pdf/i }));
			expect(screen.queryByText("contract.pdf")).not.toBeInTheDocument();
		});

		test("rejects files with invalid type", () => {
			render(<ChatComposer onSend={vi.fn()} />);

			const input = document.querySelector("input[type='file']") as HTMLInputElement;
			const file = makeFile("photo.png", 100_000, "image/png");
			// Use fireEvent to bypass accept attribute filtering in user-event
			fireEvent.change(input, { target: { files: [file] } });

			expect(screen.queryByText("photo.png")).not.toBeInTheDocument();
			expect(screen.getByRole("alert")).toHaveTextContent(/формат/i);
		});

		test("rejects files over 10 MB", async () => {
			const user = userEvent.setup();
			render(<ChatComposer onSend={vi.fn()} />);

			const input = document.querySelector("input[type='file']") as HTMLInputElement;
			const file = makeFile("huge.pdf", 11 * 1024 * 1024);
			await user.upload(input, file);

			expect(screen.queryByText("huge.pdf")).not.toBeInTheDocument();
			expect(screen.getByRole("alert")).toHaveTextContent(/10\s*МБ/i);
		});

		test("rejects when adding more than 5 files total", async () => {
			const user = userEvent.setup();
			render(<ChatComposer onSend={vi.fn()} />);

			const input = document.querySelector("input[type='file']") as HTMLInputElement;
			const files = Array.from({ length: 5 }, (_, i) => makeFile(`file${i + 1}.pdf`, 1000));
			await user.upload(input, files);

			// All 5 should be accepted
			for (let i = 1; i <= 5; i++) {
				expect(screen.getByText(`file${i}.pdf`)).toBeInTheDocument();
			}

			// 6th file should be rejected
			const extraFile = makeFile("file6.pdf", 1000);
			await user.upload(input, extraFile);

			expect(screen.queryByText("file6.pdf")).not.toBeInTheDocument();
			expect(screen.getByRole("alert")).toHaveTextContent(/5/);
		});

		test("sends files alongside body", async () => {
			const user = userEvent.setup();
			const onSend = vi.fn().mockResolvedValue(undefined);
			render(<ChatComposer onSend={onSend} />);

			const input = document.querySelector("input[type='file']") as HTMLInputElement;
			const file = makeFile("offer.pdf", 50_000);
			await user.upload(input, file);

			await user.type(screen.getByRole("textbox"), "Вот документ");
			await user.click(screen.getByRole("button", { name: "Отправить" }));

			expect(onSend).toHaveBeenCalledWith("Вот документ", [file]);
		});

		test("chips clear after successful send", async () => {
			const user = userEvent.setup();
			const onSend = vi.fn().mockResolvedValue(undefined);
			render(<ChatComposer onSend={onSend} />);

			const input = document.querySelector("input[type='file']") as HTMLInputElement;
			await user.upload(input, makeFile("offer.pdf", 50_000));

			expect(screen.getByText("offer.pdf")).toBeInTheDocument();

			await user.type(screen.getByRole("textbox"), "Документ");
			await user.click(screen.getByRole("button", { name: "Отправить" }));

			expect(screen.queryByText("offer.pdf")).not.toBeInTheDocument();
		});

		test("chips preserved on failed send", async () => {
			const user = userEvent.setup();
			const onSend = vi.fn().mockRejectedValue(new Error("fail"));
			render(<ChatComposer onSend={onSend} />);

			const input = document.querySelector("input[type='file']") as HTMLInputElement;
			await user.upload(input, makeFile("offer.pdf", 50_000));

			await user.type(screen.getByRole("textbox"), "Документ");
			await user.click(screen.getByRole("button", { name: "Отправить" }));

			expect(screen.getByText("offer.pdf")).toBeInTheDocument();
		});

		test("can send with only files attached (empty body)", async () => {
			const user = userEvent.setup();
			const onSend = vi.fn().mockResolvedValue(undefined);
			render(<ChatComposer onSend={onSend} />);

			const input = document.querySelector("input[type='file']") as HTMLInputElement;
			await user.upload(input, makeFile("offer.pdf", 50_000));

			// Send button should be enabled even without text
			expect(screen.getByRole("button", { name: "Отправить" })).toBeEnabled();

			await user.click(screen.getByRole("button", { name: "Отправить" }));
			expect(onSend).toHaveBeenCalledWith("", [expect.any(File)]);
		});

		test("attach button disabled while isPending", () => {
			render(<ChatComposer onSend={vi.fn()} isPending />);
			expect(screen.getByRole("button", { name: "Прикрепить файл" })).toBeDisabled();
		});

		test("validation error clears when valid file is added", () => {
			render(<ChatComposer onSend={vi.fn()} />);

			const input = document.querySelector("input[type='file']") as HTMLInputElement;

			// Add invalid file via fireEvent to bypass accept filtering
			fireEvent.change(input, { target: { files: [makeFile("photo.png", 1000, "image/png")] } });
			expect(screen.getByRole("alert")).toBeInTheDocument();

			// Add valid file via fireEvent — error should clear
			fireEvent.change(input, { target: { files: [makeFile("valid.pdf", 1000)] } });
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		});
	});
});
