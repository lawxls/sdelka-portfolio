import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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
	{ id: "addr-1", name: "Главный офис", address: "г. Москва, ул. Ленина, д. 15", phone: "", isMain: true },
	{ id: "addr-2", name: "Склад", address: "г. Москва, ул. Складская, д. 1", phone: "", isMain: false },
];

function makeCompanyDoc(id: string, name: string, addresses: Address[]): Company {
	return {
		id,
		name,
		website: "",
		description: "",
		additionalComments: "",
		isMain: false,
		employeeCount: 0,
		procurementItemCount: 0,
		addresses,
		employees: [],
	};
}

const SINGLE_COMPANY: Company[] = [makeCompanyDoc("company-1", "Тестовая компания", TEST_ADDRESSES)];

const MULTI_COMPANY: Company[] = [
	makeCompanyDoc("company-1", "Тестовая компания", TEST_ADDRESSES),
	makeCompanyDoc("company-2", "Вторая компания", TEST_ADDRESSES),
];

beforeEach(() => {
	_resetCompaniesStore();
	_setCompanies(SINGLE_COMPANY);
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
		onSubmit: (items: NewItemInput[]) => void;
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

async function pickCompany(user: ReturnType<typeof userEvent.setup>, name: string) {
	await user.click(await screen.findByLabelText("Компания"));
	await user.click(await screen.findByRole("option", { name }));
}

async function fillStep1Minimum(user: ReturnType<typeof userEvent.setup>, name = "Арматура") {
	await user.type(screen.getByLabelText("Название"), name);
}

async function advance(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: "Далее" }));
}

async function create(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: "Создать" }));
}

describe("AddPositionsDrawer — wizard chrome", () => {
	test("renders title and step 1 headline", () => {
		renderDrawer();
		expect(screen.getByRole("heading", { name: "Добавить позиции" })).toBeInTheDocument();
		expect(screen.getByText(/Шаг 1 из 3/)).toBeInTheDocument();
	});

	test("does not render when closed", () => {
		renderDrawer({ open: false });
		expect(screen.queryByRole("heading", { name: "Добавить позиции" })).not.toBeInTheDocument();
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

	test("step indicator uses aria-live so SR users hear step changes", async () => {
		renderDrawer();
		const indicator = await screen.findByText(/Шаг 1 из 3/);
		// aria-live is on the paragraph wrapping the indicator spans
		const liveRegion = indicator.closest("[aria-live]");
		expect(liveRegion).toHaveAttribute("aria-live", "polite");
		expect(liveRegion).toHaveAttribute("aria-atomic", "true");
	});

	test("step 1 footer has Отмена + Далее only", () => {
		renderDrawer();
		expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Далее" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Назад" })).not.toBeInTheDocument();
	});

	test("step 2 footer has Назад + Далее (no Отмена)", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await fillStep1Minimum(user);
		await advance(user);

		expect(screen.queryByRole("button", { name: "Отмена" })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Назад" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Далее" })).toBeInTheDocument();
	});

	test("step 3 footer has Назад + Создать (no Отмена)", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await fillStep1Minimum(user);
		await advance(user);
		await advance(user);

		expect(screen.queryByRole("button", { name: "Отмена" })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Назад" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Создать" })).toBeInTheDocument();
	});

	test("Назад preserves step 1 state", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Название"), "Арматура");
		await user.type(screen.getByLabelText("Спецификация"), "А500С");
		await advance(user);
		await user.click(screen.getByRole("button", { name: "Назад" }));

		expect(screen.getByLabelText("Название")).toHaveValue("Арматура");
		expect(screen.getByLabelText("Спецификация")).toHaveValue("А500С");
	});
});

