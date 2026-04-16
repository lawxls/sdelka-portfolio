import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { _resetCompaniesStore, _setCompanies } from "@/data/companies-mock-data";
import { _resetFoldersStore, _setFolders } from "@/data/folders-mock-data";
import type { Address, Company, NewItemInput } from "@/data/types";
import { createQueryWrapper, createTestQueryClient } from "@/test-utils";
import { AddPositionsDrawer } from "./add-positions-drawer";

vi.mock("sonner", async () => {
	const actual = await vi.importActual<typeof import("sonner")>("sonner");
	return {
		...actual,
		toast: Object.assign(actual.toast, {
			success: vi.fn(actual.toast.success),
		}),
	};
});

const TEST_ADDRESSES: Address[] = [
	{
		id: "addr-1",
		name: "Главный офис",
		type: "office",
		postalCode: "",
		address: "г. Москва, ул. Ленина, д. 15",
		contactPerson: "",
		phone: "",
		isMain: true,
	},
	{
		id: "addr-2",
		name: "Склад",
		type: "warehouse",
		postalCode: "",
		address: "г. Москва, ул. Складская, д. 1",
		contactPerson: "",
		phone: "",
		isMain: false,
	},
];

function makeCompanyDoc(id: string, name: string, addresses: Address[]): Company {
	return {
		id,
		name,
		industry: "",
		website: "",
		description: "",
		preferredPayment: "",
		preferredDelivery: "",
		additionalComments: "",
		isMain: false,
		employeeCount: 0,
		procurementItemCount: 0,
		addresses,
		employees: [],
	};
}

beforeEach(() => {
	_resetCompaniesStore();
	_setCompanies([makeCompanyDoc("company-1", "Тестовая компания", TEST_ADDRESSES)]);
	_resetFoldersStore();
	_setFolders([
		{ id: "folder-metal", name: "Металлопрокат", color: "blue" },
		{ id: "folder-build", name: "Стройматериалы", color: "green" },
	]);
	vi.mocked(toast.success).mockClear();
});

function renderDrawer(
	overrides: Partial<{
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onSubmit: (item: NewItemInput) => void;
	}> = {},
) {
	const props = {
		open: overrides.open ?? true,
		onOpenChange: overrides.onOpenChange ?? vi.fn(),
		onSubmit: overrides.onSubmit ?? vi.fn(),
	};
	return {
		...render(<AddPositionsDrawer {...props} />, { wrapper: createQueryWrapper(createTestQueryClient()) }),
		...props,
	};
}

async function pickCompany(user: ReturnType<typeof userEvent.setup>) {
	await user.click(await screen.findByLabelText("Компания"));
	await user.click(await screen.findByRole("option", { name: "Тестовая компания" }));
}

async function fillStep1Minimum(user: ReturnType<typeof userEvent.setup>, name = "Арматура") {
	await user.type(screen.getByPlaceholderText("Название *"), name);
	await pickCompany(user);
}

async function advance(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: "Далее" }));
}

async function create(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: "Создать" }));
}

describe("AddPositionsDrawer — wizard chrome", () => {
	test("renders singular title and step 1 headline", () => {
		renderDrawer();
		expect(screen.getByRole("heading", { name: "Добавить позицию" })).toBeInTheDocument();
		expect(screen.getByText(/Шаг 1 из 3/)).toBeInTheDocument();
	});

	test("does not render when closed", () => {
		renderDrawer({ open: false });
		expect(screen.queryByRole("heading", { name: "Добавить позицию" })).not.toBeInTheDocument();
	});

	test("progress bar exposes aria-valuenow for each step", async () => {
		renderDrawer();
		const user = userEvent.setup();

		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");

		await fillStep1Minimum(user);
		await advance(user);
		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "66");

		await advance(user);
		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
	});

	test("step 1 footer has Отмена + Далее only", () => {
		renderDrawer();
		expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Далее" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Назад" })).not.toBeInTheDocument();
	});

	test("step 2 footer has Отмена + Назад + Далее", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await fillStep1Minimum(user);
		await advance(user);

		expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Назад" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Далее" })).toBeInTheDocument();
	});

	test("step 3 footer has Отмена + Назад + Создать", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await fillStep1Minimum(user);
		await advance(user);
		await advance(user);

		expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Назад" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Создать" })).toBeInTheDocument();
	});

	test("Назад preserves step 1 state", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await user.type(screen.getByPlaceholderText("Название *"), "Арматура");
		await user.type(screen.getByPlaceholderText("Спецификация (Описание)"), "А500С");
		await pickCompany(user);
		await advance(user);
		await user.click(screen.getByRole("button", { name: "Назад" }));

		expect(screen.getByPlaceholderText("Название *")).toHaveValue("Арматура");
		expect(screen.getByPlaceholderText("Спецификация (Описание)")).toHaveValue("А500С");
	});
});

