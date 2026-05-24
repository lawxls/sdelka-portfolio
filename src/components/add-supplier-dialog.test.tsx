import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import type { CompaniesClient } from "@/data/clients/companies-client";
import type { CompanyLookup } from "@/data/domains/companies";
import { fakeCompaniesClient, TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient } from "@/test-utils";
import { AddSupplierDialog, type AddSupplierDraft } from "./add-supplier-dialog";

function renderDialog(onSave: (draft: AddSupplierDraft) => void, lookupByInn?: CompaniesClient["lookupByInn"]) {
	const queryClient = createTestQueryClient();
	const client = fakeCompaniesClient({ lookupByInn: lookupByInn ?? (async () => null) });
	const wrapper = ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ companies: client }}>
			{children}
		</TestClientsProvider>
	);
	return render(<AddSupplierDialog open onOpenChange={() => {}} onSave={onSave} />, { wrapper });
}

function makeLookup(overrides: Partial<CompanyLookup> = {}): CompanyLookup {
	return {
		inn: "7703123456",
		shortName: "ООО «Ромашка»",
		fullName: "ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ «РОМАШКА»",
		kpp: "770301001",
		ogrn: "1027700000001",
		directorName: "Иванов И.И.",
		address: "г Москва, ул Ленина, д 1",
		status: "ACTIVE",
		existing: null,
		...overrides,
	};
}

describe("AddSupplierDialog", () => {
	test("renders title and INN mode by default", () => {
		renderDialog(() => {});
		expect(screen.getByRole("dialog", { name: "Добавить поставщика" })).toBeInTheDocument();
		expect(screen.getByLabelText(/ИНН/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "По ИНН" })).toHaveAttribute("aria-pressed", "true");
	});

	test("switching to manual mode reveals name/website/email fields and hides INN", async () => {
		const user = userEvent.setup();
		renderDialog(() => {});
		await user.click(screen.getByRole("button", { name: "Вручную" }));
		expect(screen.queryByLabelText(/ИНН/)).not.toBeInTheDocument();
		expect(screen.getByLabelText(/Название/)).toBeInTheDocument();
		expect(screen.getByLabelText(/Сайт/)).toBeInTheDocument();
		expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
	});

	test("saves manual entry with trimmed values", async () => {
		const onSave = vi.fn();
		const user = userEvent.setup();
		renderDialog(onSave);
		await user.click(screen.getByRole("button", { name: "Вручную" }));
		await user.type(screen.getByLabelText(/Название/), "  ООО «Ромашка»  ");
		await user.type(screen.getByLabelText(/Сайт/), "romashka.ru");
		await user.type(screen.getByLabelText(/Email/), "info@romashka.ru");
		await user.click(screen.getByRole("button", { name: /Сохранить/ }));
		expect(onSave).toHaveBeenCalledWith({
			inn: "",
			companyName: "ООО «Ромашка»",
			website: "romashka.ru",
			email: "info@romashka.ru",
		});
	});

	test("manual mode shows name error when empty", async () => {
		const onSave = vi.fn();
		const user = userEvent.setup();
		renderDialog(onSave);
		await user.click(screen.getByRole("button", { name: "Вручную" }));
		await user.click(screen.getByRole("button", { name: /Сохранить/ }));
		expect(screen.getByText("Укажите название компании")).toBeInTheDocument();
		expect(onSave).not.toHaveBeenCalled();
	});

	test("INN mode saves matched name + user-typed website/email when lookup succeeds", async () => {
		const onSave = vi.fn();
		const user = userEvent.setup();
		const lookupByInn = vi.fn(async () => makeLookup());
		renderDialog(onSave, lookupByInn);

		await user.type(screen.getByLabelText(/ИНН/), "7703123456");
		// Name + address are surfaced as readonly inputs prefilled from DaData;
		// website + email start disabled and become editable once a match lands.
		await waitFor(() => expect(screen.getByLabelText("Название")).toHaveValue("ООО «Ромашка»"));
		expect(screen.getByLabelText("Адрес")).toHaveValue("г Москва, ул Ленина, д 1");

		await user.type(screen.getByLabelText("Сайт"), "https://romashka.ru");
		await user.type(screen.getByLabelText("Email"), "info@romashka.ru");
		await user.click(screen.getByRole("button", { name: /Сохранить/ }));

		expect(onSave).toHaveBeenCalledWith({
			inn: "7703123456",
			companyName: "ООО «Ромашка»",
			website: "https://romashka.ru",
			email: "info@romashka.ru",
		});
	});

	test("INN mode keeps Сайт/Email disabled until lookup matches", async () => {
		const user = userEvent.setup();
		renderDialog(() => {});
		expect(screen.getByLabelText("Сайт")).toBeDisabled();
		expect(screen.getByLabelText("Email")).toBeDisabled();
		expect(screen.getByLabelText("Название")).toBeDisabled();
		expect(screen.getByLabelText("Адрес")).toBeDisabled();
		// Partial INN keeps everything disabled.
		await user.type(screen.getByLabelText(/ИНН/), "770");
		expect(screen.getByLabelText("Сайт")).toBeDisabled();
	});

	test("INN mode shows hint to switch to manual when lookup misses", async () => {
		const user = userEvent.setup();
		renderDialog(
			() => {},
			async () => null,
		);
		await user.type(screen.getByLabelText(/ИНН/), "0000000000");
		await waitFor(() => expect(screen.getByText(/Поставщик не/)).toBeInTheDocument());
	});

	test("INN mode rejects save when INN is too short", async () => {
		const onSave = vi.fn();
		const user = userEvent.setup();
		renderDialog(onSave);
		await user.type(screen.getByLabelText(/ИНН/), "770");
		await user.click(screen.getByRole("button", { name: /Сохранить/ }));
		expect(screen.getByText(/ИНН должен состоять/)).toBeInTheDocument();
		expect(onSave).not.toHaveBeenCalled();
	});

	test("manual mode requires email", async () => {
		const onSave = vi.fn();
		const user = userEvent.setup();
		renderDialog(onSave);
		await user.click(screen.getByRole("button", { name: "Вручную" }));
		await user.type(screen.getByLabelText(/Название/), "ООО «Ромашка»");
		await user.click(screen.getByRole("button", { name: /Сохранить/ }));
		expect(screen.getByText("Укажите email")).toBeInTheDocument();
		expect(onSave).not.toHaveBeenCalled();
	});

	test("INN mode requires email after match", async () => {
		const onSave = vi.fn();
		const user = userEvent.setup();
		renderDialog(onSave, async () => makeLookup());

		await user.type(screen.getByLabelText(/ИНН/), "7703123456");
		await waitFor(() => expect(screen.getByLabelText("Название")).toHaveValue("ООО «Ромашка»"));
		await user.click(screen.getByRole("button", { name: /Сохранить/ }));
		expect(screen.getByText("Укажите email")).toBeInTheDocument();
		expect(onSave).not.toHaveBeenCalled();
	});
});
