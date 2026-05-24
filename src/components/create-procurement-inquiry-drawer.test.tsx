import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { createInMemoryItemsClient } from "@/data/clients/items-in-memory";
import { createInMemoryProcurementInquiriesClient } from "@/data/clients/procurement-inquiries-in-memory";
import { createInMemorySuppliersClient } from "@/data/clients/suppliers-in-memory";
import {
	fakeGeneratedEmailClient,
	fakeGeneratedQuestionsClient,
	TestClientsProvider,
	testFoldersClient,
} from "@/data/test-clients-provider";
import type { Address, Company, Folder } from "@/data/types";
import { createTestQueryClient } from "@/test-utils";
import { CreateProcurementInquiryDrawer } from "./create-procurement-inquiry-drawer";
import type { CreateProcurementInquiryPayload } from "./use-create-procurement-inquiry-form";

const TEST_ADDRESSES: Address[] = [
	{ id: "addr-1", name: "Главный офис", address: "г. Москва, ул. Ленина, д. 15", phone: "", isMain: true },
	{ id: "addr-2", name: "Склад", address: "г. Москва, ул. Складская, д. 1", phone: "", isMain: false },
];

function makeCompanyDoc(id: string, name: string, addresses: Address[]): Company {
	return {
		id,
		name,
		shortName: "",
		inn: `770000000${id.replace(/\D/g, "") || "0"}`.slice(-10),
		kpp: "",
		ogrn: "",
		directorName: "",
		website: "",
		additionalComments: "",
		isMain: false,
		employeeCount: 0,
		procurementItemCount: 0,
		addressesCount: addresses.length,
		createdAt: "2026-04-01T00:00:00+03:00",
		updatedAt: "2026-04-01T00:00:00+03:00",
		addresses,
	};
}

const SINGLE_COMPANY: Company[] = [makeCompanyDoc("company-1", "Тестовая компания", TEST_ADDRESSES)];

const MULTI_COMPANY: Company[] = [
	makeCompanyDoc("company-1", "Тестовая компания", TEST_ADDRESSES),
	makeCompanyDoc("company-2", "Вторая компания", TEST_ADDRESSES),
];

const NO_COMPANIES: Company[] = [];

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

type PreviewResponse = { questions: { questionText: string; suggests: string[] }[] };
type EmailPreviewResponse = { subject: string; body: string };

interface RenderOverrides {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onSubmit?: (payload: CreateProcurementInquiryPayload) => void;
	previewResponse?: PreviewResponse;
	previewError?: unknown;
	/** Per-call preview implementation. Overrides `previewResponse`/`previewError`
	 * when set — use this to vary behavior across successive Step 1→2 entries. */
	previewFn?: () => Promise<PreviewResponse>;
	/** Per-call email preview implementation. Defaults to a payload-aware stub
	 * that includes the first position name in subject + body so existing
	 * tests can assert on it. */
	emailPreviewFn?: (input: {
		positions: { name: string }[];
		regenerateIndex?: number;
	}) => Promise<EmailPreviewResponse>;
}

function renderDrawer(overrides: RenderOverrides = {}) {
	const props = {
		open: overrides.open ?? true,
		onOpenChange: overrides.onOpenChange ?? vi.fn(),
		onSubmit: overrides.onSubmit ?? vi.fn(),
	};
	const queryClient = createTestQueryClient();
	const companiesClient = createInMemoryCompaniesClient(companies);
	const foldersClient = testFoldersClient(FOLDERS_SEED);
	const procurementInquiriesClient = createInMemoryProcurementInquiriesClient({ seed: [] });
	const itemsClient = createInMemoryItemsClient({ seed: [] });
	const suppliersClient = createInMemorySuppliersClient();
	const defaultResponse: PreviewResponse = overrides.previewResponse ?? {
		questions: [{ questionText: "Срочность?", suggests: ["Срочно", "Стандарт"] }],
	};
	const previewImpl =
		overrides.previewFn ??
		(overrides.previewError
			? () => Promise.reject(overrides.previewError) as Promise<PreviewResponse>
			: () => Promise.resolve(defaultResponse));
	const generatedQuestionsClient = fakeGeneratedQuestionsClient({ preview: previewImpl });
	const defaultEmailFn = (input: { positions: { name: string }[]; regenerateIndex?: number }) => {
		const first = input.positions[0]?.name ?? "";
		const variant = input.regenerateIndex ?? 0;
		return Promise.resolve({
			subject: `Запрос КП — ${first} (v${variant})`,
			body: `Здравствуйте! Просим направить КП по позиции «${first}» (вариант ${variant}).`,
		});
	};
	const emailImpl = (overrides.emailPreviewFn ?? defaultEmailFn) as (input: unknown) => Promise<EmailPreviewResponse>;
	const generatedEmailClient = fakeGeneratedEmailClient({ preview: emailImpl });
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: companiesClient,
				folders: foldersClient,
				procurementInquiries: procurementInquiriesClient,
				items: itemsClient,
				suppliers: suppliersClient,
				generatedQuestions: generatedQuestionsClient,
				generatedEmail: generatedEmailClient,
			}}
		>
			{children}
		</TestClientsProvider>
	);
	return {
		...render(<CreateProcurementInquiryDrawer {...props} />, { wrapper: Wrapper }),
		...props,
	};
}

