export type ProcurementStatus = "searching" | "negotiating" | "completed";

export const STATUS_LABELS: Record<ProcurementStatus, string> = {
	searching: "Ведём переговоры",
	negotiating: "Ищем поставщиков",
	completed: "Переговоры завершены",
};

export interface ProcurementItem {
	id: string;
	name: string;
	status: ProcurementStatus;
	annualQuantity: number;
	currentPrice: number;
	bestPrice: number | null;
	averagePrice: number | null;
	folderId: string | null;
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

export interface PageInfo {
	currentPage: number;
	totalPages: number;
	pageSize: number;
}

export interface Totals {
	totalDeviation: number;
	totalOverpayment: number;
	totalSavings: number;
	itemCount: number;
}

export interface ProcurementDataParams {
	items?: ProcurementItem[];
	search: string;
	filters: FilterState;
	sort: SortState | null;
	page: number;
	pageSize: number;
	folder?: string;
}

export interface ProcurementDataResult {
	items: ProcurementItem[];
	totalItems: number;
	totals: Totals;
	pageInfo: PageInfo;
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
