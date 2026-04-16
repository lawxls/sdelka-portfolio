import { delay, nextId, paginate } from "./mock-utils";
import type {
	Address,
	AddressSummary,
	Company,
	CompanySummary,
	Employee,
	EmployeePermissions,
	PermissionLevel,
} from "./types";

// --- Seed data ---

const SEED_COMPANIES: Company[] = [
	{
		id: "company-1",
		name: "Сделка",
		industry: "Строительство и девелопмент",
		website: "https://sdelka.example",
		description: "Главная компания: жилые и коммерческие объекты в Москве и области.",
		preferredPayment: "Безналичный расчёт, отсрочка 30 дней",
		preferredDelivery: "Доставка до склада в Москве",
		additionalComments: "Требуются сертификаты соответствия для металлопроката.",
		isMain: true,
		employeeCount: 4,
		procurementItemCount: 17,
		addresses: [
			{
				id: "addr-c1-office",
				name: "Главный офис",
				type: "office",
				postalCode: "125009",
				address: "г. Москва, ул. Тверская, д. 12, стр. 1",
				contactPerson: "Иванова Мария",
				phone: "+74951234567",
				isMain: true,
			},
			{
				id: "addr-c1-warehouse",
				name: "Складской комплекс",
				type: "warehouse",
				postalCode: "142100",
				address: "г. Подольск, Промышленный проезд, д. 5",
				contactPerson: "Сергеев Павел",
				phone: "+74951234568",
				isMain: false,
			},
			{
				id: "addr-c1-prod",
				name: "Производственная база",
				type: "production",
				postalCode: "143005",
				address: "г. Одинцово, Внуковское шоссе, д. 14",
				contactPerson: "Кузнецов Дмитрий",
				phone: "+74951234569",
				isMain: false,
			},
		],
		employees: [
			{
				id: 1,
				firstName: "Алексей",
				lastName: "Морозов",
				patronymic: "Викторович",
				position: "Генеральный директор",
				role: "owner",
				phone: "+79161234500",
				email: "morozov@sdelka.example",
				isResponsible: true,
				registeredAt: "2024-01-15T10:00:00Z",
				permissions: {
					id: "perm-c1-1",
					employeeId: 1,
					analytics: "edit",
					procurement: "edit",
					companies: "edit",
					tasks: "edit",
				},
			},
			{
				id: 2,
				firstName: "Мария",
				lastName: "Иванова",
				patronymic: "Сергеевна",
				position: "Директор по закупкам",
				role: "admin",
				phone: "+79161234501",
				email: "ivanova@sdelka.example",
				isResponsible: false,
				registeredAt: "2024-02-01T10:00:00Z",
				permissions: {
					id: "perm-c1-2",
					employeeId: 2,
					analytics: "edit",
					procurement: "edit",
					companies: "edit",
					tasks: "edit",
				},
			},
			{
				id: 3,
				firstName: "Павел",
				lastName: "Сергеев",
				patronymic: "Андреевич",
				position: "Старший менеджер по закупкам",
				role: "user",
				phone: "+79161234502",
				email: "sergeev@sdelka.example",
				isResponsible: false,
				registeredAt: "2024-03-12T10:00:00Z",
				permissions: {
					id: "perm-c1-3",
					employeeId: 3,
					analytics: "view",
					procurement: "edit",
					companies: "view",
					tasks: "edit",
				},
			},
			{
				id: 4,
				firstName: "Анна",
				lastName: "Кузнецова",
				patronymic: "Дмитриевна",
				position: "Аналитик",
				role: "user",
				phone: "+79161234503",
				email: "kuznetsova@sdelka.example",
				isResponsible: false,
				registeredAt: "2024-05-20T10:00:00Z",
				permissions: {
					id: "perm-c1-4",
					employeeId: 4,
					analytics: "edit",
					procurement: "view",
					companies: "view",
					tasks: "view",
				},
			},
		],
	},
	{
		id: "company-supplier-metal",
		name: "МеталлТрейд",
		industry: "Производство и поставка металлопроката",
		website: "https://metaltrade.example",
		description: "Поставщик арматуры, швеллера, уголка по Центральному региону.",
		preferredPayment: "Предоплата 30%, остаток по факту отгрузки",
		preferredDelivery: "Доставка собственным транспортом",
		additionalComments: "",
		isMain: false,
		employeeCount: 2,
		procurementItemCount: 0,
		addresses: [
			{
				id: "addr-csm-office",
				name: "Офис продаж",
				type: "office",
				postalCode: "115280",
				address: "г. Москва, ул. Ленинская Слобода, д. 19",
				contactPerson: "Орлов Сергей",
				phone: "+74957700101",
				isMain: true,
			},
		],
		employees: [
			{
				id: 101,
				firstName: "Сергей",
				lastName: "Орлов",
				patronymic: "Игоревич",
				position: "Менеджер по работе с клиентами",
				role: "admin",
				phone: "+79061234101",
				email: "orlov@metaltrade.example",
				isResponsible: true,
				permissions: {
					id: "perm-csm-1",
					employeeId: 101,
					analytics: "view",
					procurement: "edit",
					companies: "edit",
					tasks: "edit",
				},
			},
			{
				id: 102,
				firstName: "Ольга",
				lastName: "Никитина",
				patronymic: "Александровна",
				position: "Логист",
				role: "user",
				phone: "+79061234102",
				email: "nikitina@metaltrade.example",
				isResponsible: false,
				permissions: {
					id: "perm-csm-2",
					employeeId: 102,
					analytics: "none",
					procurement: "view",
					companies: "view",
					tasks: "view",
				},
			},
		],
	},
	{
		id: "company-supplier-pipe",
		name: "ТрубоСталь",
		industry: "Трубный прокат и профильные трубы",
		website: "https://trubostal.example",
		description: "Профильные трубы, ВГП, бесшовные. Прямые поставки с завода.",
		preferredPayment: "Полная предоплата",
		preferredDelivery: "Самовывоз со склада в Лобне",
		additionalComments: "",
		isMain: false,
		employeeCount: 1,
		procurementItemCount: 0,
		addresses: [
			{
				id: "addr-csp-warehouse",
				name: "Склад Лобня",
				type: "warehouse",
				postalCode: "141730",
				address: "г. Лобня, Букинское шоссе, д. 22",
				contactPerson: "Романов Игорь",
				phone: "+74957700202",
				isMain: true,
			},
		],
		employees: [
			{
				id: 111,
				firstName: "Игорь",
				lastName: "Романов",
				patronymic: "Петрович",
				position: "Руководитель отдела продаж",
				role: "admin",
				phone: "+79061234111",
				email: "romanov@trubostal.example",
				isResponsible: true,
				permissions: {
					id: "perm-csp-1",
					employeeId: 111,
					analytics: "view",
					procurement: "edit",
					companies: "edit",
					tasks: "edit",
				},
			},
		],
	},
	{
		id: "company-supplier-cement",
		name: "ЦементСтрой",
		industry: "Цемент, бетон, сухие смеси",
		website: "https://cementstroy.example",
		description: "Цемент М400/М500, ЖБИ, сухие смеси с доставкой по Москве.",
		preferredPayment: "Безналичный расчёт, отсрочка 14 дней",
		preferredDelivery: "Бесплатная доставка по Москве при заказе от 5 тонн",
		additionalComments: "",
		isMain: false,
		employeeCount: 2,
		procurementItemCount: 0,
		addresses: [
			{
				id: "addr-csc-office",
				name: "Центральный офис",
				type: "office",
				postalCode: "117105",
				address: "г. Москва, Варшавское шоссе, д. 35",
				contactPerson: "Соколова Елена",
				phone: "+74957700303",
				isMain: true,
			},
			{
				id: "addr-csc-prod",
				name: "Производство Воскресенск",
				type: "production",
				postalCode: "140200",
				address: "г. Воскресенск, ул. Заводская, д. 1",
				contactPerson: "Быков Андрей",
				phone: "+74957700304",
				isMain: false,
			},
		],
		employees: [
			{
				id: 121,
				firstName: "Елена",
				lastName: "Соколова",
				patronymic: "Юрьевна",
				position: "Менеджер ключевых клиентов",
				role: "admin",
				phone: "+79061234121",
				email: "sokolova@cementstroy.example",
				isResponsible: true,
				permissions: {
					id: "perm-csc-1",
					employeeId: 121,
					analytics: "view",
					procurement: "edit",
					companies: "edit",
					tasks: "edit",
				},
			},
			{
				id: 122,
				firstName: "Андрей",
				lastName: "Быков",
				patronymic: "Михайлович",
				position: "Технолог",
				role: "user",
				phone: "+79061234122",
				email: "bykov@cementstroy.example",
				isResponsible: false,
				permissions: {
					id: "perm-csc-2",
					employeeId: 122,
					analytics: "view",
					procurement: "view",
					companies: "view",
					tasks: "view",
				},
			},
		],
	},
	{
		id: "company-supplier-fastener",
		name: "КрепёжОпт",
		industry: "Метизы и крепёжные изделия",
		website: "https://krepezhopt.example",
		description: "Болты, саморезы, дюбели, анкеры. Опт и розница.",
		preferredPayment: "Любая форма оплаты",
		preferredDelivery: "Доставка в день заказа по Москве",
		additionalComments: "",
		isMain: false,
		employeeCount: 1,
		procurementItemCount: 0,
		addresses: [
			{
				id: "addr-csf-warehouse",
				name: "Склад-магазин",
				type: "warehouse",
				postalCode: "109316",
				address: "г. Москва, Волгоградский проспект, д. 47",
				contactPerson: "Лебедев Максим",
				phone: "+74957700404",
				isMain: true,
			},
		],
		employees: [
			{
				id: 131,
				firstName: "Максим",
				lastName: "Лебедев",
				patronymic: "Алексеевич",
				position: "Менеджер опт. отдела",
				role: "admin",
				phone: "+79061234131",
				email: "lebedev@krepezhopt.example",
				isResponsible: true,
				permissions: {
					id: "perm-csf-1",
					employeeId: 131,
					analytics: "view",
					procurement: "edit",
					companies: "edit",
					tasks: "edit",
				},
			},
		],
	},
	{
		id: "company-supplier-plumb",
		name: "АкваПром",
		industry: "Сантехника и инженерные системы",
		website: "https://aquaprom.example",
		description: "Трубы ПНД, фитинги, радиаторы отопления, насосы.",
		preferredPayment: "Безналичный расчёт",
		preferredDelivery: "Доставка по согласованию",
		additionalComments: "",
		isMain: false,
		employeeCount: 2,
		procurementItemCount: 0,
		addresses: [
			{
				id: "addr-csa-office",
				name: "Офис",
				type: "office",
				postalCode: "127015",
				address: "г. Москва, ул. Бутырская, д. 77",
				contactPerson: "Григорьева Ирина",
				phone: "+74957700505",
				isMain: true,
			},
		],
		employees: [
			{
				id: 141,
				firstName: "Ирина",
				lastName: "Григорьева",
				patronymic: "Васильевна",
				position: "Менеджер по продажам",
				role: "admin",
				phone: "+79061234141",
				email: "grigoreva@aquaprom.example",
				isResponsible: true,
				permissions: {
					id: "perm-csa-1",
					employeeId: 141,
					analytics: "view",
					procurement: "edit",
					companies: "edit",
					tasks: "edit",
				},
			},
			{
				id: 142,
				firstName: "Денис",
				lastName: "Захаров",
				patronymic: "Олегович",
				position: "Инженер технической поддержки",
				role: "user",
				phone: "+79061234142",
				email: "zakharov@aquaprom.example",
				isResponsible: false,
				permissions: {
					id: "perm-csa-2",
					employeeId: 142,
					analytics: "none",
					procurement: "view",
					companies: "view",
					tasks: "view",
				},
			},
		],
	},
	{
		id: "company-customer-stroygrad",
		name: "СтройГрад",
		industry: "Заказчик: жилое строительство",
		website: "https://stroygrad.example",
		description: "Постоянный заказчик. Жилые комплексы эконом-класса.",
		preferredPayment: "Поэтапная оплата",
		preferredDelivery: "Доставка на объекты по Подмосковью",
		additionalComments: "",
		isMain: false,
		employeeCount: 1,
		procurementItemCount: 0,
		addresses: [
			{
				id: "addr-ccs-office",
				name: "Офис заказчика",
				type: "office",
				postalCode: "143005",
				address: "г. Одинцово, ул. Маршала Жукова, д. 16",
				contactPerson: "Тарасов Виктор",
				phone: "+74957700606",
				isMain: true,
			},
		],
		employees: [
			{
				id: 201,
				firstName: "Виктор",
				lastName: "Тарасов",
				patronymic: "Николаевич",
				position: "Главный инженер",
				role: "admin",
				phone: "+79061234201",
				email: "tarasov@stroygrad.example",
				isResponsible: true,
				permissions: {
					id: "perm-ccs-1",
					employeeId: 201,
					analytics: "view",
					procurement: "view",
					companies: "view",
					tasks: "view",
				},
			},
		],
	},
];

