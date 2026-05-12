import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { createInMemoryFoldersClient } from "@/data/clients/folders-in-memory";
import { createInMemoryItemsClient } from "@/data/clients/items-in-memory";
import { createInMemoryProcurementInquiriesClient } from "@/data/clients/procurement-inquiries-in-memory";
import { _setMockDelay } from "@/data/mock-utils";
import { SEED_ITEMS } from "@/data/seeds/items";
import { SEED_PROCUREMENT_INQUIRIES } from "@/data/seeds/procurement-inquiries";
import { TestClientsProvider } from "@/data/test-clients-provider";

import { DetailsTabPanel } from "./details-tab-panel";

let queryClient: QueryClient;

function renderPanel(itemId = "item-1") {
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: createInMemoryCompaniesClient(),
				items: createInMemoryItemsClient({ seed: SEED_ITEMS }),
				folders: createInMemoryFoldersClient(),
				procurementInquiries: createInMemoryProcurementInquiriesClient({ seed: SEED_PROCUREMENT_INQUIRIES }),
			}}
		>
			<DetailsTabPanel itemId={itemId} />
		</TestClientsProvider>,
	);
}

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	_setMockDelay(0, 0);
});

describe("DetailsTabPanel", () => {
	test("renders the four always-visible sections in order (plus Ответы на уточнения when present)", async () => {
		renderPanel();

		// Wait for the parent inquiry to load — Дополнительно gates on inquiry data.
		await waitFor(() => {
			expect(screen.getByText("Дополнительно")).toBeInTheDocument();
		});

		const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
		expect(headings).toEqual(["Основное", "Логистика", "Дополнительно", "Ваш поставщик", "Ответы на уточнения"]);
	});

	test("reads inquiry-level fields from the parent inquiry (current supplier name in Ваш поставщик)", async () => {
		renderPanel();

		await waitFor(() => {
			// item-1's parent inquiry T-001 carries currentSupplier = ПолимерПром
			expect(screen.getByText("ПолимерПром")).toBeInTheDocument();
		});
		// item name renders read-only
		expect(screen.getByText("Полотно ПВД 2600 мм")).toBeInTheDocument();
	});

	test("shows section-level edit button only for item-level sections (Основное + Ответы)", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		// ProcurementInquiry-level sections are read-only after the schema migration; item-level
		// sections still allow edits in the item drawer.
		expect(screen.getByRole("button", { name: "Редактировать основную информацию" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Редактировать ответы на уточнения" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Редактировать логистику и финансы" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Редактировать дополнительно" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Редактировать текущего поставщика" })).not.toBeInTheDocument();
	});

	test("shows loading skeleton while fetching", () => {
		_setMockDelay(10000, 10000);
		renderPanel();
		expect(screen.getByTestId("details-loading")).toBeInTheDocument();
	});

	test("shows error state for unknown item ID", async () => {
		renderPanel("unknown-item");
		await waitFor(() => {
			expect(screen.getByTestId("details-error")).toBeInTheDocument();
		});
	});

	test("Основное edit toggles into edit mode and saves the new name", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

		const nameInput = await screen.findByRole("textbox", { name: "Название" });
		expect(nameInput).toHaveValue("Полотно ПВД 2600 мм");

		await user.clear(nameInput);
		await user.type(nameInput, "Полотно ПВД 1800 мм");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
		});
		expect(screen.getByText("Полотно ПВД 1800 мм")).toBeInTheDocument();
	});
});
