import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import type { SuppliersClient } from "@/data/clients/suppliers-client";
import { fakeSuppliersClient, TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient } from "@/test-utils";
import { AddSupplierDialog, type AddSupplierDraft } from "./add-supplier-dialog";

function renderDialog(onSave: (draft: AddSupplierDraft) => void, identityByInn?: SuppliersClient["identityByInn"]) {
	const queryClient = createTestQueryClient();
	const client = fakeSuppliersClient({ identityByInn: identityByInn ?? (async () => null) });
	const wrapper = ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ suppliers: client }}>
			{children}
		</TestClientsProvider>
	);
	return render(<AddSupplierDialog open onOpenChange={() => {}} onSave={onSave} />, { wrapper });
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

	test("INN mode saves matched identity when lookup succeeds", async () => {
		const onSave = vi.fn();
		const user = userEvent.setup();
		const identityByInn = async () => ({
			companyName: "ООО «Ромашка»",
			website: "https://romashka.ru",
			address: "Москва",
			email: "info@romashka.ru",
		});
		renderDialog(onSave, identityByInn);
		await user.type(screen.getByLabelText(/ИНН/), "7703123456");
		await waitFor(() => expect(screen.getByText("ООО «Ромашка»")).toBeInTheDocument());
		await user.click(screen.getByRole("button", { name: /Сохранить/ }));
		expect(onSave).toHaveBeenCalledWith({
			inn: "7703123456",
			companyName: "ООО «Ромашка»",
			website: "https://romashka.ru",
			email: "info@romashka.ru",
		});
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
});