// --- Mutable store ---

let companiesStore: Company[] = [];

function cloneCompany(c: Company): Company {
	return {
		...c,
		addresses: c.addresses.map((a) => ({ ...a })),
		employees: c.employees.map((e) => ({ ...e, permissions: { ...e.permissions } })),
	};
}

function seedStore() {
	companiesStore = SEED_COMPANIES.map(cloneCompany);
}

seedStore();

export function _resetCompaniesStore(): void {
	seedStore();
}

export function _setCompanies(companies: Company[]): void {
	companiesStore = companies.map(cloneCompany);
}

export function _getCompanies(): Company[] {
	return companiesStore.map(cloneCompany);
}

// --- Internal helpers ---

function findCompanyIndex(id: string): number {
	return companiesStore.findIndex((c) => c.id === id);
}

function requireCompany(id: string): Company {
	const idx = findCompanyIndex(id);
	if (idx === -1) throw new Error(`Company ${id} not found`);
	return companiesStore[idx];
}

function toAddressSummary(a: Address): AddressSummary {
	return { id: a.id, name: a.name, type: a.type, address: a.address, isMain: a.isMain };
}

function responsibleEmployeeName(employees: Company["employees"]): string | null {
	const responsible = employees.find((e) => e.isResponsible);
	if (!responsible) return null;
	return `${responsible.lastName} ${responsible.firstName}`.trim();
}

