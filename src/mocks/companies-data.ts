import type { Address, Company, CompanySummary, Employee, EmployeePermissions } from "@/data/types";

const MOCK_ADDRESSES: Address[] = [
	{
		id: "addr-detail-1",
		name: "Главный офис",
		type: "office",
		postalCode: "123456",
		address: "г. Москва, ул. Ленина, д. 15, оф. 301",
		contactPerson: "Иванов",
		phone: "+71234567890",
		isMain: true,
	},
	{
		id: "addr-detail-2",
		name: "Склад №1",
		type: "warehouse",
		postalCode: "654321",
		address: "Московская обл., г. Подольск, ул. Складская, д. 10",
		contactPerson: "Петров",
		phone: "+79876543210",
		isMain: false,
	},
];

const MOCK_EMPLOYEES: (Employee & { permissions: EmployeePermissions })[] = [
	{
		id: 1,
		firstName: "Иван",
		lastName: "Иванов",
		patronymic: "Иванович",
		position: "Директор",
		role: "admin",
		phone: "+71234567890",
		email: "ivan@example.com",
		isResponsible: true,
		permissions: {
			id: "perm-1",
			employeeId: 1,
			analytics: "edit",
			procurement: "edit",
			companies: "edit",
			tasks: "edit",
		},
	},
	{
		id: 2,
		firstName: "Пётр",
		lastName: "Петров",
		patronymic: "Петрович",
		position: "Менеджер",
		role: "user",
		phone: "+79001234567",
		email: "petr@example.com",
		isResponsible: false,
		permissions: {
			id: "perm-2",
			employeeId: 2,
			analytics: "none",
			procurement: "view",
			companies: "none",
			tasks: "none",
		},
	},
];

function makeCompanySummary(id: string, overrides: Partial<CompanySummary> = {}): CompanySummary {
	return {
		id,
		name: `Company ${id}`,
		isMain: false,
		responsibleEmployeeName: "Иванов Иван",
		addresses: [
			{ id: `addr-${id}`, name: "Офис", type: "office", address: "г. Москва, ул. Тестовая, д. 1", isMain: true },
		],
		employeeCount: 5,
		procurementItemCount: 10,
		...overrides,
	};
}

function makeCompanyDetail(id: string, overrides: Partial<Company> = {}): Company {
	return {
		id,
		name: `Company ${id}`,
		industry: "",
		website: "",
		description: "",
		preferredPayment: "",
		preferredDelivery: "",
		additionalComments: "",
		isMain: false,
		employeeCount: 5,
		procurementItemCount: 10,
		addresses: [
			{
				id: `addr-${id}`,
				name: "Офис",
				type: "office",
				postalCode: "123456",
				address: "г. Москва, ул. Тестовая, д. 1",
				contactPerson: "Иванов",
				phone: "+71234567890",
				isMain: true,
			},
		],
		employees: [
			{
				id: 1,
				firstName: "Иван",
				lastName: "Иванов",
				patronymic: "Иванович",
				position: "Директор",
				role: "admin",
				phone: "+71234567890",
				email: "ivan@example.com",
				isResponsible: true,
				permissions: {
					id: `perm-${id}`,
					employeeId: 1,
					analytics: "edit",
					procurement: "edit",
					companies: "edit",
					tasks: "edit",
				},
			},
		],
		...overrides,
	};
}

export let companyList: CompanySummary[] = [
	makeCompanySummary("company-1", {
		name: "Сделка",
		isMain: true,
		responsibleEmployeeName: "Иванов Иван",
		addresses: [
			{
				id: "addr-1",
				name: "Главный офис",
				type: "office",
				address: "г. Москва, ул. Ленина, д. 15, оф. 301",
				isMain: true,
			},
			{
				id: "addr-2",
				name: "Склад №1",
				type: "warehouse",
				address: "Московская обл., г. Подольск, ул. Складская, д. 10",
				isMain: false,
			},
			{
				id: "addr-3",
				name: "Цех",
				type: "production",
				address: "Московская обл., г. Химки, ул. Промышленная, д. 5",
				isMain: false,
			},
		],
		employeeCount: 12,
		procurementItemCount: 25,
	}),
	makeCompanySummary("company-2", {
		name: "СтройМастер",
		responsibleEmployeeName: "Петров Пётр",
		addresses: [
			{
				id: "addr-4",
				name: "Центральный",
				type: "warehouse",
				address: "г. Казань, ул. Центральная, д. 3",
				isMain: true,
			},
		],
		employeeCount: 5,
		procurementItemCount: 0,
	}),
	makeCompanySummary("company-3", {
		name: "ТехноСервис",
		responsibleEmployeeName: "Сидоров Алексей",
		addresses: [
			{
				id: "addr-5",
				name: "Головной",
				type: "office",
				address: "г. Новосибирск, пр. Мира, д. 20, оф. 5",
				isMain: true,
			},
			{
				id: "addr-6",
				name: "Запасной",
				type: "warehouse",
				address: "г. Новосибирск, ул. Запасная, д. 8",
				isMain: false,
			},
		],
		employeeCount: 8,
		procurementItemCount: 15,
	}),
];

const companyDetails = new Map<string, Company>();

companyDetails.set(
	"company-1",
	makeCompanyDetail("company-1", {
		name: "Сделка",
		isMain: true,
		industry: "Технологии",
		website: "https://sdelka.ai",
		description: "Платформа для закупок",
		preferredPayment: "Безналичный расчёт",
		preferredDelivery: "Курьером",
		additionalComments: "Важный клиент",
		employeeCount: 12,
		procurementItemCount: 25,
		addresses: MOCK_ADDRESSES,
		employees: MOCK_EMPLOYEES,
	}),
);

export function getCompanyDetail(id: string): Company | undefined {
	if (companyDetails.has(id)) return companyDetails.get(id);
	const summary = companyList.find((c) => c.id === id);
	if (!summary) return undefined;
	const detail = makeCompanyDetail(id, { name: summary.name, isMain: summary.isMain });
	companyDetails.set(id, detail);
	return detail;
}

export function setCompanyDetail(id: string, detail: Company) {
	companyDetails.set(id, detail);
}

export function addCompanyToList(summary: CompanySummary) {
	companyList = [...companyList, summary];
}

export function removeCompanyFromList(id: string) {
	companyList = companyList.filter((c) => c.id !== id);
}
