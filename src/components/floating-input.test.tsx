import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { FloatingInput } from "./floating-input";

describe("FloatingInput", () => {
	test("renders input with floating label", () => {
		render(<FloatingInput label="Email" name="email" type="email" />);
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
	});

	test("label floats when input has value", async () => {
		const user = userEvent.setup();
		render(<FloatingInput label="Email" name="email" />);
		const input = screen.getByLabelText("Email");
		await user.type(input, "test@test.com");
		// Input has value — placeholder-shown is false so label should float
		expect(input).toHaveValue("test@test.com");
	});

	test("displays error message when provided", () => {
		render(<FloatingInput label="Email" name="email" error="Обязательное поле" />);
		expect(screen.getByText("Обязательное поле")).toBeInTheDocument();
		expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
	});

	test("does not display error when not provided", () => {
		render(<FloatingInput label="Email" name="email" />);
		expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid", "true");
	});

	test("password type renders toggle button", () => {
		render(<FloatingInput label="Пароль" name="password" type="password" />);
		expect(screen.getByRole("button", { name: "Показать пароль" })).toBeInTheDocument();
	});

	test("password toggle switches between password and text", async () => {
		const user = userEvent.setup();
		render(<FloatingInput label="Пароль" name="password" type="password" />);
		const input = screen.getByLabelText("Пароль");
		expect(input).toHaveAttribute("type", "password");

		await user.click(screen.getByRole("button", { name: "Показать пароль" }));
		expect(input).toHaveAttribute("type", "text");
		expect(screen.getByRole("button", { name: "Скрыть пароль" })).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Скрыть пароль" }));
		expect(input).toHaveAttribute("type", "password");
	});

	test("non-password type does not render toggle", () => {
		render(<FloatingInput label="Email" name="email" type="email" />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
