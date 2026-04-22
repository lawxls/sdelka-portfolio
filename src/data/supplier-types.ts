import type { PaymentType } from "./types";

export type SupplierStatus = "new" | "кп_запрошено" | "переговоры" | "получено_кп" | "отказ" | "ошибка";

export const SUPPLIER_STATUSES: SupplierStatus[] = [
	"new",
	"кп_запрошено",
	"переговоры",
	"получено_кп",
	"отказ",
	"ошибка",
];

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
	new: "Кандидат",
	кп_запрошено: "Отправлено",
	переговоры: "Переговоры",
	получено_кп: "Получено КП",
	отказ: "Отказ",
	ошибка: "Ошибка",
};

export const SUPPLIER_STATUS_CONFIG: Record<SupplierStatus, { label: string; className: string }> = {
	new: {
		label: SUPPLIER_STATUS_LABELS.new,
		className: "text-muted-foreground",
	},
	кп_запрошено: {
		label: SUPPLIER_STATUS_LABELS.кп_запрошено,
		className: "text-violet-600 dark:text-violet-400",
	},
	переговоры: { label: SUPPLIER_STATUS_LABELS.переговоры, className: "text-blue-600 dark:text-blue-400" },
	получено_кп: {
		label: SUPPLIER_STATUS_LABELS.получено_кп,
		className: "text-green-600 dark:text-green-400",
	},
	отказ: { label: SUPPLIER_STATUS_LABELS.отказ, className: "text-destructive" },
	ошибка: { label: SUPPLIER_STATUS_LABELS.ошибка, className: "text-amber-600 dark:text-amber-400" },
};

/** Statuses that allow sending messages to the supplier */
export const COMPOSABLE_STATUSES: ReadonlySet<SupplierStatus> = new Set(["кп_запрошено", "переговоры", "получено_кп"]);

export type SupplierCompanyType = "производитель" | "дистрибьютор";

export const SUPPLIER_COMPANY_TYPES: SupplierCompanyType[] = ["производитель", "дистрибьютор"];

export const SUPPLIER_COMPANY_TYPE_LABELS: Record<SupplierCompanyType, string> = {
	производитель: "Производитель",
	дистрибьютор: "Дистрибьютор",
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

export type MessageEvent = "task_created" | "quote_received" | "refusal";

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

export interface Supplier {
	id: string;
	itemId: string;
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
	email: string;
	website: string;
	address: string;
	pricePerUnit: number | null;
	tco: number | null;
	rating: number | null;
	deliveryCost: number | null;
	paymentType: PaymentType;
	deferralDays: number;
	prepaymentPercent?: number;
	leadTimeDays: number | null;
	/** Supplier-level AI summary. Same for the same supplier across items. */
	agentComment: string;
	documents: SupplierDocument[];
	chatHistory: SupplierChatMessage[];
	/** ISO timestamp when the supplier's quote (КП) was received. Set only for `получено_кп`. */
	quoteReceivedAt?: string;
}

/** Cross-item quote card data for the supplier drawer's «Предложения» tab.
 * One entry per (supplier, item) where the supplier has `получено_кп` status. */
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
 * profile fields (inn, companyType, region, foundedYear, revenue) and
 * `quoteReceivedAt` are enriched deterministically at load time by the mock layer. */
export type SupplierSeed = Omit<
	Supplier,
	"inn" | "companyType" | "region" | "foundedYear" | "revenue" | "quoteReceivedAt"
>;
