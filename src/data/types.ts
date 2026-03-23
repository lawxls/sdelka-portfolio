export type ProcurementStatus = "searching" | "negotiating" | "completed";

export const STATUS_LABELS: Record<ProcurementStatus, string> = {
	searching: "Ищем поставщиков",
	negotiating: "Ведём переговоры",
	completed: "Переговоры завершены",
};

export const UNITS = ["шт", "кг", "м", "л", "т", "м²", "м³", "уп", "комп", "рул"] as const;
export type Unit = (typeof UNITS)[number];

export type LegalEntityMode = "incognito" | "company";

export const LEGAL_ENTITY_LABELS: Record<LegalEntityMode, string> = {
	incognito: "Инкогнито",
	company: "Компания",
};

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

export type ProcurementType = "one-time" | "regular";

export const PROCUREMENT_TYPE_LABELS: Record<ProcurementType, string> = {
	"one-time": "Разовая",
	regular: "Регулярная",
};

export type Frequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "biannual" | "on-demand";

export const FREQUENCY_LABELS: Record<Frequency, string> = {
	weekly: "Еженедельно",
	biweekly: "Раз в 2 недели",
	monthly: "Ежемесячно",
	quarterly: "Ежеквартально",
	biannual: "Раз в полгода",
	"on-demand": "По требованию",
};

export const FREQUENCIES = Object.keys(FREQUENCY_LABELS) as Frequency[];

export const PROCUREMENT_TYPES = Object.keys(PROCUREMENT_TYPE_LABELS) as ProcurementType[];
export const LEGAL_ENTITY_MODES = Object.keys(LEGAL_ENTITY_LABELS) as LegalEntityMode[];
export const PAYMENT_TYPES = Object.keys(PAYMENT_TYPE_LABELS) as PaymentType[];
export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];
export const DELIVERY_TYPES = Object.keys(DELIVERY_TYPE_LABELS) as DeliveryType[];
export const UNLOADING_TYPES = Object.keys(UNLOADING_LABELS) as UnloadingType[];

export interface ProcurementItem {
	id: string;
	name: string;
	status: ProcurementStatus;
	annualQuantity: number;
	currentPrice: number;
	bestPrice: number | null;
	averagePrice: number | null;
	folderId: string | null;
	description?: string;
	unit?: Unit;
	procurementType?: ProcurementType;
	frequency?: Frequency;
	legalEntityMode?: LegalEntityMode;
	legalEntityCompany?: string;
	paymentType?: PaymentType;
	paymentDeferralDays?: number;
	vatIncluded?: boolean;
	paymentMethod?: PaymentMethod;
	deliveryType?: DeliveryType;
	deliveryAddress?: string;
	unloading?: UnloadingType;
	analoguesAllowed?: boolean;
}

export interface Folder {
	id: string;
	name: string;
	color: string;
}

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
	procurementType?: ProcurementType;
	frequency?: Frequency;
	legalEntityMode?: LegalEntityMode;
	legalEntityCompany?: string;
	paymentType?: PaymentType;
	paymentDeferralDays?: number;
	vatIncluded?: boolean;
	paymentMethod?: PaymentMethod;
	deliveryType?: DeliveryType;
	deliveryAddress?: string;
	unloading?: UnloadingType;
	analoguesAllowed?: boolean;
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