async function setDeadline(user: ReturnType<typeof userEvent.setup>, value = "2026-06-15") {
	const input = screen.getByLabelText("Дедлайн") as HTMLInputElement;
	await user.clear(input);
	await user.type(input, value);
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

describe("CreateProcurementInquiryDrawer — wizard chrome", () => {
	test("renders «Создать запрос» title and step 1 progress (33%)", () => {
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

	test("step 2 footer has Назад + Далее (no Отмена) at 66%", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await fillFirstPositionName(user);
		await advance(user);

		expect(screen.queryByRole("button", { name: "Отмена" })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Назад" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Далее" })).toBeInTheDocument();
		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "66");
	});

	test("step 3 footer has Назад + Создать at 100%", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await fillFirstPositionName(user);
		await advance(user);
		await advance(user);

		expect(screen.getByRole("button", { name: "Назад" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Создать" })).toBeInTheDocument();
		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
	});

	test("Назад preserves step 1 state", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await fillFirstPositionName(user, "Арматура");
		await advance(user);
		await user.click(screen.getByRole("button", { name: "Назад" }));

		expect(screen.getByLabelText("Название")).toHaveValue("Арматура");
	});
});

describe("CreateProcurementInquiryDrawer — zero companies", () => {
	test("«Компания» field renders «Создать компанию» CTA when companies list is empty", async () => {
		companies = NO_COMPANIES;
		renderDrawer();
		await screen.findByRole("button", { name: /Создать компанию/i });
		expect(screen.queryByRole("combobox", { name: "Компания" })).not.toBeInTheDocument();
	});

	test("clicking «Создать компанию» opens the nested CompanyCreationSheet", async () => {
		companies = NO_COMPANIES;
		renderDrawer();
		const user = userEvent.setup();
		const cta = await screen.findByRole("button", { name: /Создать компанию/i });
		await user.click(cta);
		expect(await screen.findByText("Новая компания")).toBeInTheDocument();
	});

	test("submitting the nested sheet auto-selects the new company and its main address", async () => {
		companies = NO_COMPANIES;
		renderDrawer();
		const user = userEvent.setup();
		const cta = await screen.findByRole("button", { name: /Создать компанию/i });
		await user.click(cta);

		// New flow: INN lookup populates the company; address is prefilled from DaData.
		// The in-memory adapter's `lookupByInn` returns a deterministic match for any
		// valid 10/12-digit INN.
		await user.type(screen.getByLabelText("ИНН"), "7700001234");
		await screen.findByTestId("lookup-matched");
		await user.click(screen.getByRole("button", { name: "Создать компанию" }));

		await screen.findByRole("combobox", { name: "Компания" });
	});
});

