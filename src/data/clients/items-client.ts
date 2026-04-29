import type {
	CreateItemsResult,
	CursorPage,
	ExportItemsParams,
	ListItemsParams,
	NewItemInput,
	ProcurementItem,
	Totals,
	TotalsParams,
	UpdateItemData,
} from "../domains/items";

/**
 * Public seam for the items domain. Implementations are in-memory (mock store)
 * or HTTP. Hooks pull this through context, so swapping adapters is a one-line
 * change in the composition root.
 */
export interface ItemsClient {
	list(params: ListItemsParams): Promise<CursorPage<ProcurementItem>>;
	listAll(): Promise<ProcurementItem[]>;
	totals(params: TotalsParams): Promise<Totals>;
	get(id: string): Promise<ProcurementItem>;
	create(inputs: NewItemInput[]): Promise<CreateItemsResult>;
	update(id: string, data: UpdateItemData): Promise<ProcurementItem>;
	delete(id: string): Promise<void>;
	archive(id: string, isArchived: boolean): Promise<ProcurementItem>;
	export(params: ExportItemsParams): Promise<{ blob: Blob; filename: string }>;
}
