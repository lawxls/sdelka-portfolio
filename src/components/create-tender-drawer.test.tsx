import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { createInMemoryFoldersClient } from "@/data/clients/folders-in-memory";
import { TestClientsProvider } from "@/data/test-clients-provider";
import type { Address, Company, Folder } from "@/data/types";
import { createTestQueryClient } from "@/test-utils";
import { CreateTenderDrawer } from "./create-tender-drawer";
import type { CreateTenderPayload } from "./use-create-tender-form";

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

let companies: Company[];

const FOLDERS_SEED: Folder[] = [
	{ id: "folder-metal", name: "Металлопрокат", color: "blue" },
	{ id: "folder-build", name: "Стройматериалы", color: "green" },
];

beforeEach(() => {
	companies = SINGLE_COMPANY;
});

afterEach(() => {
	vi.useRealTimers();
});

function renderDrawer(
	overrides: Partial<{
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onSubmit: (payload: CreateTenderPayload) => void;
	}> = {},
) {
	const props = {
		open: overrides.open ?? true,
		onOpenChange: overrides.onOpenChange ?? vi.fn(),
		onSubmit: overrides.onSubmit ?? vi.fn(),
	};
	const queryClient = createTestQueryClient();
	const companiesClient = createInMemoryCompaniesClient(companies);
	const foldersClient = createInMemoryFoldersClient({ seed: FOLDERS_SEED });
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ companies: companiesClient, folders: foldersClient }}>
			{children}
		</TestClientsProvider>
	);
	return {
		...render(<CreateTenderDrawer {...props} />, { wrapper: Wrapper }),
		...props,
	};
}

async function fillTenderMeta(user: ReturnType<typeof userEvent.setup>, _name = "Закупка металлопроката") {
	await user.type(screen.getByLabelText("Дедлайн"), "2026-06-15");
}

async function fillFirstPositionName(user: ReturnType<typeof userEvent.setup>, name = "Арматура") {
	await user.type(screen.getByLabelText("Название"), name);
}

async function advance(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: "Далее" }));
}

async function create(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: "Создать" }));
}

describe("CreateTenderDrawer — wizard chrome", () => {
	test("renders «Создать запрос» title and step 1 progress", () => {
		renderDrawer();
		expect(screen.getByRole("heading", { name: "Создать запрос" })).toBeInTheDocument();
		expect(screen.getByText(/Шаг 1 из 3/)).toBeInTheDocument();
		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
	});

	test("does not render when closed", () => {
		renderDrawer({ open: false });
		expect(screen.queryByRole("heading", { name: "Создать запрос" })).not.toBeInTheDocument();
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
		await fillTenderMeta(user);
		await fillFirstPositionName(user);
		await advance(user);

		expect(screen.queryByRole("button", { name: "Отмена" })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Назад" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Далее" })).toBeInTheDocument();
	});

	test("step 3 footer has Назад + Создать", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await fillTenderMeta(user);
		await fillFirstPositionName(user);
		await advance(user);
		await advance(user);

		expect(screen.getByRole("button", { name: "Назад" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Создать" })).toBeInTheDocument();
	});

	test("Назад preserves step 1 state including tender meta", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await fillTenderMeta(user);
		await fillFirstPositionName(user, "Арматура");
		await advance(user);
		await user.click(screen.getByRole("button", { name: "Назад" }));

		expect(screen.getByLabelText("Дедлайн")).toHaveValue("2026-06-15");
		expect(screen.getByLabelText("Название")).toHaveValue("Арматура");
	});
});

describe("CreateTenderDrawer — Step 1 tender meta", () => {
	test("renders all tender-meta fields (name field is auto-generated, not user-provided)", () => {
		renderDrawer();
		expect(screen.queryByLabelText("Название запроса")).not.toBeInTheDocument();
		expect(screen.getByLabelText("Бюджет")).toBeInTheDocument();
		expect(screen.getByLabelText("Дедлайн")).toBeInTheDocument();
		expect(screen.getByLabelText("Компания")).toBeInTheDocument();
	});

	test("Дедлайн is required (HTML required attribute)", () => {
		renderDrawer();
		expect(screen.getByLabelText("Дедлайн")).toBeRequired();
	});

	test("Далее with empty tender meta surfaces all required errors and stays on step 1", async () => {
		companies = MULTI_COMPANY;
		renderDrawer();
		const user = userEvent.setup();
		await advance(user);

		expect(screen.getByText("Укажите дедлайн")).toBeInTheDocument();
		expect(screen.getByText("Выберите компанию")).toBeInTheDocument();
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();
		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
	});

	test("Далее blocked on missing Дедлайн when other meta is filled", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await fillFirstPositionName(user);
		await advance(user);

		expect(screen.getByText("Укажите дедлайн")).toBeInTheDocument();
		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
	});

	test("Бюджет input strips non-digit input and accepts integer", async () => {
		renderDrawer();
		const user = userEvent.setup();
		const budget = screen.getByLabelText("Бюджет") as HTMLInputElement;
		await user.type(budget, "abc1500000");
		// non-digits stripped at the input layer; only the integer remains (formatted)
		expect(budget.value.replace(/\D/g, "")).toBe("1500000");
	});

	test("integer Бюджет advances to step 2", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await fillTenderMeta(user);
		await fillFirstPositionName(user);
		await user.type(screen.getByLabelText("Бюджет"), "1500000");
		await advance(user);

		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "66");
	});

	test("typing in errored Дедлайн clears the error", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await advance(user);
		expect(screen.getByText("Укажите дедлайн")).toBeInTheDocument();

		await user.type(screen.getByLabelText("Дедлайн"), "2026-07-01");
		expect(screen.queryByText("Укажите дедлайн")).not.toBeInTheDocument();
	});

	test("sole-company auto-selects and locks the company picker", async () => {
		renderDrawer();
		await screen.findByText("г. Москва, ул. Ленина, д. 15");
		expect(screen.getByLabelText("Компания")).toBeDisabled();
	});

	test("multi-company requires manual company pick", async () => {
		companies = MULTI_COMPANY;
		renderDrawer();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Дедлайн"), "2026-06-01");
		await fillFirstPositionName(user);
		await advance(user);

		expect(screen.getByText("Выберите компанию")).toBeInTheDocument();

		await user.click(screen.getByLabelText("Компания"));
		await user.click(await screen.findByRole("option", { name: "Тестовая компания" }));
		await advance(user);

		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "66");
	});
});

