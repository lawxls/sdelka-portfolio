import { formatRussianPlural } from "@/lib/format";

export type ProcurementStatus = "searching" | "negotiating" | "completed";

/** Derived visual status. "searching_completed" is not a stored status —
 * it's the display state for `status: "searching"` items whose `searchCompleted` flag is set. */
export type DisplayStatus = ProcurementStatus | "searching_completed";

/** Tender display status — pure rollup of item DisplayStatus across one tender.
 * Same vocabulary as items, no separate transition UI. */
export type TenderStatus = DisplayStatus;

export const STATUS_LABELS: Record<DisplayStatus, string> = {
	searching: "Ищем поставщиков",
	searching_completed: "Поиск поставщиков завершён",
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
	/** Parent tender slug. Items belong to exactly one tender. Company, folder,
	 * current supplier, and all shared step1 meta live on the parent tender. */
	tenderId?: string;
	description?: string;
	unit?: Unit;
	quantityPerDelivery?: number;
	paymentType?: PaymentType;
	prepaymentPercent?: number;
	deliveryCostType?: DeliveryCostType;
	deliveryCost?: number;
	generatedAnswers?: GeneratedAnswer[];
	searchCompleted?: boolean;
}

/** Тендер — primary procurement container that bundles a 1:N collection of
 * `ProcurementItem`s sharing one budget, deadline, company, and category.
 * Slug `id` (e.g. `T-001`) doubles as URL param. */
export interface ProcurementInquiry {
	id: string;
	name: string;
	companyId: string;
	folderId: string | null;
	/** Budget cap in ₽ (free-form integer; not a derived sum of item prices). */
	budget: number;
	/** Required deadline ISO date (YYYY-MM-DD or full ISO). */
	deadline: string;
	createdAt: string;
	currentSupplier?: CurrentSupplier;
	addressIds?: string[];
	unloading?: UnloadingType;
	paymentMethod?: PaymentMethod;
	deferralRequired?: boolean;
	sampleRequired?: boolean;
	analoguesAllowed?: boolean;
	additionalInfo?: string;
	attachedFiles?: AttachedFile[];
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
export type StatusFilter = DisplayStatus | "all";

/** Visual status for an item — folds `searchCompleted` into a dedicated value
 * so the status badge and filter dropdown share one vocabulary. */
export function getDisplayStatus(item: Pick<ProcurementItem, "status" | "searchCompleted">): DisplayStatus {
	if (item.status === "searching" && item.searchCompleted) return "searching_completed";
	return item.status;
}

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
	quantityPerDelivery?: number;
	currentPrice?: number;
	paymentType?: PaymentType;
	prepaymentPercent?: number;
	deliveryCostType?: DeliveryCostType;
	deliveryCost?: number;
	generatedAnswers?: GeneratedAnswer[];
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

export type EmployeeRole = "admin" | "user";

export const ROLE_LABELS: Record<EmployeeRole, string> = {
	admin: "Администратор",
	user: "Пользователь",
};

export const PRIVILEGED_ROLES: ReadonlySet<EmployeeRole> = new Set(["admin"]);

export const ASSIGNABLE_ROLES: EmployeeRole[] = ["admin", "user"];

export interface Address {
	id: string;
	name: string;
	address: string;
	phone: string;
	isMain: boolean;
}

export type PermissionLevel = "none" | "view" | "edit";

export const PERMISSION_MODULE_KEYS = ["tenders", "positions", "tasks", "companies", "employees", "emails"] as const;
export type PermissionModuleKey = (typeof PERMISSION_MODULE_KEYS)[number];

export const PERMISSION_MODULE_LABELS: Record<PermissionModuleKey, string> = {
	tenders: "Тендеры",
	positions: "Позиции",
	tasks: "Задачи",
	companies: "Компании",
	employees: "Сотрудники",
	emails: "Почты",
};

export interface EmployeePermissions {
	id: string;
	employeeId: number;
	tenders: PermissionLevel;
	positions: PermissionLevel;
	tasks: PermissionLevel;
	companies: PermissionLevel;
	employees: PermissionLevel;
	emails: PermissionLevel;
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
	registeredAt?: string | null;
}

export interface Company {
	id: string;
	name: string;
	website: string;
	description: string;
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
	address: string;
	isMain: boolean;
}

export interface CompanySummary {
	id: string;
	name: string;
	isMain: boolean;
	addresses: AddressSummary[];
	employeeCount: number;
	procurementItemCount: number;
}

export type CompanySortField = "name" | "employeeCount" | "procurementItemCount";

export interface CompanySortState {
	field: CompanySortField;
	direction: SortDirection;
}
