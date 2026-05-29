import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SettingsLayout } from "@/components/settings-layout";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { EmailsClient } from "@/data/clients/emails-client";
import { createInMemoryEmailsClient } from "@/data/clients/emails-in-memory";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import { createInMemorySessionClient } from "@/data/clients/session-in-memory";
import type { WorkspaceEmail } from "@/data/domains/emails";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient, makeMe, mockHostname } from "@/test-utils";
import { EmailsSettingsPage } from "./emails-settings-page";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const EMAILS: WorkspaceEmail[] = [
	{
		id: "email-1",
		email: "buyer@example.com",
		status: "active",
		type: "corporate",
		sentCount: 12,
	},
];

let queryClient: QueryClient;

function renderPage(client: EmailsClient = createInMemoryEmailsClient(EMAILS)) {
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				emails: client,
				profile: createInMemoryProfileClient({ me: makeMe() }),
				session: createInMemorySessionClient(),
			}}
		>
			<TooltipProvider>
				<MemoryRouter initialEntries={["/settings/emails"]}>
					<Routes>
						<Route element={<SettingsLayout />}>
							<Route path="*" element={<EmailsSettingsPage />} />
						</Route>
					</Routes>
				</MemoryRouter>
			</TooltipProvider>
		</TestClientsProvider>,
	);
}

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	sessionStorage.setItem("auth-access-token", "test-token");
});

describe("EmailsSettingsPage archive view", () => {
	test("clicking archive refetches the emails list once per toggle", async () => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
		});
		const client = createInMemoryEmailsClient(EMAILS);
		const listSpy = vi.spyOn(client, "list");
		renderPage(client);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByText("buyer@example.com")).toBeInTheDocument();
		});
		listSpy.mockClear();

		await user.click(screen.getByRole("button", { name: "Показать архив" }));

		await waitFor(() => {
			expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ archived: true }));
		});
		expect(listSpy).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole("button", { name: "Скрыть архив" }));

		await waitFor(() => {
			expect(listSpy).toHaveBeenCalledTimes(2);
		});
		expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ archived: false }));

		await user.click(screen.getByRole("button", { name: "Показать архив" }));

		await waitFor(() => {
			expect(listSpy).toHaveBeenCalledTimes(3);
		});
		expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ archived: true }));
	});
});