describe("CreateTenderDrawer — multi-position cards", () => {
	test("Добавить позицию gates on first card name", async () => {
		renderDrawer();
		const user = userEvent.setup();

		const addBtn = screen.getByRole("button", { name: "Добавить позицию" });
		expect(addBtn).toBeDisabled();

		await fillFirstPositionName(user, "Арматура");
		expect(addBtn).not.toBeDisabled();
	});

	test("submit emits one item per filled card", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await fillTenderMeta(user);
		await user.type(screen.getAllByLabelText("Название")[0], "Арматура");
		await user.click(screen.getByRole("button", { name: "Добавить позицию" }));
		await user.type(screen.getAllByLabelText("Название")[1], "Цемент");

		await advance(user);
		await advance(user);
		await create(user);

		expect(onSubmit).toHaveBeenCalledTimes(1);
		const [payload] = onSubmit.mock.calls[0] as [CreateTenderPayload];
		expect(payload.items).toHaveLength(2);
		expect(payload.items[0]).toMatchObject({ name: "Арматура" });
		expect(payload.items[1]).toMatchObject({ name: "Цемент" });
	});
});

describe("CreateTenderDrawer — discard confirmation", () => {
	test("Отмена on dirty form shows confirmation", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Дедлайн"), "2026-06-15");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
	});

	test("Закрыть без сохранения closes and resets", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Дедлайн"), "2026-06-15");
		await user.click(screen.getByRole("button", { name: "Отмена" }));
		await user.click(screen.getByRole("button", { name: "Закрыть без сохранения" }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});

describe("CreateTenderDrawer — Step 2 supplier (binds to tender)", () => {
	async function reachStep2(user: ReturnType<typeof userEvent.setup>) {
		await fillTenderMeta(user);
		await fillFirstPositionName(user);
		await advance(user);
	}

	test("renders supplier fields", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep2(user);

		expect(screen.getByLabelText("Название текущего поставщика")).toBeInTheDocument();
		expect(screen.getByLabelText("ИНН")).toBeInTheDocument();
	});

	test("supplier captured at step 2 is emitted on tender (NOT on items)", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();
		await fillTenderMeta(user);
		await fillFirstPositionName(user);
		await advance(user);

		await user.type(screen.getByLabelText("Название текущего поставщика"), "МеталлТрейд");
		await user.type(screen.getByLabelText("ИНН"), "1234567890");

		await advance(user);
		await create(user);

		const [payload] = onSubmit.mock.calls[0] as [CreateTenderPayload];
		expect(payload.tender.currentSupplier).toMatchObject({
			companyName: "МеталлТрейд",
			inn: "1234567890",
		});
		expect(payload.items[0]).not.toHaveProperty("currentSupplier");
	});
});

describe("CreateTenderDrawer — submit payload shape", () => {
	test("emits { tender, items } with tender meta fields", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Дедлайн"), "2026-06-15");
		await user.type(screen.getByLabelText("Бюджет"), "1500000");
		await fillFirstPositionName(user, "Арматура");

		await advance(user);
		await advance(user);
		await create(user);

		expect(onSubmit).toHaveBeenCalledTimes(1);
		const [payload] = onSubmit.mock.calls[0] as [CreateTenderPayload];
		expect(payload.tender).toMatchObject({
			// Auto-derived from the first position when no user-provided name exists.
			name: "Арматура",
			deadline: "2026-06-15",
			budget: 1500000,
			companyId: "company-1",
		});
		expect(payload.items).toHaveLength(1);
		expect(payload.items[0]).toMatchObject({ name: "Арматура" });
	});

	test("per-item payload omits tenderId — operation stamps it after tender create", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await fillTenderMeta(user);
		await fillFirstPositionName(user);
		await advance(user);
		await advance(user);
		await create(user);

		const [payload] = onSubmit.mock.calls[0] as [CreateTenderPayload];
		expect(payload.items[0]).not.toHaveProperty("tenderId");
	});

	test("submit closes drawer", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await fillTenderMeta(user);
		await fillFirstPositionName(user);
		await advance(user);
		await advance(user);
		await create(user);

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
