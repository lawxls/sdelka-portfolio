import type { PaymentType } from "./types";

export type SupplierStatus = "new" | "quote_requested" | "negotiating" | "quote_received" | "refused" | "error";

export const SUPPLIER_STATUSES: SupplierStatus[] = [
	"new",
	"quote_requested",
	"negotiating",
	"quote_received",
	"refused",
	"error",
];

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
	new: "Кандидат",
	quote_requested: "Отправлено",
	negotiating: "Переговоры",
	quote_received: "Получено КП",
	refused: "Отказ",
	error: "Ошибка",
};

export const SUPPLIER_STATUS_CONFIG: Record<SupplierStatus, { label: string; className: string }> = {
	new: {
		label: SUPPLIER_STATUS_LABELS.new,
		className: "text-muted-foreground",
	},
	quote_requested: {
		label: SUPPLIER_STATUS_LABELS.quote_requested,
		className: "text-violet-600 dark:text-violet-400",
	},
	negotiating: { label: SUPPLIER_STATUS_LABELS.negotiating, className: "text-blue-600 dark:text-blue-400" },
	quote_received: {
		label: SUPPLIER_STATUS_LABELS.quote_received,
		className: "text-green-600 dark:text-green-400",
	},
	refused: { label: SUPPLIER_STATUS_LABELS.refused, className: "text-destructive" },
	error: { label: SUPPLIER_STATUS_LABELS.error, className: "text-amber-600 dark:text-amber-400" },
};

/** Statuses that allow sending messages to the supplier */
export const COMPOSABLE_STATUSES: ReadonlySet<SupplierStatus> = new Set([
	"quote_requested",
	"negotiating",
	"quote_received",
	"refused",
]);

export type SupplierCompanyType = "manufacturer" | "distributor";

export const SUPPLIER_COMPANY_TYPES: SupplierCompanyType[] = ["manufacturer", "distributor"];

export const SUPPLIER_COMPANY_TYPE_LABELS: Record<SupplierCompanyType, string> = {
	manufacturer: "Производитель",
	distributor: "Дистрибьютор",
};

export interface SupplierDocument {
	name: string;
	type: string;
	size: number;
}

export interface MessageAttachment {
	name: string;
	type: string;
	size: number;
}

export function filesToAttachments(files: File[]): MessageAttachment[] {
	return files.map((f) => ({ name: f.name, type: f.name.split(".").pop() ?? "", size: f.size }));
}

export type MessageEvent = "task_created" | "quote_received" | "refusal" | "delivery_failed";

export interface SupplierChatMessage {
	sender: string;
	senderEmail?: string;
	timestamp: string;
	body: string;
	isOurs: boolean;
	attachments?: MessageAttachment[];
	/** Status/event badges rendered inline with the message (supplier-only). */
	events?: MessageEvent[];
}

/** Fallback email shown next to «Агент» when a message doesn't carry an explicit sender email. */
export const AGENT_EMAIL = "agent@sdelka.ru";

export type SupplierSortField =
	| "companyName"
	| "tco"
	| "batchCost"
	| "savings"
	| "leadTimeDays"
	| "foundedYear"
	| "revenue";
export type SupplierSortState = { field: SupplierSortField; direction: "asc" | "desc" } | null;

export interface SupplierFilterParams {
	search?: string;
	statuses?: SupplierStatus[];
	companyTypes?: SupplierCompanyType[];
	showArchived?: boolean;
	sort?: SupplierSortField;
	dir?: "asc" | "desc";
	cursor?: string;
	limit?: number;
}

/** Stable cross-item identity for a supplier company. ИНН is authoritative
 * when present; companyName is the fallback for legacy/seed rows. */
export function supplierIdentity(s: { inn: string; companyName: string }): string {
	return s.inn || s.companyName;
}

export interface Supplier {
	id: string;
	/** Owning procurement inquiry. Required — suppliers always belong to one inquiry. */
	procurementInquiryId: string;
	/** Owning item, when the supplier is attached to a specific position.
	 * Inquiry-scoped candidates added via «Добавить поставщика» leave this undefined. */
	itemId?: string;
	companyName: string;
	status: SupplierStatus;
	archived: boolean;
	/** Company INN (tax ID) — 10 digits for legal entities. */
	inn: string;
	companyType: SupplierCompanyType;
	region: string;
	foundedYear: number;
	/** Annual revenue in rubles. */
	revenue: number;
	/** Headcount. */
	employeeCount: number;
	email: string;
	website: string;
	address: string;
	/** Russian 6-digit postal code. Enriched deterministically at load time. */
	postalCode: string;
	pricePerUnit: number | null;
	tco: number | null;
	deliveryCost: number | null;
	paymentType: PaymentType;
	deferralDays: number;
	prepaymentPercent?: number;
	leadTimeDays: number | null;
	/** Supplier-level AI summary. Same for the same supplier across items. */
	agentComment: string;
	documents: SupplierDocument[];
	chatHistory: SupplierChatMessage[];
	/** ISO timestamp when the supplier's quote (КП) was received. Set only for `quote_received`. */
	quoteReceivedAt?: string;
}

/** Cross-item quote card data for the supplier drawer's «Предложения» tab.
 * One entry per (supplier, item) where the supplier has `quote_received` status. */
export interface SupplierQuote {
	itemId: string;
	itemName: string;
	pricePerUnit: number | null;
	tco: number | null;
	deliveryCost: number | null;
	deferralDays: number;
	paymentType: import("./types").PaymentType;
	prepaymentPercent?: number;
	leadTimeDays: number | null;
	quoteReceivedAt?: string;
	documents: SupplierDocument[];
	isCurrentSupplier: boolean;
	/** Derived: pricePerUnit × quantityPerDelivery. Null when either input missing. */
	batchCost: number | null;
	/** Derived: savings in ₽ vs the item's current supplier (currentCost − supplierCost).
	 * Positive = we save, negative = we overpay. Null when supplier is the incumbent or data is missing. */
	savingsRub: number | null;
	/** Derived: same comparison as `savingsRub`, expressed as %. */
	savingsPct: number | null;
}

/** Shape for hand-authored Supplier seeds — identity/offer fields required;
 * profile fields (inn, companyType, region, postalCode, foundedYear, revenue, employeeCount),
 * `procurementInquiryId` (derived from `itemId`), and `quoteReceivedAt` are enriched
 * deterministically at load time by the mock layer. */
export type SupplierSeed = Omit<
	Supplier,
	| "inn"
	| "companyType"
	| "region"
	| "postalCode"
	| "foundedYear"
	| "revenue"
	| "employeeCount"
	| "quoteReceivedAt"
	| "procurementInquiryId"
> & { itemId: string };