describe("AddPositionsDrawer — Step 1 validation", () => {
	test("Далее with empty name + multiple companies unselected shows both errors", async () => {
		_setCompanies(MULTI_COMPANY);
		renderDrawer();
		const user = userEvent.setup();
		await advance(user);

		expect(screen.getByText("Выберите компанию")).toBeInTheDocument();
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();
		expect(screen.getByText(/Шаг 1 из 3/)).toBeInTheDocument();
	});

	test("Далее with only name filled and no company shows company error", async () => {
		_setCompanies(MULTI_COMPANY);
		renderDrawer();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText("Название"), "Цемент");
		await advance(user);

		expect(screen.getByText("Выберите компанию")).toBeInTheDocument();
		expect(screen.queryByText("Укажите название позиции")).not.toBeInTheDocument();
	});

	test("typing in errored name clears error", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await advance(user);
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();

		await user.type(screen.getByLabelText("Название"), "A");
		expect(screen.queryByText("Укажите название позиции")).not.toBeInTheDocument();
	});

	test("required inputs advertise aria-required", () => {
		renderDrawer();
		expect(screen.getByLabelText("Название")).toHaveAttribute("aria-required", "true");
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
	test("renders the three section group headers + Позиции", () => {
		renderDrawer();
		expect(screen.getByRole("heading", { name: "Компания и категория" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Позиции" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Логистика и Финансы" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Дополнительно" })).toBeInTheDocument();
	});

	test("Позиции section renders the helper hint", () => {
		renderDrawer();
		expect(screen.getByText("Добавьте позиции которые вы заказываете одной поставкой")).toBeInTheDocument();
	});

	test("renders unit dropdown with all units", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await user.click(screen.getByLabelText("Единица измерения"));
		const options = await screen.findAllByRole("option");
		expect(options.length).toBeGreaterThanOrEqual(10);
	});

	test("Текущая цена без НДС lives inside the position card on step 1", () => {
		renderDrawer();
		expect(screen.getByLabelText("Текущая цена без НДС")).toBeInTheDocument();
	});

	test("sole-company mode auto-selects the company and pre-fills main address", async () => {
		renderDrawer();
		await screen.findByText("г. Москва, ул. Ленина, д. 15");
	});

	test("multi-company mode requires manual pick and then pre-selects main address", async () => {
		_setCompanies(MULTI_COMPANY);
		renderDrawer();
		const user = userEvent.setup();

		expect(screen.getByText("Сначала выберите компанию")).toBeInTheDocument();
		await pickCompany(user, "Тестовая компания");
		await screen.findByText("г. Москва, ул. Ленина, д. 15");
	});

	test("comment textarea and file dropzone are rendered inside Позиции", () => {
		renderDrawer();
		expect(screen.getByLabelText("Комментарий")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Прикрепить файлы" })).toBeInTheDocument();
	});

	test("file dropzone is a labeled button with a focus-visible ring", () => {
		renderDrawer();
		const dropzone = screen.getByRole("button", { name: "Прикрепить файлы" });
		expect(dropzone).toHaveClass("focus-visible:ring-3");
	});

	test("checkboxes are visible and unchecked by default", () => {
		renderDrawer();
		expect(screen.getByRole("checkbox", { name: "Отсрочка нужна" })).not.toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Нужен образец" })).not.toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Аналоги допускаются" })).not.toBeChecked();
	});
});

describe("AddPositionsDrawer — multi-position cards", () => {
	test("Добавить позицию is disabled until first card has a name", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const addBtn = screen.getByRole("button", { name: "Добавить позицию" });
		expect(addBtn).toBeDisabled();

		await user.type(screen.getByLabelText("Название"), "Арматура");
		expect(addBtn).not.toBeDisabled();
	});

	test("Добавить позицию appends a second card and disables itself again", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Название"), "First");
		await user.click(screen.getByRole("button", { name: "Добавить позицию" }));

		expect(screen.getAllByRole("region", { name: /Позиция \d+/ })).toHaveLength(2);
		expect(screen.getByRole("button", { name: "Добавить позицию" })).toBeDisabled();
	});

	test("delete-card button shows only when there are 2+ cards", async () => {
		renderDrawer();
		const user = userEvent.setup();

		expect(screen.queryByRole("button", { name: /Удалить позицию/ })).not.toBeInTheDocument();

		await user.type(screen.getByLabelText("Название"), "First");
		await user.click(screen.getByRole("button", { name: "Добавить позицию" }));
		expect(screen.getAllByRole("button", { name: /Удалить позицию/ })).toHaveLength(2);

		await user.click(screen.getAllByRole("button", { name: /Удалить позицию/ })[1]);
		expect(screen.queryByRole("button", { name: /Удалить позицию/ })).not.toBeInTheDocument();
	});

	test("submit emits one item per filled card", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getAllByLabelText("Название")[0], "Арматура");
		await user.click(screen.getByRole("button", { name: "Добавить позицию" }));
		await user.type(screen.getAllByLabelText("Название")[1], "Цемент");

		await advance(user);
		await advance(user);
		await create(user);

		expect(onSubmit).toHaveBeenCalledTimes(1);
		const [items] = onSubmit.mock.calls[0];
		expect(items).toHaveLength(2);
		expect(items[0]).toMatchObject({ name: "Арматура" });
		expect(items[1]).toMatchObject({ name: "Цемент" });
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
		await user.click(screen.getByRole("button", { name: /Создать категорию/ }));

		const input = await screen.findByRole("textbox", { name: "Название категории" });
		await user.type(input, "Канцелярия{Enter}");

		await screen.findByRole("button", { name: /Категория/ });
		await screen.findByText("Канцелярия");
	});
});

