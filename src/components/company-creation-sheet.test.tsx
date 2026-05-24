import type { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CompanyCreationSheet } from "@/components/company-creation-sheet";
import type { CompaniesClient } from "@/data/clients/companies-client";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import type { Company, CreateCompanyPayload } from "@/data/domains/companies";
import { _setMockDelay } from "@/data/mock-utils";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient } from "@/test-utils";

function makeSeed(id: string, name: string, inn: string): Company {
	return {
		id,
		name,
		shortName: name,
		inn,
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
		addresses: [{ id: `addr-${id}`, name: "HQ", address: "г. Москва", phone: "", isMain: true }],
	};
}

let queryClient: QueryClient;
let companiesClient: CompaniesClient;
let onSubmit: ReturnType<typeof vi.fn<(data: CreateCompanyPayload) => void>>;

function renderSheet(seed: Company[] = []) {
	companiesClient = createInMemoryCompaniesClient(seed);
	onSubmit = vi.fn<(data: CreateCompanyPayload) => void>();
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ companies: companiesClient }}>
			<CompanyCreationSheet open onOpenChange={() => {}} onSubmit={onSubmit} isPending={false} />
		</TestClientsProvider>,
	);
}

beforeEach(() => {
	queryClient = createTestQueryClient();
	// Zero-delay lookups keep state-machine assertions tight.
	_setMockDelay(0, 0);
});

describe("CompanyCreationSheet", () => {
	test("renders the empty identity card before INN is filled", () => {
		renderSheet();
		expect(screen.getByTestId("lookup-empty")).toBeInTheDocument();
		expect(screen.getByText(/Данные подставятся автоматически/)).toBeInTheDocument();
	});

	test("submit button is disabled while no match", () => {
		renderSheet();
		const submit = screen.getByRole("button", { name: /Создать компанию/ });
		expect(submit).toBeDisabled();
	});

	test("typing a valid INN renders the matched card with DaData identity", async () => {
		renderSheet();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("ИНН"), "7700001234");

		const matched = await screen.findByTestId("lookup-matched");
		expect(matched).toBeInTheDocument();
		// Synthetic identity from the in-memory adapter — covers shortName, ogrn, director.
		expect(screen.getByRole("heading", { name: /Тест-1234/ })).toBeInTheDocument();
		expect(screen.getByText("Иванов Иван Иванович")).toBeInTheDocument();
	});

	test("revealed comments + legal address card after match", async () => {
		renderSheet();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("ИНН"), "7700001234");
		await screen.findByTestId("lookup-matched");

		expect(screen.getByLabelText("Дополнительные комментарии для агента")).toBeInTheDocument();
		// First address row is the legal-address card, name pre-filled and editable.
		const addrRow = screen.getByTestId("address-row-0");
		expect(addrRow).toHaveTextContent("Юридический адрес");
	});

	test("renders the miss state for the reserved unresolvable INN", async () => {
		renderSheet();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("ИНН"), "0000000000");

		expect(await screen.findByTestId("lookup-miss")).toBeInTheDocument();
		expect(screen.queryByLabelText("Дополнительные комментарии для агента")).not.toBeInTheDocument();
	});

	test("renders the duplicate notice when the INN already belongs to a workspace company", async () => {
		renderSheet([makeSeed("c1", "Существующая", "7707083893")]);
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("ИНН"), "7707083893");

		const dup = await screen.findByTestId("lookup-duplicate");
		expect(dup).toHaveTextContent("Существующая");
		expect(screen.queryByLabelText("Дополнительные комментарии для агента")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Создать компанию/ })).toBeDisabled();
	});

	test("renders the error state for the reserved upstream-down INN", async () => {
		renderSheet();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("ИНН"), "9999999999");

		expect(await screen.findByTestId("lookup-error")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Повторить/ })).toBeInTheDocument();
	});

	test("submit fires onSubmit with the DaData identity + legal address", async () => {
		renderSheet();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("ИНН"), "7700001234");
		await screen.findByTestId("lookup-matched");

		await user.click(screen.getByRole("button", { name: /Создать компанию/ }));

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
		const payload = onSubmit.mock.calls[0][0] as CreateCompanyPayload;
		expect(payload.inn).toBe("7700001234");
		expect(payload.shortName).toContain("Тест-1234");
		expect(payload.directorName).toBe("Иванов Иван Иванович");
		// Website is a user-editable field outside the auto-fill block;
		// empty by default until the user types one in.
		expect(payload.website).toBe("");
		// One address: the prefilled legal-address card marked main.
		expect(payload.addresses).toHaveLength(1);
		expect(payload.addresses[0]).toMatchObject({
			name: "Юридический адрес",
			isMain: true,
		});
	});

	test("Сайт is not in the identity card and threads through submit when filled", async () => {
		renderSheet();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("ИНН"), "7700001234");
		const matched = await screen.findByTestId("lookup-matched");
		// Сайт row was removed from the auto-fill block — only the four
		// DaData-sourced fields remain.
		expect(matched).not.toHaveTextContent("Сайт");

		await user.type(screen.getByLabelText("Сайт"), "example.ru");
		await user.click(screen.getByRole("button", { name: /Создать компанию/ }));

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
		expect((onSubmit.mock.calls[0][0] as CreateCompanyPayload).website).toBe("example.ru");
	});

	test("submit is blocked when the legal address has been cleared and no other address is given", async () => {
		renderSheet();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("ИНН"), "7700001234");
		await screen.findByTestId("lookup-matched");

		const addressInput = screen.getByLabelText("Адрес");
		await user.clear(addressInput);
		await user.click(screen.getByRole("button", { name: /Создать компанию/ }));

		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByRole("alert")).toHaveTextContent(/Укажите хотя/);
	});
});
