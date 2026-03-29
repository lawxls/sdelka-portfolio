import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, test } from "vitest";
import { AuthLayout } from "./auth-layout";

function renderWithRouter(initialEntries = ["/login"]) {
	return render(
		<MemoryRouter initialEntries={initialEntries}>
			<Routes>
				<Route element={<AuthLayout />}>
					<Route path="/login" element={<div>Login Form</div>} />
				</Route>
			</Routes>
		</MemoryRouter>,
	);
}

describe("AuthLayout", () => {
	test("renders child route content", () => {
		renderWithRouter();
		expect(screen.getByText("Login Form")).toBeInTheDocument();
	});

	test("displays logo wordmark", () => {
		renderWithRouter();
		const svg = document.querySelector('svg[viewBox="0 0 1121 203"]');
		expect(svg).toBeInTheDocument();
	});

	test("renders gradient panel on desktop", () => {
		renderWithRouter();
		expect(screen.getByTestId("auth-gradient-panel")).toBeInTheDocument();
	});
});