describe("AddPositionsDrawer — Step 1 validation", () => {
	test("Далее with empty name + no company shows both errors", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await advance(user);

		expect(screen.getByText("Выберите компанию")).toBeInTheDocument();
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();
		expect(screen.getByText(/Шаг 1 из 3/)).toBeInTheDocument();
	});

	test("Далее with only name filled shows company error", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await user.type(screen.getByPlaceholderText("Название *"), "Цемент");
		await advance(user);

		expect(screen.getByText("Выберите компанию")).toBeInTheDocument();
		expect(screen.queryByText("Укажите название позиции")).not.toBeInTheDocument();
	});

	test("typing in errored name clears error", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await advance(user);
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();

		await user.type(screen.getByPlaceholderText("Название *"), "A");
		expect(screen.queryByText("Укажите название позиции")).not.toBeInTheDocument();
	});

	test("required inputs advertise aria-required", () => {
		renderDrawer();
		expect(screen.getByPlaceholderText("Название *")).toHaveAttribute("aria-required", "true");
		expect(screen.getByLabelText("Компания")).toHaveAttribute("aria-required", "true");
	});

	test("failed advance keeps step at 1", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await advance(user);
		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
	});
});

describe("AddPositionsDrawer — Step 1 sections", () => {
	test("renders four section group headers", () => {
		renderDrawer();
		expect(screen.getByRole("heading", { name: "Позиция" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Логистика" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Финансы" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Дополнительно" })).toBeInTheDocument();
	});

	test("renders unit dropdown with all units", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await user.click(screen.getByLabelText("Единица измерения"));
		const options = await screen.findAllByRole("option");
		expect(options.length).toBeGreaterThanOrEqual(10);
	});

	test("address picker shows 'сначала выберите компанию' when no company selected", () => {
		renderDrawer();
		expect(screen.getByText("Сначала выберите компанию")).toBeInTheDocument();
	});

	test("selecting company pre-selects all its addresses", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await pickCompany(user);
		expect(screen.getByRole("button", { name: "Адреса доставки" })).toHaveTextContent("Выбрано: 2 из 2");
	});

	test("stoimost' dostavki appears only when paid or pickup selected", async () => {
		renderDrawer();
		const user = userEvent.setup();
		expect(screen.queryByLabelText("Стоимость доставки")).not.toBeInTheDocument();

		await user.click(screen.getByLabelText("Доставка"));
		await user.click(await screen.findByRole("option", { name: "Платная" }));
		expect(screen.getByLabelText("Стоимость доставки")).toBeInTheDocument();

		await user.click(screen.getByLabelText("Доставка"));
		await user.click(await screen.findByRole("option", { name: "Бесплатная" }));
		expect(screen.queryByLabelText("Стоимость доставки")).not.toBeInTheDocument();
	});

	test("checkboxes are visible and unchecked by default", () => {
		renderDrawer();
		expect(screen.getByRole("checkbox", { name: "Отсрочка нужна" })).not.toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Нужен образец" })).not.toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Аналоги допускаются" })).not.toBeChecked();
	});

	test("comment textarea and file dropzone render in Дополнительно", () => {
		renderDrawer();
		expect(screen.getByPlaceholderText("Введите комментарий…")).toBeInTheDocument();
		expect(screen.getByText(/Перетащите файлы сюда/)).toBeInTheDocument();
	});
});

describe("AddPositionsDrawer — FolderSelect integration", () => {
	test("FolderSelect renders folders", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Категория" }));
		expect(screen.getByRole("button", { name: /Металлопрокат/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Стройматериалы/ })).toBeInTheDocument();
	});

	test("inline create folder creates folder and selects it", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Категория" }));
		await user.click(screen.getByRole("button", { name: /Создать раздел/ }));

		const input = await screen.findByRole("textbox", { name: "Название раздела" });
		await user.type(input, "Канцелярия{Enter}");

		await screen.findByRole("button", { name: /Категория/ });
		// Trigger should now show the created folder name
		await screen.findByText("Канцелярия");
	});
});