describe("AddPositionsDrawer — discard confirmation", () => {
	test("Отмена on dirty form shows confirmation", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Название"), "Something");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
	});

	test("Продолжить dismisses dialog without losing data", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Название"), "My item");
		await user.click(screen.getByRole("button", { name: "Отмена" }));
		await user.click(screen.getByRole("button", { name: "Продолжить" }));

		expect(screen.queryByText("Закрыть без сохранения?")).not.toBeInTheDocument();
		expect(screen.getByLabelText("Название")).toHaveValue("My item");
	});

	test("Закрыть без сохранения closes and resets", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Название"), "Discard");
		await user.click(screen.getByRole("button", { name: "Отмена" }));
		await user.click(screen.getByRole("button", { name: "Закрыть без сохранения" }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});

describe("AddPositionsDrawer — Step 2 supplier form", () => {
	async function reachStep2(user: ReturnType<typeof userEvent.setup>) {
		await fillStep1Minimum(user);
		await advance(user);
	}

	// Step 2 Оплата / Доставка lock until Название and ИНН are entered.
	// Price moved to per-position on step 1, so it is not part of the unlock.
	async function unlockSupplierFields(user: ReturnType<typeof userEvent.setup>) {
		await user.type(screen.getByLabelText("Название текущего поставщика"), "ACME");
		await user.type(screen.getByLabelText("ИНН"), "1234567890");
	}

	test("renders the supplier fields without price", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep2(user);

		expect(screen.getByLabelText("Название текущего поставщика")).toBeInTheDocument();
		expect(screen.getByLabelText("ИНН")).toBeInTheDocument();
		expect(screen.queryByLabelText("Текущая цена без НДС")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Предоплата" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отсрочка" })).toBeInTheDocument();
	});

	test("delivery dropdown reveals cost when paid", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep2(user);
		await unlockSupplierFields(user);

		expect(screen.queryByLabelText("Стоимость доставки")).not.toBeInTheDocument();

		await user.click(screen.getByLabelText("Доставка"));
		await user.click(await screen.findByRole("option", { name: "Платная" }));
		expect(screen.getByLabelText("Стоимость доставки")).toBeInTheDocument();

		await user.click(screen.getByLabelText("Доставка"));
		await user.click(await screen.findByRole("option", { name: "Самовывоз" }));
		expect(screen.queryByLabelText("Стоимость доставки")).not.toBeInTheDocument();
	});

	test("дней input appears only when Отсрочка is selected", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep2(user);
		await unlockSupplierFields(user);

		expect(screen.queryByLabelText("Дней отсрочки")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Отсрочка" }));
		expect(screen.getByLabelText("Дней отсрочки")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Предоплата" }));
		expect(screen.queryByLabelText("Дней отсрочки")).not.toBeInTheDocument();
	});

	test("Оплата and Доставка stay disabled until Название and ИНН are entered", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep2(user);

		expect(screen.getByRole("button", { name: "Отсрочка" })).toBeDisabled();
		expect(screen.getByLabelText("Доставка")).toBeDisabled();

		await user.type(screen.getByLabelText("Название текущего поставщика"), "ACME");
		// Only name → still locked.
		expect(screen.getByRole("button", { name: "Отсрочка" })).toBeDisabled();

		await user.type(screen.getByLabelText("ИНН"), "1234567890");
		expect(screen.getByRole("button", { name: "Отсрочка" })).not.toBeDisabled();
		expect(screen.getByLabelText("Доставка")).not.toBeDisabled();
	});

	test("invalid ИНН surfaces inline error on blur", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep2(user);

		const inn = screen.getByLabelText("ИНН");
		await user.type(inn, "12345");
		await user.tab();

		expect(screen.getByText(/ИНН должен содержать 10 или 12 цифр/)).toBeInTheDocument();
		expect(inn).toHaveAttribute("aria-invalid", "true");
	});

	test("valid ИНН (10 digits) does not show error on blur", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep2(user);

		await user.type(screen.getByLabelText("ИНН"), "1234567890");
		await user.tab();

		expect(screen.queryByText(/ИНН должен содержать/)).not.toBeInTheDocument();
	});

	test("ИНН error does not block Далее", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep2(user);

		await user.type(screen.getByLabelText("ИНН"), "12345");
		await user.tab();
		await advance(user);

		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
	});

	test("Step 2 state preserved across Назад / Далее", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep2(user);

		await user.type(screen.getByLabelText("Название текущего поставщика"), "МеталлТрейд");
		await user.type(screen.getByLabelText("ИНН"), "1234567890");
		await user.click(screen.getByRole("button", { name: "Отсрочка" }));
		await user.type(screen.getByLabelText("Дней отсрочки"), "30");

		await user.click(screen.getByRole("button", { name: "Назад" }));
		await advance(user);

		expect(screen.getByLabelText("Название текущего поставщика")).toHaveValue("МеталлТрейд");
		expect(screen.getByLabelText("ИНН")).toHaveValue("1234567890");
		expect(screen.getByLabelText("Дней отсрочки")).toHaveValue(30);
	});

	test("submit with populated Step 2 + price emits currentSupplier", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Название"), "Арматура");
		await user.type(screen.getByLabelText("Текущая цена без НДС"), "1200");
		await advance(user);

		await user.type(screen.getByLabelText("Название текущего поставщика"), "МеталлТрейд");
		await user.type(screen.getByLabelText("ИНН"), "1234567890");
		await user.click(screen.getByRole("button", { name: "Отсрочка" }));
		await user.type(screen.getByLabelText("Дней отсрочки"), "30");

		await advance(user);
		await create(user);

		const [items] = onSubmit.mock.calls[0];
		expect(items[0].currentSupplier).toEqual({
			companyName: "МеталлТрейд",
			inn: "1234567890",
			paymentType: "deferred",
			deferralDays: 30,
			pricePerUnit: 1200,
		});
	});

	test("dirty detection fires when only Step 2 fields touched", async () => {
		_setCompanies(MULTI_COMPANY);
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Название"), "Арматура");
		await pickCompany(user, "Тестовая компания");
		await advance(user);
		await user.type(screen.getByLabelText("Название текущего поставщика"), "Acme");
		await user.click(screen.getByRole("button", { name: "Назад" }));
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
	});
});

