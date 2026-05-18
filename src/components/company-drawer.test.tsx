import type { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CompaniesClient } from "@/data/clients/companies-client";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { createInMemoryEmployeesClient } from "@/data/clients/employees-in-memory";
import { TestClientsProvider } from "@/data/test-clients-provider";
import type { Company } from "@/data/types";
import { createTestQueryClient, mockHostname } from "@/test-utils";
import { CompanyDrawer } from "./company-drawer";

function makeStored(id: string, overrides: Partial<Company> = {}): Company {
	return {
		id,
		name: `Company ${id}`,
		website: "",
		description: "",
		additionalComments: "",
		isMain: false,
		cardFile: null,
		cardFileName: "",
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
			clients={{ companies: companiesClient, employees: createInMemoryEmployeesClient() }}
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
	companiesClient = createInMemoryCompaniesClient([
		makeStored("c1", { name: "Сделка", website: "sdelka.ru", description: "Старое" }),
	]);
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

		const nameInput = screen.getByLabelText("Название");
		await user.clear(nameInput);
		await user.type(nameInput, "Сделка 2");

		const descTextarea = screen.getByLabelText("Описание");
		await user.clear(descTextarea);
		await user.type(descTextarea, "Новое описание");

		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(updateSpy).toHaveBeenCalledWith("c1", { name: "Сделка 2", description: "Новое описание" });
		});

		await waitFor(() => {
			expect(screen.queryByLabelText("Название")).not.toBeInTheDocument();
		});

		const updated = await companiesClient.get("c1");
		expect(updated.name).toBe("Сделка 2");
		expect(updated.description).toBe("Новое описание");
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

		const nameInput = screen.getByLabelText("Название");
		await user.clear(nameInput);
		await user.type(nameInput, "Зачёркнуто");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(updateSpy).not.toHaveBeenCalled();
		expect(screen.queryByLabelText("Название")).not.toBeInTheDocument();
	});
});