function toSummary(c: Company): CompanySummary {
	return {
		id: c.id,
		name: c.name,
		isMain: c.isMain,
		responsibleEmployeeName: responsibleEmployeeName(c.employees),
		addresses: c.addresses.map(toAddressSummary),
		employeeCount: c.employees.length || c.employeeCount,
		procurementItemCount: c.procurementItemCount,
	};
}

type CompanySortFieldKey = "name" | "employeeCount" | "procurementItemCount";

function sortCompanies(items: Company[], field: CompanySortFieldKey, dir: "asc" | "desc"): Company[] {
	const mul = dir === "asc" ? 1 : -1;
	return [...items].sort((a, b) => {
		if (field === "name") return mul * a.name.localeCompare(b.name, "ru");
		if (field === "employeeCount")
			return mul * ((a.employees.length || a.employeeCount) - (b.employees.length || b.employeeCount));
		return mul * (a.procurementItemCount - b.procurementItemCount);
	});
}

// --- Mock API: companies list/detail ---

export interface FetchCompaniesParams {
	q?: string;
	sort?: string;
	dir?: string;
	cursor?: string;
	limit?: number;
}

export async function fetchCompaniesMock(params: FetchCompaniesParams): Promise<{
	companies: CompanySummary[];
	nextCursor: string | null;
}> {
	await delay();
	const q = params.q?.trim().toLowerCase();
	let filtered = companiesStore;
	if (q) filtered = filtered.filter((c) => c.name.toLowerCase().includes(q));
	if (params.sort) {
		filtered = sortCompanies(filtered, params.sort as CompanySortFieldKey, (params.dir ?? "asc") as "asc" | "desc");
	}
	const result = paginate({
		items: filtered,
		cursor: params.cursor,
		limit: params.limit,
		getId: (c) => c.id,
	});
	return { companies: result.items.map(toSummary), nextCursor: result.nextCursor };
}

