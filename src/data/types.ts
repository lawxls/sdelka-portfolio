import { formatRussianPlural } from "@/lib/format";

export type ProcurementStatus = "searching" | "negotiating" | "completed" | "ready_for_analytics";

/** Derived visual status. "searching_completed" is not a stored status —
 * it's the display state for `status: "searching"` items whose `searchCompleted` flag is set. */
export type DisplayStatus = ProcurementStatus | "searching_completed";

/** ProcurementInquiry status — stored on the backend (`InquiryStatus` choices),
 * independent of the per-item `DisplayStatus`. */
export type ProcurementInquiryStatus = "searching" | "searching_completed" | "negotiating" | "completed";

export const STATUS_LABELS: Record<DisplayStatus, string> = {
	searching: "Ищем поставщиков",
	searching_completed: "Поиск поставщиков завершён",
	negotiating: "Ведём переговоры",
	completed: "Переговоры завершены",
	ready_for_analytics: "Готово к аналитике",
};

/** ProcurementInquiry statuses while suppliers are still being sourced — RFQ email/auto-send
 * are still tunable here; once negotiations begin, the email is locked. */
export const RFQ_EDITABLE_STATUSES: ReadonlySet<ProcurementInquiryStatus> = new Set([
	"searching",
	"searching_completed",
]);

/** Item statuses that can be imported into a fresh inquiry via «Выбрать позиции». */
export const PICKABLE_ITEM_STATUSES: ReadonlySet<ProcurementStatus> = new Set(["ready_for_analytics", "completed"]);

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

export interface CurrentSupplier {
	companyName: string;
	inn?: string;
	website?: string;
	address?: string;
	email?: string;
	paymentType?: PaymentType;
	deferralDays: number;
	prepaymentPercent?: number;
	pricePerUnit: number | null;
	/** Supplier's delivery cost. `null` means «Включена» (rolled into price). */
	deliveryCost?: number | null;
	leadTimeDays?: number | null;
}

/** A clarifying question + chosen answer persisted on a procurement inquiry.
 * Created via the wizard's Step 2 preview flow and re-rendered on the
 * inquiry detail page. `answer === ""` means the buyer skipped the question
 * — preserve that signal rather than dropping the row. */
export interface ProcurementInquiryGeneratedQuestion {
	id: string;
	questionText: string;
	suggests: string[];
	answer: string;
}

export interface ProcurementItem {
	id: string;
	name: string;
	status: ProcurementStatus;
	annualQuantity: number;
	currentPrice: number | null;
	bestPrice: number | null;
	averagePrice: number | null;
	/** Parent inquiry slug. Items belong to exactly one inquiry. */
	procurementInquiryId?: string;
	description?: string;
	unit?: Unit;
	quantityPerDelivery?: number;
	paymentType?: PaymentType;
	prepaymentPercent?: number;
	deliveryCostType?: DeliveryCostType;
	deliveryCost?: number;
	/** Optional «Текущий поставщик» captured for this position. Drives the «Ваш поставщик»
	 * pinned row in supplier tables and seeds `currentPrice` when set. */
	currentSupplier?: CurrentSupplier;
	searchCompleted?: boolean;
}

/** Запрос — primary procurement container that bundles a 1:N collection of
 * `ProcurementItem`s sharing one deadline, company, and category. Mirrors the
 * Django `ProcurementInquirySerializer` 1:1 (camelCase wire format). */