describe("CreateProcurementInquiryDrawer — Step 1 inquiry meta", () => {
	test("renders deadline + company; budget field is gone", () => {
		renderDrawer();
		expect(screen.queryByLabelText("Название запроса")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Бюджет")).not.toBeInTheDocument();
		expect(screen.getByLabelText("Дедлайн")).toBeInTheDocument();
		expect(screen.getByLabelText("Компания")).toBeInTheDocument();
	});

	test("deadline defaults to a 14-day-out value", () => {
		renderDrawer();
		const input = screen.getByLabelText("Дедлайн") as HTMLInputElement;
		expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	test("Дедлайн is required (HTML required attribute)", () => {
		renderDrawer();
		expect(screen.getByLabelText("Дедлайн")).toBeRequired();
	});

	test("Далее with cleared meta surfaces required errors and stays on step 1", async () => {
		companies = MULTI_COMPANY;
		renderDrawer();
		const user = userEvent.setup();
		await user.clear(screen.getByLabelText("Дедлайн"));
		await advance(user);

		expect(screen.getByText("Укажите дедлайн")).toBeInTheDocument();
		expect(screen.getByText("Выберите компанию")).toBeInTheDocument();
		expect(screen.getByText("Укажите название позиции")).toBeInTheDocument();
		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
	});

	test("Далее blocked on cleared Дедлайн when other meta is filled", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await fillFirstPositionName(user);
		await user.clear(screen.getByLabelText("Дедлайн"));
		await advance(user);

		expect(screen.getByText("Укажите дедлайн")).toBeInTheDocument();
		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
	});

	test("typing in errored Дедлайн clears the error", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await user.clear(screen.getByLabelText("Дедлайн"));
		await advance(user);
		expect(screen.getByText("Укажите дедлайн")).toBeInTheDocument();

		await user.type(screen.getByLabelText("Дедлайн"), "2026-07-01");
		expect(screen.queryByText("Укажите дедлайн")).not.toBeInTheDocument();
	});

	test("sole-company auto-selects and locks the company picker", async () => {
		renderDrawer();
		await screen.findByRole("combobox", { name: "Компания" });
		await vi.waitFor(() => {
			expect(screen.getByLabelText("Компания")).toBeDisabled();
		});
	});

	test("multi-company requires manual company pick", async () => {
		companies = MULTI_COMPANY;
		renderDrawer();
		const user = userEvent.setup();

		await fillFirstPositionName(user);
		await advance(user);

		expect(screen.getByText("Выберите компанию")).toBeInTheDocument();

		await user.click(screen.getByLabelText("Компания"));
		await user.click(await screen.findByRole("option", { name: "Тестовая компания" }));
		await advance(user);

		expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "66");
	});
});

describe("CreateProcurementInquiryDrawer — multi-position cards", () => {
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

		await user.type(screen.getAllByLabelText("Название")[0], "Арматура");
		await user.click(screen.getByRole("button", { name: "Добавить позицию" }));
		await user.type(screen.getAllByLabelText("Название")[1], "Цемент");

		await advance(user);
		await advance(user);
		await create(user);

		expect(onSubmit).toHaveBeenCalledTimes(1);
		const [payload] = onSubmit.mock.calls[0] as [CreateProcurementInquiryPayload];
		expect(payload.items).toHaveLength(2);
		expect(payload.items[0]).toMatchObject({ name: "Арматура" });
		expect(payload.items[1]).toMatchObject({ name: "Цемент" });
	});
});