export async function fetchCompanyMock(id: string): Promise<Company> {
	await delay();
	return cloneCompany(requireCompany(id));
}

// --- Mock API: company mutations ---

export interface UpdateCompanyData {
	name?: string;
	industry?: string;
	website?: string;
	description?: string;
	preferredPayment?: string;
	preferredDelivery?: string;
	additionalComments?: string;
}

export async function updateCompanyMock(id: string, data: UpdateCompanyData): Promise<Company> {
	await delay();
	const idx = findCompanyIndex(id);
	if (idx === -1) throw new Error(`Company ${id} not found`);
	companiesStore[idx] = { ...companiesStore[idx], ...data };
	return cloneCompany(companiesStore[idx]);
}

export async function deleteCompanyMock(id: string): Promise<void> {
	await delay();
	companiesStore = companiesStore.filter((c) => c.id !== id);
}

export interface CreateAddressData {
	name: string;
	type: Address["type"];
	postalCode: string;
	address: string;
	contactPerson: string;
	phone: string;
	isMain?: boolean;
}

export interface CreateCompanyPayload {
	name: string;
	industry?: string;
	website?: string;
	description?: string;
	preferredPayment?: string;
	preferredDelivery?: string;
	additionalComments?: string;
	address: CreateAddressData;
}

export async function createCompanyMock(data: CreateCompanyPayload): Promise<Company> {
	await delay();
	const newCompany: Company = {
		id: nextId("company"),
		name: data.name,
		industry: data.industry ?? "",
		website: data.website ?? "",
		description: data.description ?? "",
		preferredPayment: data.preferredPayment ?? "",
		preferredDelivery: data.preferredDelivery ?? "",
		additionalComments: data.additionalComments ?? "",
		isMain: false,
		employeeCount: 0,
		procurementItemCount: 0,
		addresses: [
			{
				id: nextId("addr"),
				name: data.address.name,
				type: data.address.type,
				postalCode: data.address.postalCode,
				address: data.address.address,
				contactPerson: data.address.contactPerson,
				phone: data.address.phone,
				isMain: data.address.isMain ?? true,
			},
		],
		employees: [],
	};
	companiesStore.push(newCompany);
	return cloneCompany(newCompany);
}

