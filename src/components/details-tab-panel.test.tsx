import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { createInMemoryItemsClient } from "@/data/clients/items-in-memory";
import { createInMemoryProcurementInquiriesClient } from "@/data/clients/procurement-inquiries-in-memory";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import type { CurrentEmployee } from "@/data/domains/profile";
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

function renderPanel(itemId = "item-1", me?: CurrentEmployee) {
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: createInMemoryCompaniesClient(),
				items: createInMemoryItemsClient({ seed: SEED_ITEMS }),
				folders: testFoldersClient(),
				procurementInquiries: createInMemoryProcurementInquiriesClient({ seed: TEST_INQUIRIES }),
				profile: createInMemoryProfileClient(me ? { me } : undefined),
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
	test("renders the item-drawer sections in order (Логистика removed; no per-item Ответы)", async () => {
		renderPanel();

		// Wait for the parent inquiry to load — Дополнительно gates on inquiry data.
		await waitFor(() => {
			expect(screen.getByText("Дополнительно")).toBeInTheDocument();
		});

		const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
		expect(headings).toEqual(["Основное", "Дополнительно", "Ваш поставщик"]);
		expect(screen.queryByText("Логистика")).not.toBeInTheDocument();
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

	test("shows edit buttons for the editable Основное and Ваш поставщик sections (with edit rights)", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		expect(screen.getByRole("button", { name: "Редактировать основную информацию" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Редактировать текущего поставщика" })).toBeInTheDocument();
		// Дополнительно stays read-only; clarifications moved off the item.
		expect(screen.queryByRole("button", { name: "Редактировать ответы на уточнения" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Редактировать дополнительно" })).not.toBeInTheDocument();
	});

	test("hides edit pens when the user lacks edit rights for the module", async () => {
		const viewOnly: CurrentEmployee = {
			id: 2,
			email: "viewer@example.ru",
			firstName: "В",
			lastName: "Зритель",
			patronymic: "",
			phone: "",
			position: "",
			avatarIcon: "blue",
			mailingAllowed: true,
			emailSignature: "",
			dateJoined: "2024-01-15T10:00:00Z",
			role: "user",
			isWorkspaceOwner: false,
			permissions: {
				id: "perm-2",
				employeeId: "2",
				procurementInquiries: "view",
				positions: "view",
				tasks: "view",
				workspaceSettings: "view",
				companies: "view",
				employees: "view",
				emails: "view",
			},
		};
		renderPanel("item-1", viewOnly);

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		expect(screen.queryByRole("button", { name: "Редактировать основную информацию" })).not.toBeInTheDocument();
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
