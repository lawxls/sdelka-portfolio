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
	test("renders read-only sections with item values", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основная информация")).toBeInTheDocument();
		});

		// Values displayed as text
		expect(screen.getByText("Полотно ПВД 2600 мм")).toBeInTheDocument();
		expect(screen.getByText("180000")).toBeInTheDocument();

		// Edit buttons for all editable sections
		expect(screen.getByRole("button", { name: "Редактировать основную информацию" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Редактировать условия" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Редактировать параметры запроса" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Редактировать дополнительно" })).toBeInTheDocument();

		// No save button in read-only mode
		expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
	});

	test("shows all four sections", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основная информация")).toBeInTheDocument();
		});

		expect(screen.getByText("Условия")).toBeInTheDocument();
		expect(screen.getByText("Параметры запроса")).toBeInTheDocument();
		expect(screen.getByText("Дополнительно")).toBeInTheDocument();

		const editButtons = screen.getAllByRole("button", { name: /Редактировать/ });
		expect(editButtons).toHaveLength(4);
	});

	test("shows loading skeleton while fetching", () => {
		_setItemDetailMockDelay(10000, 10000);
		renderPanel();
		expect(screen.getByTestId("details-loading")).toBeInTheDocument();
	});

	test("shows error state for unknown item ID", async () => {
		renderPanel("nonexistent-item");
		await waitFor(() => {
			expect(screen.getByTestId("details-error")).toBeInTheDocument();
		});
		expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument();
	});

	test("clicking edit info shows form fields", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основная информация")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

		expect(screen.getByLabelText("Название")).toHaveValue("Полотно ПВД 2600 мм");
		expect(screen.getByLabelText("Количество")).toHaveValue(180000);
		expect(screen.getByLabelText("Текущая цена")).toHaveValue(1776);
		expect(screen.getByLabelText("Единица измерения")).toHaveTextContent("м");
		expect(screen.getByRole("button", { name: "Сохранить" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
	});

	test("clicking edit conditions shows segmented controls", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Условия")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать условия" }));

		// item-1 has paymentType: "prepayment", unloading: "supplier"
		expect(screen.getByRole("button", { name: "Предоплата" })).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByRole("button", { name: "Силами поставщика" })).toHaveAttribute("aria-pressed", "true");
	});

	test("save info section triggers mutation with changed values", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основная информация")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

		const nameInput = screen.getByLabelText("Название");
		await user.clear(nameInput);
		await user.type(nameInput, "Новое название");

		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		// After save, returns to read-only with updated value
		await waitFor(() => {
			expect(screen.getByText("Новое название")).toBeInTheDocument();
		});
		expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
	});

	test("cancel reverts to read-only view", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основная информация")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));
		expect(screen.getByLabelText("Название")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.queryByLabelText("Название")).not.toBeInTheDocument();
		expect(screen.getByText("Полотно ПВД 2600 мм")).toBeInTheDocument();
	});

	test("save button shows loading state during request", async () => {
		const user = userEvent.setup();
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Основная информация")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

		_setItemDetailMockDelay(5000, 5000);

		const nameInput = screen.getByLabelText("Название");
		await user.clear(nameInput);
		await user.type(nameInput, "X");

		const saveButton = screen.getByRole("button", { name: "Сохранить" });
		await user.click(saveButton);

		expect(saveButton).toBeDisabled();
	});

	test("conditions section shows unloading responsibility", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Условия")).toBeInTheDocument();
		});

		expect(screen.getByText("Силами поставщика")).toBeInTheDocument();
	});

	test("request params section shows analogues and sample toggles", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Параметры запроса")).toBeInTheDocument();
		});

		// item-1 has analoguesAllowed: true, sampleRequired: undefined
		expect(screen.getByText("Допускаются аналоги")).toBeInTheDocument();
		expect(screen.getByText("Нужен образец")).toBeInTheDocument();
	});

	test("additional section shows comment", async () => {
		renderPanel();

		await waitFor(() => {
			expect(screen.getByText("Дополнительно")).toBeInTheDocument();
		});

		expect(screen.getByText("Полотно ПВД первичка (без вторсырья), ширина 2600 мм, прозрачное.")).toBeInTheDocument();
	});
});
