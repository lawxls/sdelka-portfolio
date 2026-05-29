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

function makeLookup(): CompanyLookup {
	return {
		inn: "7703123456",
		shortName: "ООО «Ромашка»",
		fullName: "ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ «РОМАШКА»",
		kpp: "770301001",
		ogrn: "1027700000001",
		directorName: "Иванов И.И.",
		phoneNumber: "",
		email: "",
		address: "г Москва, ул Ленина, д 1",
		status: "ACTIVE",
		existing: null,
	};
}

describe("AddSupplierDialog", () => {
	test("renders title and INN-only form", () => {
		renderDialog(() => {});
		expect(screen.getByRole("dialog", { name: "Добавить поставщика" })).toBeInTheDocument();
		expect(screen.getByLabelText(/ИНН/)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "По ИНН" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Вручную" })).not.toBeInTheDocument();
	});

	test("saves matched name + user-typed website/email when lookup succeeds", async () => {
		const onSave = vi.fn();
		const user = userEvent.setup();
		renderDialog(onSave, async () => makeLookup());

		await user.type(screen.getByLabelText(/ИНН/), "7703123456");
		await waitFor(() => expect(screen.getByLabelText("Название")).toHaveValue("ООО «Ромашка»"));
		expect(screen.getByLabelText("Адрес")).toHaveValue("г Москва, ул Ленина, д 1");

		await user.type(screen.getByLabelText(/Сайт/), "https://romashka.ru");
		await user.type(screen.getByLabelText(/Email/), "info@romashka.ru");
		await user.click(screen.getByRole("button", { name: /Сохранить/ }));

		expect(onSave).toHaveBeenCalledWith({
			inn: "7703123456",
			companyName: "ООО «Ромашка»",
			website: "https://romashka.ru",
			email: "info@romashka.ru",
		});
	});

	test("keeps Сайт/Email/Название/Адрес disabled until lookup matches", async () => {
		const user = userEvent.setup();
		renderDialog(() => {});
		expect(screen.getByLabelText(/Сайт/)).toBeDisabled();
		expect(screen.getByLabelText(/Email/)).toBeDisabled();
		expect(screen.getByLabelText("Название")).toBeDisabled();
		expect(screen.getByLabelText("Адрес")).toBeDisabled();
		// Partial INN keeps everything disabled.
		await user.type(screen.getByLabelText(/ИНН/), "770");
		expect(screen.getByLabelText(/Сайт/)).toBeDisabled();
	});

	test("shows miss hint when lookup returns no match", async () => {
		const user = userEvent.setup();
		renderDialog(
			() => {},
			async () => null,
		);
		await user.type(screen.getByLabelText(/ИНН/), "0000000000");
		await waitFor(() => expect(screen.getByText(/Поставщик не/)).toBeInTheDocument());
	});

	test("rejects save when INN is too short", async () => {
		const onSave = vi.fn();
		const user = userEvent.setup();
		renderDialog(onSave);
		await user.type(screen.getByLabelText(/ИНН/), "770");
		await user.click(screen.getByRole("button", { name: /Сохранить/ }));
		expect(screen.getByText(/ИНН должен состоять/)).toBeInTheDocument();
		expect(onSave).not.toHaveBeenCalled();
	});

	test("requires Сайт after match", async () => {
		const onSave = vi.fn();
		const user = userEvent.setup();
		renderDialog(onSave, async () => makeLookup());

		await user.type(screen.getByLabelText(/ИНН/), "7703123456");
		await waitFor(() => expect(screen.getByLabelText("Название")).toHaveValue("ООО «Ромашка»"));
		await user.type(screen.getByLabelText(/Email/), "info@romashka.ru");
		await user.click(screen.getByRole("button", { name: /Сохранить/ }));
		expect(screen.getByText("Укажите сайт")).toBeInTheDocument();
		expect(onSave).not.toHaveBeenCalled();
	});

	test("requires Email after match", async () => {
		const onSave = vi.fn();
		const user = userEvent.setup();
		renderDialog(onSave, async () => makeLookup());

		await user.type(screen.getByLabelText(/ИНН/), "7703123456");
		await waitFor(() => expect(screen.getByLabelText("Название")).toHaveValue("ООО «Ромашка»"));
		await user.type(screen.getByLabelText(/Сайт/), "romashka.ru");
		await user.click(screen.getByRole("button", { name: /Сохранить/ }));
		expect(screen.getByText("Укажите email")).toBeInTheDocument();
		expect(onSave).not.toHaveBeenCalled();
	});
});
