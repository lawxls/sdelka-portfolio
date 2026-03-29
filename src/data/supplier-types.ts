export type SupplierStatus = "письмо_не_отправлено" | "ждем_ответа" | "переговоры" | "получено_кп" | "отказ";

export const SUPPLIER_STATUSES: SupplierStatus[] = [
	"письмо_не_отправлено",
	"ждем_ответа",
	"переговоры",
	"получено_кп",
	"отказ",
];

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
	письмо_не_отправлено: "Письмо не отправлено",
	ждем_ответа: "Ждём ответа",
	переговоры: "Переговоры",
	получено_кп: "Получено КП",
	отказ: "Отказ",
};

export interface SupplierDocument {
	name: string;
	type: string;
	size: number;
}

export interface SupplierChatMessage {
	sender: string;
	timestamp: string;
	body: string;
	isOurs: boolean;
}

export interface SupplierPositionOffer {
	name: string;
	quantity: number;
	pricePerUnit: number;
	total: number;
}

export type SupplierSortField = "companyName" | "pricePerUnit" | "tco" | "rating";
export type SupplierSortState = { field: SupplierSortField; direction: "asc" | "desc" } | null;

export interface SupplierFilterParams {
	search?: string;
	statuses?: SupplierStatus[];
	sort?: SupplierSortField;
	dir?: "asc" | "desc";
}

export interface Supplier {
	id: string;
	itemId: string;
	companyName: string;
	status: SupplierStatus;
	email: string;
	website: string;
	address: string;
	pricePerUnit: number | null;
	tco: number | null;
	rating: number | null;
	deliveryCost: number;
	deferralDays: number;
	aiComment: string;
	documents: SupplierDocument[];
	chatHistory: SupplierChatMessage[];
	positionOffers: SupplierPositionOffer[];
}
