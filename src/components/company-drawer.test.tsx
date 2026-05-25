import type { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CompaniesClient } from "@/data/clients/companies-client";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { createInMemoryWorkspaceEmployeesClient } from "@/data/clients/workspace-employees-in-memory";
import { TestClientsProvider } from "@/data/test-clients-provider";
import type { Company } from "@/data/types";
import { createTestQueryClient, mockHostname } from "@/test-utils";
import { CompanyDrawer } from "./company-drawer";

function makeStored(id: string, overrides: Partial<Company> = {}): Company {
	return {
		id,
		name: `Company ${id}`,
		shortName: "",
		inn: `770000000${id.replace(/\D/g, "") || "0"}`.slice(-10),
		kpp: "",
		ogrn: "",
		directorName: "",
		website: "",
		additionalComments: "",
		isMain: false,
		employeeCount: 0,
		procurementItemCount: 0,
		addressesCount: 1,
		createdAt: "2026-04-01T00:00:00+03:00",
		updatedAt: "2026-04-01T00:00:00+03:00",
		addresses: [{ id: `addr-${id}`, name: "Офис", address: "г. Москва", phone: "", isMain: true }],
		...overrides,
	};
}

let queryClient: QueryClient;
let companiesClient: CompaniesClient;

function renderDrawer() {
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: companiesClient,
				workspaceEmployees: createInMemoryWorkspaceEmployeesClient({ seed: [] }),
			}}
		>
			<TooltipProvider>
				<CompanyDrawer companyId="c1" activeTab="general" onClose={() => {}} onTabChange={() => {}} />
			</TooltipProvider>
		</TestClientsProvider>,
	);
}

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	sessionStorage.setItem("auth-access-token", "test-token");
	companiesClient = createInMemoryCompaniesClient([makeStored("c1", { name: "Сделка", website: "sdelka.ru" })]);
});

afterEach(() => {
	localStorage.clear();
});

describe("CompanyDrawer — Основная информация", () => {
	test("Save calls client.update with the patched fields and exits edit mode", async () => {
		const updateSpy = vi.spyOn(companiesClient, "update");
		renderDrawer();
		const user = userEvent.setup();

		await waitFor(() => expect(screen.getByTestId("drawer-title")).toHaveTextContent("Сделка"));

		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

		const nameInput = screen.getByLabelText("Наименование");
		await user.clear(nameInput);
		await user.type(nameInput, "Сделка 2");

		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(updateSpy).toHaveBeenCalledWith("c1", { name: "Сделка 2" });
		});

		await waitFor(() => {
			expect(screen.queryByLabelText("Наименование")).not.toBeInTheDocument();
		});

		const updated = await companiesClient.get("c1");
		expect(updated.name).toBe("Сделка 2");
		expect(updated.website).toBe("sdelka.ru");
	});

	test("Save is disabled when no fields have been edited", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await waitFor(() => expect(screen.getByTestId("drawer-title")).toHaveTextContent("Сделка"));
		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

		expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
	});

	test("Отмена closes the form without firing the mutation", async () => {
		const updateSpy = vi.spyOn(companiesClient, "update");
		renderDrawer();
		const user = userEvent.setup();

		await waitFor(() => expect(screen.getByTestId("drawer-title")).toHaveTextContent("Сделка"));
		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

		const nameInput = screen.getByLabelText("Наименование");
		await user.clear(nameInput);
		await user.type(nameInput, "Зачёркнуто");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(updateSpy).not.toHaveBeenCalled();
		expect(screen.queryByLabelText("Наименование")).not.toBeInTheDocument();
	});

	test("renders read-only Реквизиты with INN/КПП/ОГРН/директор and no edit button", async () => {
		companiesClient = createInMemoryCompaniesClient([
			makeStored("c1", {
				name: "Сделка",
				inn: "7707083893",
				kpp: "773601001",
				ogrn: "1027700132195",
				directorName: "Греф Г.О.",
				shortName: "ПАО СБЕРБАНК",
			}),
		]);
		renderDrawer();
		await waitFor(() => expect(screen.getByTestId("drawer-title")).toHaveTextContent("Сделка"));

		// Identity fields are visible inside the "Реквизиты" section.
		expect(screen.getByText("7707083893")).toBeInTheDocument();
		expect(screen.getByText("773601001")).toBeInTheDocument();
		expect(screen.getByText("1027700132195")).toBeInTheDocument();
		expect(screen.getByText("Греф Г.О.")).toBeInTheDocument();

		// No edit affordance — the DaData section is intentionally locked.
		expect(screen.queryByRole("button", { name: /Редактировать реквизиты/ })).not.toBeInTheDocument();
	});

	test("Карточка компании section is gone", async () => {
		renderDrawer();
		await waitFor(() => expect(screen.getByTestId("drawer-title")).toHaveTextContent("Сделка"));
		expect(screen.queryByText("Карточка компании")).not.toBeInTheDocument();
		expect(screen.queryByTestId("company-card-current")).not.toBeInTheDocument();
	});

	test("Редактировать основную информацию edits name + website only — no INN field", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await waitFor(() => expect(screen.getByTestId("drawer-title")).toHaveTextContent("Сделка"));
		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));
		expect(screen.getByLabelText("Наименование")).toBeInTheDocument();
		expect(screen.getByLabelText("Сайт")).toBeInTheDocument();
		expect(screen.queryByLabelText("ИНН")).not.toBeInTheDocument();
	});
});
