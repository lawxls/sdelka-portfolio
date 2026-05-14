import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, test } from "vitest";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import { fakeSessionClient, TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient, makeMe, TooltipWrapper } from "@/test-utils";
import { SettingsLayout } from "./settings-layout";

function renderLayout() {
	return render(
		<TestClientsProvider
			queryClient={createTestQueryClient()}
			clients={{
				profile: createInMemoryProfileClient({ me: makeMe() }),
				session: fakeSessionClient(),
			}}
		>
			<TooltipWrapper>
				<MemoryRouter initialEntries={["/settings/profile"]}>
					<Routes>
						<Route element={<SettingsLayout />}>
							<Route path="/settings/profile" element={<main data-testid="settings-outlet-content">Profile</main>} />
						</Route>
					</Routes>
				</MemoryRouter>
			</TooltipWrapper>
		</TestClientsProvider>,
	);
}

describe("SettingsLayout", () => {
	test("lets route pages own scrolling", () => {
		renderLayout();
		const outletContent = screen.getByTestId("settings-outlet-content");
		expect(outletContent.parentElement).toHaveClass("min-h-0", "overflow-hidden");
	});
});
