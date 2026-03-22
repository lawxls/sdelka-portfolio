import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { setAuthenticated } from "@/data/auth";
import { AuthGate } from "./auth-gate";

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("AuthGate", () => {
	test("renders the code modal when not authenticated", () => {
		render(
			<AuthGate>
				<div>App Content</div>
			</AuthGate>,
		);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.queryByText("App Content")).not.toBeInTheDocument();
	});

	test("renders children when authenticated", () => {
		setAuthenticated();
		render(
			<AuthGate>
				<div>App Content</div>
			</AuthGate>,
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.getByText("App Content")).toBeInTheDocument();
	});

	test("after correct code entry, modal disappears and children render", async () => {
		const user = userEvent.setup();
		render(
			<AuthGate>
				<div>App Content</div>
			</AuthGate>,
		);

		const cells = screen.getAllByRole("textbox");
		await user.click(cells[0]);
		await user.paste("Sd3lk");

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.getByText("App Content")).toBeInTheDocument();
	});

	test("after wrong code entry, error message appears and inputs clear", async () => {
		const user = userEvent.setup();
		render(
			<AuthGate>
				<div>App Content</div>
			</AuthGate>,
		);

		const cells = screen.getAllByRole("textbox");
		await user.click(cells[0]);
		await user.paste("WRONG");

		expect(screen.getByText("Неверный код доступа")).toBeInTheDocument();
		for (const cell of screen.getAllByRole("textbox")) {
			expect(cell).toHaveValue("");
		}
	});

	test("modal cannot be dismissed via Escape key", async () => {
		const user = userEvent.setup();
		render(
			<AuthGate>
				<div>App Content</div>
			</AuthGate>,
		);

		await user.keyboard("{Escape}");

		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.queryByText("App Content")).not.toBeInTheDocument();
	});
});