describe("AddPositionsDrawer — discard confirmation", () => {
	test("Отмена on clean form closes immediately", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.queryByText("Закрыть без сохранения?")).not.toBeInTheDocument();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("Отмена on dirty form shows confirmation", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название *"), "Something");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
	});

	test("Продолжить dismisses dialog without losing data", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название *"), "My item");
		await user.click(screen.getByRole("button", { name: "Отмена" }));
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		expect(screen.queryByText("Закрыть без сохранения?")).not.toBeInTheDocument();
		expect(screen.getByPlaceholderText("Название *")).toHaveValue("My item");
	});

	test("Закрыть без сохранения closes and resets", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название *"), "Discard");
		await user.click(screen.getByRole("button", { name: "Отмена" }));
		await user.click(screen.getByRole("button", { name: "Закрыть без сохранения" }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("dirty detection fires on step 2/3 state too", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await fillStep1Minimum(user);
		await advance(user);
		await advance(user);
		await user.click(screen.getByRole("button", { name: "Назад" }));
		await user.click(screen.getByRole("button", { name: "Назад" }));
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		// Step 1 has name + company → dirty regardless
		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
	});
});

describe("AddPositionsDrawer — submit", () => {
	test("completing wizard with minimal data emits single NewItemInput", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await fillStep1Minimum(user, "Арматура А500С");
		await advance(user);
		await advance(user);
		await create(user);

		expect(onSubmit).toHaveBeenCalledTimes(1);
		const [payload] = onSubmit.mock.calls[0];
		expect(payload).toMatchObject({
			name: "Арматура А500С",
			paymentType: "prepayment",
			paymentMethod: "bank_transfer",
		});
		expect(payload.deliveryAddresses).toEqual(["г. Москва, ул. Ленина, д. 15", "г. Москва, ул. Складская, д. 1"]);
	});

	test("submit fires toast.success and closes drawer", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await fillStep1Minimum(user);
		await advance(user);
		await advance(user);
		await create(user);

		expect(toast.success).toHaveBeenCalledWith("Позиция создана");
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("submit with full step 1 payload captures all Step 1 fields", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getByPlaceholderText("Название *"), "Цемент М500");
		await user.type(screen.getByPlaceholderText("Спецификация (Описание)"), "Портландцемент");
		await pickCompany(user);

		await user.click(screen.getByLabelText("Единица измерения"));
		await user.click(await screen.findByRole("option", { name: "т" }));

		await user.type(screen.getByPlaceholderText("Объём в год"), "600");
		await user.type(screen.getByPlaceholderText("Кол-во в поставке"), "50");

		await user.click(screen.getByRole("button", { name: "Силами поставщика" }));
		await user.click(screen.getByRole("button", { name: "Наличные" }));

		await user.click(screen.getByRole("checkbox", { name: "Отсрочка нужна" }));
		await user.click(screen.getByRole("checkbox", { name: "Нужен образец" }));
		await user.click(screen.getByRole("checkbox", { name: "Аналоги допускаются" }));

		await user.type(screen.getByPlaceholderText("Введите комментарий…"), "Срочно");

		await advance(user);
		await advance(user);
		await create(user);

		const [payload] = onSubmit.mock.calls[0];
		expect(payload).toMatchObject({
			name: "Цемент М500",
			description: "Портландцемент",
			unit: "т",
			annualQuantity: 600,
			quantityPerDelivery: 50,
			unloading: "supplier",
			paymentMethod: "cash",
			paymentType: "deferred",
			sampleRequired: true,
			analoguesAllowed: true,
			additionalInfo: "Срочно",
		});
	});

	test("step 2/3 placeholders do not contribute to payload on skip", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await fillStep1Minimum(user);
		await advance(user);
		await advance(user);
		await create(user);

		const [payload] = onSubmit.mock.calls[0];
		expect(payload.currentSupplier).toBeUndefined();
		expect(payload.generatedAnswers).toBeUndefined();
	});

	test("form resets after submit — reopening returns to step 1 empty", async () => {
		const { rerender } = renderDrawer({ open: true });
		const user = userEvent.setup();

		await fillStep1Minimum(user, "First");
		await advance(user);
		await advance(user);
		await create(user);

		rerender(<AddPositionsDrawer open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);

		expect(screen.getByPlaceholderText("Название *")).toHaveValue("");
	});
});
