import type { PaymentType } from "./types";

export type SupplierStatus = "письмо_отправлено" | "переговоры" | "получено_кп" | "отказ";

export const SUPPLIER_STATUSES: SupplierStatus[] = ["письмо_отправлено", "переговоры", "получено_кп", "отказ"];

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
	письмо_отправлено: "Письмо отправлено",
	переговоры: "Переговоры",
	получено_кп: "Получено КП",
	отказ: "Отказ",
};

export const SUPPLIER_STATUS_CONFIG: Record<SupplierStatus, { label: string; className: string }> = {
	письмо_отправлено: {
		label: SUPPLIER_STATUS_LABELS.письмо_отправлено,
		className: "text-violet-600 dark:text-violet-400",
	},
	переговоры: { label: SUPPLIER_STATUS_LABELS.переговоры, className: "text-blue-600 dark:text-blue-400" },
	получено_кп: {
		label: SUPPLIER_STATUS_LABELS.получено_кп,
		className: "text-green-600 dark:text-green-400",
	},
	отказ: { label: SUPPLIER_STATUS_LABELS.отказ, className: "text-destructive" },
};

/** Statuses that allow sending messages to the supplier */
export const COMPOSABLE_STATUSES: ReadonlySet<SupplierStatus> = new Set([
	"письмо_отправлено",
	"переговоры",
	"получено_кп",
]);

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

export interface SupplierChatMessage {
	sender: string;
	timestamp: string;
	body: string;
	isOurs: boolean;
	attachments?: MessageAttachment[];
}

export interface SupplierPositionOffer {
	name: string;
	quantity: number;
	pricePerUnit: number;
	total: number;
}

export type SupplierSortField = "companyName" | "tco" | "batchCost" | "savings" | "leadTimeDays";
export type SupplierSortState = { field: SupplierSortField; direction: "asc" | "desc" } | null;

export interface SupplierFilterParams {
	search?: string;
	statuses?: SupplierStatus[];
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
	email: string;
	website: string;
	address: string;
	pricePerUnit: number | null;
	tco: number | null;
	rating: number | null;
	deliveryCost: number | null;
	paymentType: PaymentType;
	deferralDays: number;
	leadTimeDays: number | null;
	aiDescription: string;
	aiRecommendations: string;
	documents: SupplierDocument[];
	chatHistory: SupplierChatMessage[];
	positionOffers: SupplierPositionOffer[];
}
