import type { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import type { CurrentEmployee } from "@/data/domains/profile";
import { _resetMockDelay, _setMockDelay } from "@/data/mock-utils";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient, makeMe } from "@/test-utils";
import { RequireModule } from "./require-module";

let queryClient: QueryClient;

beforeEach(() => {
	_setMockDelay(0, 0);
	queryClient = createTestQueryClient();
});

afterEach(() => {
	_resetMockDelay();
});

function renderRoute({
	initialPath = "/inquiries",
	me,
	module,
}: {
	initialPath?: string;
	me: CurrentEmployee;
	module: "procurementInquiries" | "tasks" | "companies";
}) {
	queryClient.setQueryData(["me"], me);
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ profile: createInMemoryProfileClient({ me }) }}>
			<MemoryRouter initialEntries={[initialPath]}>
				<Routes>
					<Route element={<RequireModule module={module} />}>
						<Route path="/inquiries" element={<div>inquiries-page</div>} />
						<Route path="/inquiries/:slug" element={<div>inquiry-detail</div>} />
						<Route path="/tasks" element={<div>tasks-page</div>} />
						<Route path="/settings/companies" element={<div>companies-page</div>} />
					</Route>
					<Route path="/positions" element={<div>positions-page</div>} />
					<Route path="/settings/profile" element={<div>profile-page</div>} />
				</Routes>
			</MemoryRouter>
		</TestClientsProvider>,
	);
}

describe("RequireModule", () => {
	test("renders the outlet when the user has view permission", async () => {
		const me = makeMe();
		renderRoute({ me, module: "procurementInquiries" });
		expect(await screen.findByText("inquiries-page")).toBeInTheDocument();
	});

	test("redirects to first-accessible path when user lacks view", async () => {
		const me = makeMe({
			role: "user",
			isWorkspaceOwner: false,
			permissions: {
				id: "p-1",
				employeeId: "1",
				procurementInquiries: "none",
				positions: "edit",
				tasks: "none",
				workspaceSettings: "none",
				companies: "none",
				employees: "none",
				emails: "none",
			},
		});
		renderRoute({ initialPath: "/inquiries", me, module: "procurementInquiries" });
		// `firstAccessiblePath` for this user is /positions (next viewable in nav order).
		expect(await screen.findByText("positions-page")).toBeInTheDocument();
		expect(screen.queryByText("inquiries-page")).not.toBeInTheDocument();
	});

	test("redirects to /settings/profile when no module is viewable", async () => {
		const me = makeMe({
			role: "user",
			isWorkspaceOwner: false,
			permissions: {
				id: "p-1",
				employeeId: "1",
				procurementInquiries: "none",
				positions: "none",
				tasks: "none",
				workspaceSettings: "none",
				companies: "none",
				employees: "none",
				emails: "none",
			},
		});
		renderRoute({ initialPath: "/tasks", me, module: "tasks" });
		expect(await screen.findByText("profile-page")).toBeInTheDocument();
	});

	test("admin always passes the gate regardless of stored permissions", async () => {
		const me = makeMe({
			role: "admin",
			isWorkspaceOwner: false,
			permissions: {
				id: "p-1",
				employeeId: "1",
				procurementInquiries: "none",
				positions: "none",
				tasks: "none",
				workspaceSettings: "none",
				companies: "none",
				employees: "none",
				emails: "none",
			},
		});
		renderRoute({ initialPath: "/settings/companies", me, module: "companies" });
		expect(await screen.findByText("companies-page")).toBeInTheDocument();
	});

	test("gates the nested detail route when the parent module is hidden", async () => {
		const me = makeMe({
			role: "user",
			isWorkspaceOwner: false,
			permissions: {
				id: "p-1",
				employeeId: "1",
				procurementInquiries: "none",
				positions: "view",
				tasks: "none",
				workspaceSettings: "none",
				companies: "none",
				employees: "none",
				emails: "none",
			},
		});
		renderRoute({ initialPath: "/inquiries/abc-123", me, module: "procurementInquiries" });
		expect(await screen.findByText("positions-page")).toBeInTheDocument();
		expect(screen.queryByText("inquiry-detail")).not.toBeInTheDocument();
	});
});
