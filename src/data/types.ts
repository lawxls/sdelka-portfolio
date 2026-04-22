import { formatRussianPlural } from "@/lib/format";

export type ProcurementStatus = "searching" | "negotiating" | "completed";

export const STATUS_LABELS: Record<ProcurementStatus, string> = {
	searching: "Ищем поставщиков",
	negotiating: "Ведём переговоры",
	completed: "Переговоры завершены",
};

export const UNITS = ["шт", "кг", "м", "л", "т", "м²", "м³", "уп", "комп", "рул"] as const;
export type Unit = (typeof UNITS)[number];

export type PaymentType = "prepayment" | "deferred";

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
	prepayment: "Предоплата",
	deferred: "Отсрочка",
};

export function formatPaymentType(
	type: PaymentType,
	opts: { deferralDays?: number; prepaymentPercent?: number } = {},
): string {
	if (type === "deferred") {
		return opts.deferralDays && opts.deferralDays > 0 ? `Отсрочка ${opts.deferralDays} дн.` : "Отсрочка";
	}
	const percent = opts.prepaymentPercent ?? 100;
	return percent !== 100 ? `Предоплата ${percent}%` : "Предоплата";
}

/** Long-form variant used by supplier quote surfaces (table + drawer card).
 * Differs from formatPaymentType: renders "Отсрочка 30 дней" (full plural) vs "Отсрочка 30 дн." (abbreviated). */
export function formatQuotePaymentType(
	paymentType: PaymentType,
	deferralDays: number,
	prepaymentPercent?: number,
): string {
	if (paymentType === "deferred") {
		if (deferralDays > 0) return `Отсрочка ${formatRussianPlural(deferralDays, ["день", "дня", "дней"])}`;
		return "Отсрочка";
	}
	return formatPaymentType("prepayment", { prepaymentPercent });
}

export type PaymentMethod = "bank_transfer" | "cash";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
	bank_transfer: "Р/С",
	cash: "Наличные",
};

export type DeliveryCostType = "free" | "paid" | "pickup";

export const DELIVERY_COST_TYPE_LABELS: Record<DeliveryCostType, string> = {
	free: "Бесплатная",
	paid: "Платная",
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

export interface CurrentSupplier {
	companyName: string;
	inn?: string;
	paymentType?: PaymentType;
	deferralDays: number;
	prepaymentPercent?: number;
	pricePerUnit: number | null;
}

export interface GeneratedAnswer {
	questionId: string;
	selectedOption?: string;
	freeText?: string;
}

export interface AttachedFile {
	name: string;
	size: number;
}

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
	taskCount?: number;
	description?: string;
	unit?: Unit;
	quantityPerDelivery?: number;
	paymentType?: PaymentType;
	prepaymentPercent?: number;
	paymentMethod?: PaymentMethod;
	deliveryCostType?: DeliveryCostType;
	deliveryCost?: number;
	deliveryAddresses?: string[];
	unloading?: UnloadingType;
	analoguesAllowed?: boolean;
	sampleRequired?: boolean;
	deferralRequired?: boolean;
	additionalInfo?: string;
	currentSupplier?: CurrentSupplier;
	generatedAnswers?: GeneratedAnswer[];
	attachedFiles?: AttachedFile[];
	searchCompleted?: boolean;
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
	folderId?: string | null;
	description?: string;
	unit?: Unit;
	annualQuantity?: number;
	quantityPerDelivery?: number;
	currentPrice?: number;
	paymentType?: PaymentType;
	prepaymentPercent?: number;
	paymentMethod?: PaymentMethod;
	deliveryCostType?: DeliveryCostType;
	deliveryCost?: number;
	deliveryAddresses?: string[];
	unloading?: UnloadingType;
	analoguesAllowed?: boolean;
	sampleRequired?: boolean;
	deferralRequired?: boolean;
	additionalInfo?: string;
	currentSupplier?: CurrentSupplier;
	generatedAnswers?: GeneratedAnswer[];
	attachedFiles?: AttachedFile[];
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

export type EmployeeRole = "owner" | "admin" | "user";

export const ROLE_LABELS: Record<EmployeeRole, string> = {
	owner: "Владелец",
	admin: "Администратор",
	user: "Пользователь",
};

export const PRIVILEGED_ROLES: ReadonlySet<EmployeeRole> = new Set(["admin", "owner"]);

export const ASSIGNABLE_ROLES: EmployeeRole[] = ["admin", "user"];

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
	employeeId: number;
	analytics: PermissionLevel;
	procurement: PermissionLevel;
	companies: PermissionLevel;
	tasks: PermissionLevel;
}

export interface Employee {
	id: number;
	firstName: string;
	lastName: string;
	patronymic: string;
	position: string;
	role: EmployeeRole;
	phone: string;
	email: string;
	isResponsible: boolean;
	registeredAt?: string | null;
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
	responsibleEmployeeName: string | null;
	addresses: AddressSummary[];
	employeeCount: number;
	procurementItemCount: number;
}

export type CompanySortField = "name" | "employeeCount" | "procurementItemCount";

export interface CompanySortState {
	field: CompanySortField;
	direction: SortDirection;
}