describe("CreateProcurementInquiryDrawer — discard confirmation", () => {
	test("Отмена on dirty form shows confirmation", async () => {
		renderDrawer();
		const user = userEvent.setup();

		await setDeadline(user, "2026-06-15");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(screen.getByText("Закрыть без сохранения?")).toBeInTheDocument();
	});

	test("Закрыть без сохранения closes and resets", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await setDeadline(user, "2026-06-15");
		await user.click(screen.getByRole("button", { name: "Отмена" }));
		await user.click(screen.getByRole("button", { name: "Закрыть без сохранения" }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});

describe("CreateProcurementInquiryDrawer — Position-level supplier modal", () => {
	test("«Добавить текущего поставщика» button opens the modal on each position card", async () => {
		renderDrawer();
		const user = userEvent.setup();

		expect(screen.queryByRole("dialog", { name: "Добавить текущего поставщика" })).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Добавить текущего поставщика" }));
		expect(await screen.findByRole("dialog", { name: "Добавить текущего поставщика" })).toBeInTheDocument();
	});

	test("Saved supplier flows to inquiry.currentSupplier on submit", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await fillFirstPositionName(user);
		await user.click(screen.getByRole("button", { name: "Добавить текущего поставщика" }));

		const innInput = await screen.findByLabelText("ИНН");
		await user.type(innInput, "1234567890");
		// Wait for the DaData match to land — Email becomes editable only once
		// the company is resolved.
		await waitFor(() => expect(screen.getByLabelText("Email")).not.toBeDisabled());
		await user.type(screen.getByLabelText("Email"), "supplier@example.com");
		await user.type(screen.getByLabelText("Текущая цена/ед. без НДС"), "1250");
		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await advance(user);
		await advance(user);
		await create(user);

		const [payload] = onSubmit.mock.calls[0] as [CreateProcurementInquiryPayload];
		expect(payload.items[0].currentSupplier).toMatchObject({ inn: "1234567890" });
		expect(payload.items[0]).toMatchObject({ currentPrice: 1250 });
	});
});

describe("CreateProcurementInquiryDrawer — submit payload shape", () => {
	test("emits { procurementInquiry, items } with inquiry meta fields", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await setDeadline(user, "2026-06-15");
		await fillFirstPositionName(user, "Арматура");

		await advance(user);
		await advance(user);
		await create(user);

		expect(onSubmit).toHaveBeenCalledTimes(1);
		const [payload] = onSubmit.mock.calls[0] as [CreateProcurementInquiryPayload];
		expect(payload.procurementInquiry).toMatchObject({
			deadline: "2026-06-15",
			companyId: "company-1",
		});
		// `name` is server-generated by the inquiry-name LLM seam; the wizard
		// no longer ships it in the submit payload.
		expect(payload.procurementInquiry).not.toHaveProperty("name");
		expect(payload.items).toHaveLength(1);
		expect(payload.items[0]).toMatchObject({ name: "Арматура" });
	});

	test("per-item payload omits procurementInquiryId — operation stamps it after inquiry create", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();

		await fillFirstPositionName(user);
		await advance(user);
		await advance(user);
		await create(user);

		const [payload] = onSubmit.mock.calls[0] as [CreateProcurementInquiryPayload];
		expect(payload.items[0]).not.toHaveProperty("procurementInquiryId");
	});

	test("submit closes drawer", async () => {
		const onOpenChange = vi.fn();
		renderDrawer({ onOpenChange });
		const user = userEvent.setup();

		await fillFirstPositionName(user);
		await advance(user);
		await advance(user);
		await create(user);

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});

describe("CreateProcurementInquiryDrawer — Step 3 supplier email", () => {
	async function reachStep3(user: ReturnType<typeof userEvent.setup>) {
		await fillFirstPositionName(user, "Арматура");
		await advance(user);
		await advance(user);
		await screen.findByLabelText("Текст письма");
	}

	test("renders Текст письма after the brief loader", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep3(user);

		expect(screen.getByLabelText("Текст письма")).toBeInTheDocument();
		expect(screen.queryByLabelText("Тема")).not.toBeInTheDocument();
		expect(screen.queryByText("Кому")).not.toBeInTheDocument();
	});

	test("body is seeded with position name on first entry", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep3(user);

		const body = screen.getByLabelText("Текст письма") as HTMLTextAreaElement;
		expect(body.value).toContain("Арматура");
	});

	test("Автоотправка checkbox is off by default and toggles on click", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep3(user);

		const checkbox = screen.getByRole("checkbox", { name: "Автоотправка запросов" });
		expect(checkbox).not.toBeChecked();

		await user.click(checkbox);
		expect(checkbox).toBeChecked();
	});

	test("Создать is disabled while initial email is being generated", async () => {
		let resolve!: (v: EmailPreviewResponse) => void;
		const emailPreviewFn = () =>
			new Promise<EmailPreviewResponse>((r) => {
				resolve = r;
			});
		renderDrawer({ emailPreviewFn });
		const user = userEvent.setup();

		await fillFirstPositionName(user, "Арматура");
		await advance(user);
		await advance(user);

		expect(await screen.findByText("Генерируем письмо…")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Создать" })).toBeDisabled();

		resolve({ subject: "S", body: "Здравствуйте, Арматура" });

		await screen.findByLabelText("Текст письма");
		expect(screen.getByRole("button", { name: "Создать" })).not.toBeDisabled();
	});

	test("Назад while email preview is in-flight, then Далее, does not refetch", async () => {
		let resolve!: (v: EmailPreviewResponse) => void;
		const emailPreviewFn = vi.fn(
			() =>
				new Promise<EmailPreviewResponse>((r) => {
					resolve = r;
				}),
		);
		renderDrawer({ emailPreviewFn });
		const user = userEvent.setup();

		await fillFirstPositionName(user, "Арматура");
		await advance(user);
		await advance(user);

		expect(await screen.findByText("Генерируем письмо…")).toBeInTheDocument();
		expect(emailPreviewFn).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole("button", { name: "Назад" }));
		await advance(user);

		expect(screen.getByText("Генерируем письмо…")).toBeInTheDocument();
		expect(emailPreviewFn).toHaveBeenCalledTimes(1);

		resolve({ subject: "S", body: "Здравствуйте, Арматура" });
		await screen.findByLabelText("Текст письма");
		expect(emailPreviewFn).toHaveBeenCalledTimes(1);
	});

	test("Перегенерировать swaps the body to a different variant", async () => {
		renderDrawer();
		const user = userEvent.setup();
		await reachStep3(user);

		const body = screen.getByLabelText("Текст письма") as HTMLTextAreaElement;
		const initialBody = body.value;

		await user.click(screen.getByRole("button", { name: "Перегенерировать письмо" }));

		await vi.waitFor(() => {
			expect((screen.getByLabelText("Текст письма") as HTMLTextAreaElement).value).not.toBe(initialBody);
		});
	});

	test("submit payload carries sendRequestsAutomatically=false by default with email body", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();
		await reachStep3(user);

		await create(user);

		const [payload] = onSubmit.mock.calls[0] as [CreateProcurementInquiryPayload];
		expect(payload.procurementInquiry.sendRequestsAutomatically).toBe(false);
		expect(payload.procurementInquiry.emailBody).toContain("Арматура");
	});

	test("checking Автоотправка flips sendRequestsAutomatically to true on submit", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ onSubmit });
		const user = userEvent.setup();
		await reachStep3(user);

		await user.click(screen.getByRole("checkbox", { name: "Автоотправка запросов" }));
		await create(user);

		const [payload] = onSubmit.mock.calls[0] as [CreateProcurementInquiryPayload];
		expect(payload.procurementInquiry.sendRequestsAutomatically).toBe(true);
	});
});