describe("AddPositionsDrawer — Step 3 generated questions", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	async function reachStep3(user: ReturnType<typeof userEvent.setup>) {
		await fillStep1Minimum(user);
		await advance(user);
		await advance(user);
		// Fast-forward the simulated generation loader.
		vi.advanceTimersByTime(5000);
		await screen.findByText("Уточните марку / сорт материала");
	}

	test("shows generation loader then renders all 5 questions", async () => {
		renderDrawer();
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
		await fillStep1Minimum(user);
		await advance(user);
		await advance(user);

		expect(screen.getByText("Генерируем уточняющие вопросы…")).toBeInTheDocument();

		vi.advanceTimersByTime(5000);
		await screen.findByText("Уточните марку / сорт материала");

		expect(screen.getByText("Требования к упаковке")).toBeInTheDocument();
		expect(screen.getByText("Нужны ли сертификаты и паспорта качества")).toBeInTheDocument();
		expect(screen.getByText("Насколько срочна поставка")).toBeInTheDocument();
		expect(screen.getByText("Особые требования к поставщику")).toBeInTheDocument();

		expect(screen.getAllByPlaceholderText("Введите свой вариант")).toHaveLength(5);
	});

	test("clicking an option chip selects it (aria-pressed=true)", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep3(user);

		const chip = screen.getByRole("button", { name: "Стандарт" });
		expect(chip).toHaveAttribute("aria-pressed", "false");
		await user.click(chip);
		expect(chip).toHaveAttribute("aria-pressed", "true");
	});

	test("selecting another option replaces the selection (single-select)", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep3(user);

		const first = screen.getByRole("button", { name: "Стандарт" });
		const second = screen.getByRole("button", { name: "Премиум" });

		await user.click(first);
		await user.click(second);

		expect(first).toHaveAttribute("aria-pressed", "false");
		expect(second).toHaveAttribute("aria-pressed", "true");
	});

	test("clicking the same chip again toggles it off", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep3(user);

		const chip = screen.getByRole("button", { name: "Стандарт" });
		await user.click(chip);
		await user.click(chip);
		expect(chip).toHaveAttribute("aria-pressed", "false");
	});

	test("loader is skipped on re-entry to step 3 within the same session", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep3(user);

		await user.click(screen.getByRole("button", { name: "Назад" }));
		await advance(user);

		// No loader this time — questions are shown immediately
		expect(screen.queryByText("Генерируем уточняющие вопросы…")).not.toBeInTheDocument();
		expect(screen.getByText("Уточните марку / сорт материала")).toBeInTheDocument();
	});

	test("Step 3 state preserved across Назад / Далее", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep3(user);

		await user.click(screen.getByRole("button", { name: "Стандарт" }));
		const firstFree = screen.getAllByPlaceholderText("Введите свой вариант")[0];
		await user.type(firstFree, "особые требования");

		await user.click(screen.getByRole("button", { name: "Назад" }));
		await advance(user);

		expect(screen.getByRole("button", { name: "Стандарт" })).toHaveAttribute("aria-pressed", "true");
		expect(screen.getAllByPlaceholderText("Введите свой вариант")[0]).toHaveValue("особые требования");
	});

	test("submit with chip + free-text emits generatedAnswers for answered questions only", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();
		await reachStep3(user);

		await user.click(screen.getByRole("button", { name: "Стандарт" }));
		const freeInputs = screen.getAllByPlaceholderText("Введите свой вариант");
		await user.type(freeInputs[1], "евро-палеты");

		await create(user);

		const [items] = onSubmit.mock.calls[0];
		expect(items[0].generatedAnswers).toEqual([
			{ questionId: "material-grade", selectedOption: "Стандарт" },
			{ questionId: "packaging", freeText: "евро-палеты" },
		]);
	});

	test("submit with no Step 3 answers omits generatedAnswers", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();
		await reachStep3(user);

		await create(user);

		const [items] = onSubmit.mock.calls[0];
		expect(items[0].generatedAnswers).toBeUndefined();
	});
});

