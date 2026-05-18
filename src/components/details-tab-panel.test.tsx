import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { createInMemoryItemsClient } from "@/data/clients/items-in-memory";
import { createInMemoryProcurementInquiriesClient } from "@/data/clients/procurement-inquiries-in-memory";
import { _setMockDelay } from "@/data/mock-utils";
import { SEED_ITEMS } from "@/data/seeds/items";
import { TestClientsProvider, testFoldersClient } from "@/data/test-clients-provider";
import { makeProcurementInquiry } from "@/test-utils";

import { DetailsTabPanel } from "./details-tab-panel";

const TEST_INQUIRIES = [
	makeProcurementInquiry("T-001", { name: "Упаковочные материалы Q2", folderId: "folder-packaging" }),
	makeProcurementInquiry("T-002", { name: "Наполнители", folderId: "folder-fillings" }),
	makeProcurementInquiry("T-003", { name: "Жаккард", folderId: "folder-fabrics" }),
	makeProcurementInquiry("T-004", { name: "ЛДСП", folderId: "folder-panels" }),
	makeProcurementInquiry("T-005", { name: "Пружинные блоки", folderId: "folder-springs" }),
	makeProcurementInquiry("T-006", { name: "Клей ПУ", folderId: "folder-chemistry" }),
];

let queryClient: QueryClient;

function renderPanel(itemId = "item-1") {
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: createInMemoryCompaniesClient(),
				items: createInMemoryItemsClient({ seed: SEED_ITEMS }),
				folders: testFoldersClient(),
				procurementInquiries: createInMemoryProcurementInquiriesClient({ seed: TEST_INQUIRIES }),
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
	test("renders the four item-drawer sections in order (no per-item Ответы — those moved to the inquiry detail)", async () => {
		renderPanel();

		// Wait for the parent inquiry to load — Дополнительно gates on inquiry data.
		await waitFor(() => {
			expect(screen.getByText("Дополнительно")).toBeInTheDocument();
		});

		const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
		expect(headings).toEqual(["Основное", "Логистика", "Дополнительно", "Ваш поставщик"]);
		expect(screen.queryByText("Ответы на уточнения")).not.toBeInTheDocument();
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

	test("shows section-level edit button only for the item-level Основное section", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		// Inquiry-level sections are read-only here; clarifications moved off the item.
		expect(screen.getByRole("button", { name: "Редактировать основную информацию" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Редактировать ответы на уточнения" })).not.toBeInTheDocument();
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