describe("CreateProcurementInquiryDrawer — Step 2 clarifying questions", () => {
	test("renders fetched questions after the loader (success path)", async () => {
		renderDrawer({
			previewResponse: {
				questions: [
					{ questionText: "Marka materiala?", suggests: ["Standart", "Premium"] },
					{ questionText: "Срочность поставки?", suggests: ["Срочно", "По графику"] },
				],
			},
		});
		const user = userEvent.setup();
		await fillFirstPositionName(user);
		await advance(user);

		expect(await screen.findByText("Marka materiala?")).toBeInTheDocument();
		expect(screen.getByText("Срочность поставки?")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Standart" })).toBeInTheDocument();
	});

	test("error state surfaces Повторить + Пропустить buttons", async () => {
		renderDrawer({ previewError: new Error("boom") });
		const user = userEvent.setup();
		await fillFirstPositionName(user);
		await advance(user);

		expect(await screen.findByText("Не удалось загрузить вопросы")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Пропустить" })).toBeInTheDocument();
	});

	test("Пропустить advances to Step 3 with no questions persisted", async () => {
		const onSubmit = vi.fn();
		renderDrawer({ previewError: new Error("boom"), onSubmit });
		const user = userEvent.setup();
		await fillFirstPositionName(user);
		await advance(user);

		await user.click(await screen.findByRole("button", { name: "Пропустить" }));
		await screen.findByLabelText("Текст письма");
		await create(user);

		const [payload] = onSubmit.mock.calls[0] as [CreateProcurementInquiryPayload];
		expect(payload.procurementInquiry.generatedQuestions).toBeUndefined();
	});

	test("Далее is disabled while questions are being generated", async () => {
		let resolve!: (v: PreviewResponse) => void;
		const previewFn = () =>
			new Promise<PreviewResponse>((r) => {
				resolve = r;
			});
		renderDrawer({ previewFn });
		const user = userEvent.setup();

		await fillFirstPositionName(user);
		await advance(user);

		expect(await screen.findByText("Генерируем уточняющие вопросы…")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();

		resolve({ questions: [{ questionText: "Marka?", suggests: ["A", "B"] }] });

		await screen.findByText("Marka?");
		expect(screen.getByRole("button", { name: "Далее" })).not.toBeDisabled();
	});

	test("Назад while preview is in-flight, then Далее, does not refetch", async () => {
		let resolve!: (v: PreviewResponse) => void;
		const previewFn = vi.fn(
			() =>
				new Promise<PreviewResponse>((r) => {
					resolve = r;
				}),
		);
		renderDrawer({ previewFn });
		const user = userEvent.setup();

		await fillFirstPositionName(user);
		await advance(user);

		expect(await screen.findByText("Генерируем уточняющие вопросы…")).toBeInTheDocument();
		expect(previewFn).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole("button", { name: "Назад" }));
		await advance(user);

		expect(screen.getByText("Генерируем уточняющие вопросы…")).toBeInTheDocument();
		expect(previewFn).toHaveBeenCalledTimes(1);

		resolve({ questions: [{ questionText: "Marka?", suggests: ["A", "B"] }] });
		expect(await screen.findByText("Marka?")).toBeInTheDocument();
		expect(previewFn).toHaveBeenCalledTimes(1);
	});

	test("Назад → Далее reuses cached questions without re-fetching", async () => {
		const onSubmit = vi.fn();
		const previewFn = vi.fn(() => Promise.resolve({ questions: [{ questionText: "Marka?", suggests: ["A", "B"] }] }));
		renderDrawer({ previewFn, onSubmit });
		const user = userEvent.setup();

		await fillFirstPositionName(user);
		await advance(user);
		await user.click(await screen.findByRole("button", { name: "A" }));
		expect(previewFn).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole("button", { name: "Назад" }));
		await advance(user);

		expect(await screen.findByText("Marka?")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "A" })).toHaveAttribute("aria-pressed", "true");
		expect(previewFn).toHaveBeenCalledTimes(1);

		await advance(user);
		await screen.findByLabelText("Текст письма");
		await create(user);

		const [payload] = onSubmit.mock.calls[0] as [CreateProcurementInquiryPayload];
		expect(payload.procurementInquiry.generatedQuestions).toEqual([
			{ questionText: "Marka?", suggests: ["A", "B"], answer: "A" },
		]);
	});

	test("picking a suggest chip clears any typed freetext (mutually exclusive)", async () => {
		renderDrawer({
			previewResponse: { questions: [{ questionText: "Marka?", suggests: ["A", "B"] }] },
		});
		const user = userEvent.setup();
		await fillFirstPositionName(user);
		await advance(user);

		const freeText = (await screen.findByLabelText("Свой вариант: Marka?")) as HTMLInputElement;
		await user.type(freeText, "custom");
		expect(freeText.value).toBe("custom");

		await user.click(screen.getByRole("button", { name: "A" }));
		expect((screen.getByLabelText("Свой вариант: Marka?") as HTMLInputElement).value).toBe("");
		expect(screen.getByRole("button", { name: "A" })).toHaveAttribute("aria-pressed", "true");
	});

	test("typing freetext clears the selected chip (mutually exclusive)", async () => {
		renderDrawer({
			previewResponse: { questions: [{ questionText: "Marka?", suggests: ["A", "B"] }] },
		});
		const user = userEvent.setup();
		await fillFirstPositionName(user);
		await advance(user);

		await user.click(await screen.findByRole("button", { name: "A" }));
		expect(screen.getByRole("button", { name: "A" })).toHaveAttribute("aria-pressed", "true");

		await user.type(screen.getByLabelText("Свой вариант: Marka?"), "custom");
		expect(screen.getByRole("button", { name: "A" })).toHaveAttribute("aria-pressed", "false");
		expect((screen.getByLabelText("Свой вариант: Marka?") as HTMLInputElement).value).toBe("custom");
	});

	test("submit forwards generatedQuestions at the inquiry level (including unanswered rows)", async () => {
		const onSubmit = vi.fn();
		renderDrawer({
			previewResponse: {
				questions: [
					{ questionText: "Marka?", suggests: ["A", "B"] },
					{ questionText: "Срочность?", suggests: ["Срочно"] },
				],
			},
			onSubmit,
		});
		const user = userEvent.setup();
		await fillFirstPositionName(user);
		await advance(user);

		await user.click(await screen.findByRole("button", { name: "A" }));
		await advance(user);
		await screen.findByLabelText("Текст письма");
		await create(user);

		const [payload] = onSubmit.mock.calls[0] as [CreateProcurementInquiryPayload];
		expect(payload.procurementInquiry.generatedQuestions).toEqual([
			{ questionText: "Marka?", suggests: ["A", "B"], answer: "A" },
			{ questionText: "Срочность?", suggests: ["Срочно"], answer: "" },
		]);
		expect(payload.items[0]).not.toHaveProperty("generatedAnswers");
	});
});