export interface ProcurementInquiry {
	id: string;
	name: string;
	companyId: string;
	folderId: string | null;
	copySuppliersFromInquiryId: string | null;
	status: ProcurementInquiryStatus;
	/** Bid-collection deadline (ISO date YYYY-MM-DD). Nullable on the backend. */
	deadline: string | null;
	additionalInfo: string;
	deliveryAddressId: string | null;
	unloading: UnloadingType | "";
	analoguesNotAllowed: boolean;
	cashAllowed: boolean;
	emailSubject: string;
	emailBody: string;
	sendRequestsAutomatically: boolean;
	isArchived: boolean;
	kpCount: number;
	positionsCount: number;
	tasksCount: number;
	suppliersCount: number;
	createdAt: string;
	updatedAt: string;
	/** Present only on retrieve responses; the list endpoint omits items to
	 * keep payloads lean. Use `useProcurementInquiry(id).data?.items` for the
	 * detail page; positions on the list view come from `positionsCount`. */
	items?: ProcurementItem[];
	/** Step 2 clarifying questions captured during inquiry creation. Present on
	 * retrieve responses (the list endpoint omits them); defaults to `[]` on
	 * domain rows derived from a list fetch. */
	generatedQuestions: ProcurementInquiryGeneratedQuestion[];
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
	/** Owning company. Required by the backend: every position belongs to exactly
	 * one company. The manual-add flow threads the page-level company filter
	 * here; `createProcurementInquiryWithItems` threads the inquiry's company. */
	companyId: string;
	description?: string;
	unit?: Unit;
	annualQuantity?: number;
	quantityPerDelivery?: number;
	currentPrice?: number;
	paymentType?: PaymentType;
	prepaymentPercent?: number;
	deliveryCostType?: DeliveryCostType;
	deliveryCost?: number;
	currentSupplier?: CurrentSupplier;
	/** Initial status. Defaults to "searching" when omitted. The manual-add flow on
	 * /positions sets this to "ready_for_analytics" so the position is immediately
	 * pickable in a future inquiry without going through supplier sourcing. */
	status?: ProcurementStatus;
	/** Parent inquiry slug. Set by `createProcurementInquiryWithItems` so the new items
	 * inherit company / folder / supplier context from the freshly-created
	 * inquiry. Direct callers (legacy import flows) leave it unset. */
	procurementInquiryId?: string;
}

/** Annual cost in ₽ = annualQuantity × currentPrice. Null when no current price recorded. */
export function getAnnualCost(item: ProcurementItem): number | null {
	if (item.currentPrice == null) return null;
	return item.annualQuantity * item.currentPrice;
}

/** Deviation % = (currentPrice - bestPrice) / bestPrice * 100. Null if no market data. */
export function getDeviation(item: ProcurementItem): number | null {
	if (item.bestPrice == null || item.currentPrice == null) return null;
	return ((item.currentPrice - item.bestPrice) / item.bestPrice) * 100;
}

/** Annual overpayment in ₽ = (currentPrice - bestPrice) * annualQuantity. Null if no market data. */
export function getOverpayment(item: ProcurementItem): number | null {
	if (item.bestPrice == null || item.currentPrice == null) return null;
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

export const PERMISSION_MODULE_KEYS = [
	"procurementInquiries",
	"positions",
	"tasks",
	"companies",
	"employees",
	"emails",
] as const;
export type PermissionModuleKey = (typeof PERMISSION_MODULE_KEYS)[number];

export const PERMISSION_MODULE_LABELS: Record<PermissionModuleKey, string> = {
	procurementInquiries: "Запросы",
	positions: "Позиции",
	tasks: "Вопросы",
	companies: "Компании",
	employees: "Сотрудники",
	emails: "Почты",
};

export interface EmployeePermissions {
	id: string;
	employeeId: string;
	procurementInquiries: PermissionLevel;
	positions: PermissionLevel;
	tasks: PermissionLevel;
	companies: PermissionLevel;
	employees: PermissionLevel;
	emails: PermissionLevel;
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
	addressesCount: number;
	createdAt: string;
	updatedAt: string;
	addresses: Address[];
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
	addressesCount: number;
	employeeCount: number;
	procurementItemCount: number;
	createdAt: string;
	updatedAt: string;
}

export type CompanySortField = "name" | "employeeCount" | "procurementItemCount" | "createdAt";

export interface CompanySortState {
	field: CompanySortField;
	direction: SortDirection;
}
