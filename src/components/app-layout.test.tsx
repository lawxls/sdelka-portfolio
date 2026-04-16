import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { _resetWorkspaceStore, _setUserSettings } from "@/data/workspace-mock-data";
import { createTestQueryClient, makeSettings } from "@/test-utils";
import { AppLayout } from "./app-layout";

beforeEach(() => {
	_setUserSettings(makeSettings());
});

afterEach(() => {
	_resetWorkspaceStore();
});

function renderLayout(initialEntry = "/procurement") {
	const queryClient = createTestQueryClient();
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[initialEntry]}>
				<Routes>
					<Route element={<AppLayout />}>
						<Route path="/procurement" element={<div>procurement-content</div>} />
						<Route path="/tasks" element={<div>tasks-content</div>} />
					</Route>
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("AppLayout — global header", () => {
	test("renders logo wordmark in header", () => {
		renderLayout();
		const header = screen.getByTestId("global-header");
		const svg = header.querySelector('svg[viewBox="0 0 1121 203"]');
		expect(svg).toBeInTheDocument();
	});

	test("logo links to /procurement", async () => {
		renderLayout("/tasks");
		const user = userEvent.setup();
		await user.click(screen.getByRole("link", { name: "На главную" }));
		expect(screen.getByText("procurement-content")).toBeInTheDocument();
	});

	test("renders Beta badge on desktop", () => {
		renderLayout();
		expect(screen.getByText("Beta")).toBeInTheDocument();
	});

	test("renders user avatar menu", () => {
		renderLayout();
		expect(screen.getByRole("button", { name: "Меню пользователя" })).toBeInTheDocument();
	});

	test("renders child route content", () => {
		renderLayout();
		expect(screen.getByText("procurement-content")).toBeInTheDocument();
	});
});
