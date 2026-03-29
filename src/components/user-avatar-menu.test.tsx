import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { UserAvatarMenu } from "./user-avatar-menu";

beforeEach(() => {
	localStorage.clear();
	vi.spyOn(console, "error").mockImplementation(() => {});
});

function renderMenu(initialEntries = ["/"]) {
	return render(
		<MemoryRouter initialEntries={initialEntries}>
			<Routes>
				<Route
					path="*"
					element={
						<>
							<UserAvatarMenu />
							<Routes>
								<Route path="/profile" element={<div data-testid="profile-page">Profile</div>} />
							</Routes>
						</>
					}
				/>
			</Routes>
		</MemoryRouter>,
	);
}

describe("UserAvatarMenu", () => {
	test("Мой профиль navigates to /profile", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByText("Мой профиль")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Мой профиль"));

		await waitFor(() => {
			expect(screen.getByTestId("profile-page")).toBeInTheDocument();
		});
	});

	test("Настройки navigates to /profile?tab=settings", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByText("Настройки")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Настройки"));

		await waitFor(() => {
			expect(screen.getByTestId("profile-page")).toBeInTheDocument();
		});
	});
});