describe("AddPositionsDrawer — submit", () => {
	test("completing wizard with minimal data emits a single-item array", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await fillStep1Minimum(user, "Арматура А500С");
		await advance(user);
		await advance(user);
		await create(user);

		expect(onSubmit).toHaveBeenCalledTimes(1);
		const [items] = onSubmit.mock.calls[0];
		expect(items).toHaveLength(1);
		expect(items[0]).toMatchObject({
			name: "Арматура А500С",
			paymentType: "prepayment",
			paymentMethod: "bank_transfer",
		});
		expect(items[0].deliveryAddresses).toEqual(["г. Москва, ул. Ленина, д. 15"]);
	});

	test("submit invokes onSubmit and closes drawer without firing its own toast", async () => {
		const onSubmit = vi.fn();
		const onOpenChange = vi.fn();
		renderDrawer({ onSubmit, onOpenChange });
		const user = userEvent.setup();

		await fillStep1Minimum(user);
		await advance(user);
		await advance(user);
		await create(user);

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(toast.success).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("submit with full step 1 payload captures all per-position fields", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Название"), "Цемент М500");
		await user.type(screen.getByLabelText("Спецификация"), "Портландцемент");

		await user.click(screen.getByLabelText("Единица измерения"));
		await user.click(await screen.findByRole("option", { name: "т" }));

		await user.type(screen.getByLabelText("Объём в год"), "600");
		await user.type(screen.getByLabelText("Количество в поставке"), "50");
		await user.type(screen.getByLabelText("Текущая цена без НДС"), "1200");

		await user.click(screen.getByRole("button", { name: "Силами поставщика" }));
		await user.click(screen.getByRole("button", { name: "Наличные" }));

		await user.click(screen.getByRole("checkbox", { name: "Отсрочка нужна" }));
		await user.click(screen.getByRole("checkbox", { name: "Нужен образец" }));
		await user.click(screen.getByRole("checkbox", { name: "Аналоги допускаются" }));

		await user.type(screen.getByLabelText("Комментарий"), "Срочно");

		await advance(user);
		await advance(user);
		await create(user);

		const [items] = onSubmit.mock.calls[0];
		expect(items[0]).toMatchObject({
			name: "Цемент М500",
			description: "Портландцемент",
			unit: "т",
			annualQuantity: 600,
			quantityPerDelivery: 50,
			currentPrice: 1200,
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

		const [items] = onSubmit.mock.calls[0];
		expect(items[0].currentSupplier).toBeUndefined();
		expect(items[0].generatedAnswers).toBeUndefined();
	});

	test("form resets after submit — reopening returns to step 1 empty", async () => {
		const { rerender } = renderDrawer({ open: true });
		const user = userEvent.setup();

		await fillStep1Minimum(user, "First");
		await advance(user);
		await advance(user);
		await create(user);

		rerender(<AddPositionsDrawer open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);

		expect(screen.getByLabelText("Название")).toHaveValue("");
	});
});
