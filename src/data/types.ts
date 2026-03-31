export type ProcurementStatus = "awaiting_analytics" | "searching" | "negotiating" | "completed";

export const STATUS_LABELS: Record<ProcurementStatus, string> = {
	awaiting_analytics: "Ожидание аналитики",
	searching: "Ищем поставщиков",
	negotiating: "Ведём переговоры",
	completed: "Переговоры завершены",
};

export const UNITS = ["шт", "кг", "м", "л", "т", "м²", "м³", "уп", "комп", "рул"] as const;
export type Unit = (typeof UNITS)[number];

export type FrequencyPeriod = "week" | "month" | "quarter" | "half_year" | "year";

export const FREQUENCY_PERIOD_LABELS: Record<FrequencyPeriod, string> = {
	week: "Неделя",
	month: "Месяц",
	quarter: "Квартал",
	half_year: "Полгода",
	year: "Год",
};

export const FREQUENCY_PERIODS = Object.keys(FREQUENCY_PERIOD_LABELS) as FrequencyPeriod[];

export type PriceMonitoringPeriod = "quarter" | "half_year" | "year" | "on_demand";

export const PRICE_MONITORING_PERIOD_LABELS: Record<PriceMonitoringPeriod, string> = {
	quarter: "Квартал",
	half_year: "Полгода",
	year: "Год",
	on_demand: "По запросу",
};

export const PRICE_MONITORING_PERIODS = Object.keys(PRICE_MONITORING_PERIOD_LABELS) as PriceMonitoringPeriod[];

export type PaymentType = "prepayment" | "deferred";

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
	prepayment: "Предоплата",
	deferred: "Отсрочка",
};

export type PaymentMethod = "bank_transfer" | "cash";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
	bank_transfer: "Р/С",
	cash: "Наличные",
};

export type DeliveryType = "warehouse" | "pickup";

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
	warehouse: "До склада",
	pickup: "Самовывоз",
};

export type UnloadingType = "supplier" | "self";

export const UNLOADING_LABELS: Record<UnloadingType, string> = {
	supplier: "Силами поставщика",
	self: "Своими силами",
};

export const UNLOADING_TYPES = Object.keys(UNLOADING_LABELS) as UnloadingType[];
export const PAYMENT_TYPES = Object.keys(PAYMENT_TYPE_LABELS) as PaymentType[];
export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];
export const DELIVERY_TYPES = Object.keys(DELIVERY_TYPE_LABELS) as DeliveryType[];

export interface ProcurementItem {
	id: string;
	name: string;
	status: ProcurementStatus;
	annualQuantity: number;
	currentPrice: number;
	bestPrice: number | null;
	averagePrice: number | null;
	folderId: string | null;
	companyId: string;
	description?: string;
	unit?: Unit;
	frequencyCount?: number;
	frequencyPeriod?: FrequencyPeriod;
	hideCompanyInfo?: boolean;
	paymentType?: PaymentType;
	paymentDeferralDays?: number;
	paymentMethod?: PaymentMethod;
	deliveryType?: DeliveryType;
	deliveryAddress?: string;
	unloading?: UnloadingType;
	analoguesAllowed?: boolean;
	additionalInfo?: string;
	priceMonitoringPeriod?: PriceMonitoringPeriod;
}

export interface Folder {
	id: string;
	name: string;
	color: string;
}

export const FOLDER_NAME_MAX_LENGTH = 13;
export const ITEM_NAME_DISPLAY_MAX_LENGTH = 40;

export const FOLDER_COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "teal"] as const;

export type DeviationFilter = "all" | "overpaying" | "saving";
export type StatusFilter = ProcurementStatus | "all";

export interface FilterState {
	deviation: DeviationFilter;
	status: StatusFilter;
}

export type SortField = "annualCost" | "currentPrice" | "bestPrice" | "averagePrice" | "deviation" | "overpayment";
export type SortDirection = "asc" | "desc";

export interface SortState {
	field: SortField;
	direction: SortDirection;
}

export interface Totals {
	totalDeviation: number;
	totalOverpayment: number;
	totalSavings: number;
	itemCount: number;
}

export interface NewItemInput {
	name: string;
	description?: string;
	unit?: Unit;
	annualQuantity?: number;
	currentPrice?: number;
	frequencyCount?: number;
	frequencyPeriod?: FrequencyPeriod;
	hideCompanyInfo?: boolean;
	paymentType?: PaymentType;
	paymentDeferralDays?: number;
	paymentMethod?: PaymentMethod;
	deliveryType?: DeliveryType;
	deliveryAddress?: string;
	unloading?: UnloadingType;
	analoguesAllowed?: boolean;
	additionalInfo?: string;
	priceMonitoringPeriod?: PriceMonitoringPeriod;
}

/** Annual cost in ₽ = annualQuantity × currentPrice. */
export function getAnnualCost(item: ProcurementItem): number {
	return item.annualQuantity * item.currentPrice;
}

/** Deviation % = (currentPrice - bestPrice) / bestPrice * 100. Null if no market data. */
export function getDeviation(item: ProcurementItem): number | null {
	if (item.bestPrice == null) return null;
	return ((item.currentPrice - item.bestPrice) / item.bestPrice) * 100;
}

/** Annual overpayment in ₽ = (currentPrice - bestPrice) * annualQuantity. Null if no market data. */
export function getOverpayment(item: ProcurementItem): number | null {
	if (item.bestPrice == null) return null;
	return (item.currentPrice - item.bestPrice) * item.annualQuantity;
}

// --- Companies ---

export type AddressType = "warehouse" | "office" | "production";

export const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
	warehouse: "Склад",
	office: "Офис",
	production: "Производство",
};

export const ADDRESS_TYPES = Object.keys(ADDRESS_TYPE_LABELS) as AddressType[];

export type EmployeeRole = "admin" | "user";

export const ROLE_LABELS: Record<EmployeeRole, string> = {
	admin: "Администратор",
	user: "Пользователь",
};

export const ROLES = Object.keys(ROLE_LABELS) as EmployeeRole[];

export interface Address {
	id: string;
	name: string;
	type: AddressType;
	postalCode: string;
	address: string;
	contactPerson: string;
	phone: string;
	isMain: boolean;
}

export type PermissionLevel = "none" | "view" | "edit";

export interface EmployeePermissions {
	id: string;
	employeeId: string;
	analytics: PermissionLevel;
	procurement: PermissionLevel;
	companies: PermissionLevel;
	tasks: PermissionLevel;
}

export interface Employee {
	id: string;
	firstName: string;
	lastName: string;
	patronymic: string;
	position: string;
	role: EmployeeRole;
	phone: string;
	email: string;
	isResponsible: boolean;
}

export interface Company {
	id: string;
	name: string;
	industry: string;
	website: string;
	description: string;
	preferredPayment: string;
	preferredDelivery: string;
	additionalComments: string;
	isMain: boolean;
	employeeCount: number;
	procurementItemCount: number;
	addresses: Address[];
	employees: (Employee & { permissions: EmployeePermissions })[];
}

export interface AddressSummary {
	id: string;
	name: string;
	type: AddressType;
	address: string;
	isMain: boolean;
}

export interface CompanySummary {
	id: string;
	name: string;
	isMain: boolean;
	responsibleEmployeeName: string;
	addresses: AddressSummary[];
	employeeCount: number;
	procurementItemCount: number;
}

export type CompanySortField = "name" | "employeeCount" | "procurementItemCount";

export interface CompanySortState {
	field: CompanySortField;
	direction: SortDirection;
}
