import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { _resetItemDetailStore, _setItemDetailMockDelay } from "@/data/item-detail-mock-data";

import { DetailsTabPanel } from "./details-tab-panel";

let queryClient: QueryClient;

function renderPanel(itemId = "item-1") {
	return render(
		<QueryClientProvider client={queryClient}>
			<DetailsTabPanel itemId={itemId} />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	_resetItemDetailStore();
	_setItemDetailMockDelay(0, 0);
});

afterEach(() => {
	_resetItemDetailStore();
});

describe("DetailsTabPanel", () => {
	test("renders editable fields with current item values", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByLabelText("Название")).toHaveValue("Арматура А500С");
		});

		expect(screen.getByLabelText("Годовой объём")).toHaveValue(1200);
		expect(screen.getByLabelText("Текущая цена")).toHaveValue(4500);
	});

	test("renders read-only fields that are not editable", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByLabelText("Название")).toBeInTheDocument();
		});

		const statusField = screen.getByLabelText("Статус");
		expect(statusField).toHaveAttribute("readonly");

		const bestPriceField = screen.getByLabelText("Лучшая цена");
		expect(bestPriceField).toHaveAttribute("readonly");

		const avgPriceField = screen.getByLabelText("Средняя цена");
		expect(avgPriceField).toHaveAttribute("readonly");
	});

	test("shows loading skeleton while fetching", () => {
		_setItemDetailMockDelay(10000, 10000);
		renderPanel();
		expect(screen.getByTestId("details-loading")).toBeInTheDocument();
	});

	test("unit select shows current value", async () => {
		renderPanel();
		await waitFor(() => {
			expect(screen.getByLabelText("Название")).toHaveValue("Арматура А500С");
		});
		// Unit trigger should show the current unit
		expect(screen.getByLabelText("Единица измерения")).toHaveTextContent("т");
	});

	test("payment type shows current value", async () => {
		renderPanel();
		await waitFor(() => {
			expect(screen.getByLabelText("Название")).toHaveValue("Арматура А500С");
		});
		// item-1 has paymentType: "deferred"
		const deferredButton = screen.getByRole("button", { name: "Отсрочка" });
		expect(deferredButton).toHaveAttribute("aria-pressed", "true");
	});

	test("delivery type shows current value", async () => {
		renderPanel();
		await waitFor(() => {
			expect(screen.getByLabelText("Название")).toHaveValue("Арматура А500С");
		});
		// item-1 has deliveryType: "warehouse"
		const warehouseButton = screen.getByRole("button", { name: "До склада" });
		expect(warehouseButton).toHaveAttribute("aria-pressed", "true");
	});

	test("save button triggers mutation with changed values", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByLabelText("Название")).toHaveValue("Арматура А500С");
		});

		// Edit the name
		const nameInput = screen.getByLabelText("Название");
		await user.clear(nameInput);
		await user.type(nameInput, "Новое название");

		// Click save
		const saveButton = screen.getByRole("button", { name: "Сохранить" });
		await user.click(saveButton);

		// After mutation succeeds, the value should persist
		await waitFor(() => {
			expect(screen.getByLabelText("Название")).toHaveValue("Новое название");
		});
	});

	test("save button shows loading state during request", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByLabelText("Название")).toHaveValue("Арматура А500С");
		});

		// Set a delay so mutation takes time
		_setItemDetailMockDelay(5000, 5000);

		const nameInput = screen.getByLabelText("Название");
		await user.clear(nameInput);
		await user.type(nameInput, "X");

		const saveButton = screen.getByRole("button", { name: "Сохранить" });
		await user.click(saveButton);

		// Button should be disabled during save
		expect(saveButton).toBeDisabled();
	});

	test("frequency count shows current value", async () => {
		renderPanel();
		await waitFor(() => {
			expect(screen.getByLabelText("Название")).toHaveValue("Арматура А500С");
		});
		// item-1 has frequencyCount: 2
		expect(screen.getByLabelText("Частота поставок")).toHaveValue(2);
	});
});
