import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { createInMemoryItemsClient } from "@/data/clients/items-in-memory";
import { createInMemorySuppliersClient } from "@/data/clients/suppliers-in-memory";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { _resetWorkspaceStore, _setUserSettings } from "@/data/workspace-mock-data";
import { createTestQueryClient, makeSettings, TooltipWrapper } from "@/test-utils";
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
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: createInMemoryCompaniesClient([]),
				items: createInMemoryItemsClient({ seed: [] }),
				suppliers: createInMemorySuppliersClient(),
			}}
		>
			<TooltipWrapper>
				<MemoryRouter initialEntries={[initialEntry]}>
					<Routes>
						<Route element={<AppLayout />}>
							<Route path="/procurement" element={<div>procurement-content</div>} />
							<Route path="/tasks" element={<div>tasks-content</div>} />
							<Route path="/settings" element={<div>settings-content</div>} />
						</Route>
					</Routes>
				</MemoryRouter>
			</TooltipWrapper>
		</TestClientsProvider>,
	);
}

describe("AppLayout — sidebar", () => {
	test("renders logo wordmark inside the sidebar", () => {
		renderLayout();
		const rail = screen.getByTestId("app-rail");
		const svg = rail.querySelector('svg[viewBox="0 0 1121 203"]');
		expect(svg).toBeInTheDocument();
	});

	test("logo links to /procurement", async () => {
		renderLayout("/tasks");
		const user = userEvent.setup();
		await user.click(screen.getByRole("link", { name: "На главную" }));
		expect(screen.getByText("procurement-content")).toBeInTheDocument();
	});
});

describe("AppLayout — global header", () => {
	test("does not render a page title", () => {
		renderLayout("/procurement");
		expect(screen.queryByTestId("page-title")).not.toBeInTheDocument();
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

describe("AppLayout — top-level navigation", () => {
	test("mounts AppRail", () => {
		renderLayout();
		expect(screen.getByTestId("app-rail")).toBeInTheDocument();
	});

	test("mounts BottomTabBar", () => {
		renderLayout();
		expect(screen.getByTestId("bottom-tab-bar")).toBeInTheDocument();
	});
});