// --- Mock API: addresses ---

export interface UpdateAddressData {
	name?: string;
	type?: Address["type"];
	postalCode?: string;
	address?: string;
	contactPerson?: string;
	phone?: string;
	isMain?: boolean;
}

export async function createAddressMock(companyId: string, data: CreateAddressData): Promise<Address> {
	await delay();
	const company = requireCompany(companyId);
	const newAddress: Address = {
		id: nextId("addr"),
		name: data.name,
		type: data.type,
		postalCode: data.postalCode,
		address: data.address,
		contactPerson: data.contactPerson,
		phone: data.phone,
		isMain: data.isMain ?? false,
	};
	company.addresses.push(newAddress);
	return { ...newAddress };
}

export async function updateAddressMock(
	companyId: string,
	addressId: string,
	data: UpdateAddressData,
): Promise<Address> {
	await delay();
	const company = requireCompany(companyId);
	const idx = company.addresses.findIndex((a) => a.id === addressId);
	if (idx === -1) throw new Error(`Address ${addressId} not found in company ${companyId}`);
	company.addresses[idx] = { ...company.addresses[idx], ...data };
	return { ...company.addresses[idx] };
}

export async function deleteAddressMock(companyId: string, addressId: string): Promise<void> {
	await delay();
	const company = requireCompany(companyId);
	company.addresses = company.addresses.filter((a) => a.id !== addressId);
}

// --- Mock API: employees ---

export interface CreateEmployeeData {
	firstName: string;
	lastName: string;
	patronymic: string;
	position: string;
	role: Employee["role"];
	phone: string;
	email: string;
	isResponsible: boolean;
}

export interface UpdateEmployeeData {
	firstName?: string;
	lastName?: string;
	patronymic?: string;
	position?: string;
	role?: Employee["role"];
	phone?: string;
	email?: string;
	isResponsible?: boolean;
}

export interface UpdatePermissionsData {
	analytics?: PermissionLevel;
	procurement?: PermissionLevel;
	companies?: PermissionLevel;
	tasks?: PermissionLevel;
}

let employeeIdCounter = 1000;
function nextEmployeeId(): number {
	employeeIdCounter += 1;
	return employeeIdCounter;
}

export async function createEmployeeMock(
	companyId: string,
	data: CreateEmployeeData,
): Promise<Employee & { permissions: EmployeePermissions }> {
	await delay();
	const company = requireCompany(companyId);
	const id = nextEmployeeId();
	const employee: Employee & { permissions: EmployeePermissions } = {
		id,
		firstName: data.firstName,
		lastName: data.lastName,
		patronymic: data.patronymic,
		position: data.position,
		role: data.role,
		phone: data.phone,
		email: data.email,
		isResponsible: data.isResponsible,
		permissions: {
			id: nextId("perm"),
			employeeId: id,
			analytics: "none",
			procurement: "none",
			companies: "none",
			tasks: "none",
		},
	};
	company.employees.push(employee);
	return { ...employee, permissions: { ...employee.permissions } };
}

export async function updateEmployeeMock(
	companyId: string,
	employeeId: number,
	data: UpdateEmployeeData,
): Promise<Employee & { permissions: EmployeePermissions }> {
	await delay();
	const company = requireCompany(companyId);
	const idx = company.employees.findIndex((e) => e.id === employeeId);
	if (idx === -1) throw new Error(`Employee ${employeeId} not found in company ${companyId}`);
	company.employees[idx] = { ...company.employees[idx], ...data };
	const e = company.employees[idx];
	return { ...e, permissions: { ...e.permissions } };
}

export async function deleteEmployeeMock(companyId: string, employeeId: number): Promise<void> {
	await delay();
	const company = requireCompany(companyId);
	company.employees = company.employees.filter((e) => e.id !== employeeId);
}

export async function updateEmployeePermissionsMock(
	companyId: string,
	employeeId: number,
	data: UpdatePermissionsData,
): Promise<EmployeePermissions> {
	await delay();
	const company = requireCompany(companyId);
	const idx = company.employees.findIndex((e) => e.id === employeeId);
	if (idx === -1) throw new Error(`Employee ${employeeId} not found in company ${companyId}`);
	const updated = { ...company.employees[idx].permissions, ...data };
	company.employees[idx] = { ...company.employees[idx], permissions: updated };
	return { ...updated };
}
