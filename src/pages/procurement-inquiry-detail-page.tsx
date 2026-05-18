import { Archive, Ban, Check, ChevronRight, Mail, Pencil, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { AddSupplierDialog, type AddSupplierDraft } from "@/components/add-supplier-dialog";
import { AddSupplierPlaceholderCell, CurrentSupplierDialog, PlusTile } from "@/components/current-supplier-dialog";
import {
	DataTable,
	type DataTableColumn,
	type DataTablePlaceholderRow,
	type DataTableSort,
} from "@/components/data-table";
import { CardGrid, FieldCard, DetailSection as Section, ValueText } from "@/components/detail-section";
import { InlineRenameInput } from "@/components/inline-rename-input";
import { type DeliveryFilter, matchesDeliveryFilter, OffersTable } from "@/components/offers-table";
import { ProcurementStatusIcon, STATUS_CONFIG } from "@/components/procurement-card";
import {
	SUPPLIER_DRAWER_TABS,
	SupplierDetailDrawer,
	type SupplierDrawerTab,
} from "@/components/supplier-detail-drawer";
import { SuppliersTable } from "@/components/suppliers-table";
import { TaskCard } from "@/components/task-card";
import { TaskDrawer } from "@/components/task-drawer";
import { ToolbarSearch } from "@/components/toolbar-search";
import { Button } from "@/components/ui/button";
import { CheckboxBadge } from "@/components/ui/checkbox-badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
	buildCurrentSupplierDraft,
	buildCurrentSupplierFromDraft,
	type CurrentSupplierDraft,
} from "@/components/use-create-procurement-inquiry-form";
import {
	SUPPLIER_STATUSES,
	type Supplier,
	type SupplierCompanyType,
	type SupplierSortField,
	type SupplierSortState,
	type SupplierStatus,
	supplierIdentity,
} from "@/data/supplier-types";
import { STATUS_ICONS, type Task } from "@/data/task-types";
import type {
	Folder,
	PaymentType,
	ProcurementInquiry,
	ProcurementInquiryStatus,
	ProcurementItem,
	UnloadingType,
} from "@/data/types";
import { formatPaymentType, RFQ_EDITABLE_STATUSES, UNLOADING_LABELS } from "@/data/types";
import { useCompanyDetail } from "@/data/use-company-detail";
import { useFolders } from "@/data/use-folders";
import { useUpdateItemCurrentSupplier } from "@/data/use-items";
import { useProcurementInquiry, useUpdateProcurementInquiry } from "@/data/use-procurement-inquiries";
import {
	useAllSuppliers,
	useArchiveSuppliers,
	useCreateSupplier,
	useSendSupplierRequest,
	useSupplierById,
	useUnarchiveSuppliers,
} from "@/data/use-suppliers";
import { useTaskColumns, useUpdateTaskStatus } from "@/data/use-tasks";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
	formatCurrency,
	formatDayMonthShort,
	formatDayMonthShortTime,
	formatInteger,
	formatRussianPlural,
	formatShortDate,
	isOverdue,
} from "@/lib/format";
import { INQUIRIES_PATH } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

type ProcurementInquiryDetailTab = "suppliers" | "offers" | "tasks" | "details";

const TABS: { key: ProcurementInquiryDetailTab; label: string; mobileLabel?: string }[] = [
	{ key: "suppliers", label: "Поставщики" },
	{ key: "offers", label: "Предложения" },
	{ key: "tasks", label: "Вопросы" },
	{ key: "details", label: "Информация", mobileLabel: "Инфо" },
];

const DEFAULT_TAB: ProcurementInquiryDetailTab = "suppliers";
const VALID_TABS = new Set<string>(TABS.map((t) => t.key));
const VALID_SUPPLIER_TABS = new Set<string>(SUPPLIER_DRAWER_TABS);

function parseSupplierTab(param: string | null): SupplierDrawerTab {
	if (param && VALID_SUPPLIER_TABS.has(param)) return param as SupplierDrawerTab;
	return "info";
}

const CONSOLIDATED_PAGE_SIZE = 30;

/** Build pinned `Supplier` rows + a single consolidated «Добавить текущего поставщика»
 * placeholder when any item lacks a supplier. `pinnedIds` is the set of real rows
 * lifted out — callers filter the body list by it to avoid double-rendering. */
function usePinnedAndPlaceholderRows(
	items: readonly ProcurementItem[],
	dedupedSuppliers: readonly Supplier[],
	onAddSupplier: () => void,
) {
	return useMemo(() => {
		const byIdentity = new Map<string, Supplier>();
		for (const s of dedupedSuppliers) byIdentity.set(supplierIdentity(s), s);
		const pinnedList: Supplier[] = [];
		const pinned = new Set<string>();
		const seenIdentity = new Set<string>();
		let hasItemWithoutSupplier = false;
		for (const it of items) {
			const cs = it.currentSupplier;
			if (!cs) {
				hasItemWithoutSupplier = true;
				continue;
			}
			const identityKey = cs.inn ?? cs.companyName;
			if (!identityKey || seenIdentity.has(identityKey)) continue;
			const match = byIdentity.get(identityKey);
			if (match) {
				pinnedList.push(match);
				pinned.add(match.id);
				seenIdentity.add(identityKey);
			}
		}
		const placeholders: DataTablePlaceholderRow[] = hasItemWithoutSupplier
			? [
					{
						id: "add-current-supplier",
						onClick: onAddSupplier,
						content: <AddSupplierPlaceholderCell />,
					},
				]
			: [];
		return { pinnedSuppliers: pinnedList, placeholderPinnedRows: placeholders, pinnedIds: pinned };
	}, [dedupedSuppliers, items, onAddSupplier]);
}

/** Modal listing positions without a current supplier so the user can pick which
 * one to attach a supplier to. Opens before `CurrentSupplierDialog` when the
 * inquiry has more than one such position. */
function AddCurrentSupplierItemPicker({
	open,
	onOpenChange,
	items,
	onSelect,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: readonly ProcurementItem[];
	onSelect: (itemId: string) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[30rem]">
				<DialogHeader className="gap-1.5 pr-8">
					<DialogTitle className="text-balance">Выберите позицию</DialogTitle>
					<DialogDescription className="text-pretty">
						Выберите позицию для добавления текущего поставщика
					</DialogDescription>
				</DialogHeader>
				<ul className="-mx-1 flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto px-1">
					{items.map((it) => (
						<li key={it.id}>
							<button
								type="button"
								onClick={() => onSelect(it.id)}
								className="group flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-3 text-left transition-[background-color,border-color,scale] duration-150 ease-out hover:border-border hover:bg-muted/60 active:scale-[0.96] focus-visible:border-ring focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:scale-100"
							>
								<PlusTile size="md" />
								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-medium text-foreground">{it.name}</div>
									<div className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
										{formatInteger(it.annualQuantity)}
										{it.unit ? ` ${it.unit}` : ""}
										{" / год"}
									</div>
								</div>
								<ChevronRight
									aria-hidden="true"
									className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
								/>
							</button>
						</li>
					))}
				</ul>
			</DialogContent>
		</Dialog>
	);
}

/** Pipeline-priority rank used when collapsing duplicate supplier rows: the
 * row with the most-advanced status wins so a received-КП entry isn't shadowed
 * by a still-«Кандидат» row for the same company. */
const SUPPLIER_PIPELINE_RANK: Record<SupplierStatus, number> = {
	quote_received: 5,
	negotiating: 4,
	quote_requested: 3,
	error: 2,
	refused: 2,
	new: 1,
};

/** True when the supplier is attached to one of the inquiry's items, or directly
 * to the inquiry (added via «Добавить поставщика» without an item). */
function belongsToInquiry(s: Supplier, inquiryId: string, itemIds: ReadonlySet<string>): boolean {
	return (s.itemId != null && itemIds.has(s.itemId)) || s.procurementInquiryId === inquiryId;
}

/** The consolidated tabs render a flat list of suppliers but mutations dispatch
 * per-item (Supplier.itemId carries the source). Group selected ids by their
 * source item before firing one mutation per item. Inquiry-scoped suppliers
 * (no itemId) are silently skipped — item-keyed mutations don't apply to them. */
function groupSupplierIdsByItem(rows: readonly Supplier[], ids: readonly string[]): Map<string, string[]> {
	const byId = new Map(rows.map((s) => [s.id, s]));
	const byItem = new Map<string, string[]>();
	for (const id of ids) {
		const sup = byId.get(id);
		if (!sup || !sup.itemId) continue;
		const arr = byItem.get(sup.itemId) ?? [];
		arr.push(id);
		byItem.set(sup.itemId, arr);
	}
	return byItem;
}

function parseProcurementInquiryTab(param: string | null): ProcurementInquiryDetailTab {
	if (param && VALID_TABS.has(param)) return param as ProcurementInquiryDetailTab;
	return DEFAULT_TAB;
}

function formatInquiryNumber(id: string): string {
	const match = id.match(/\d+/);
	return match ? String(Number(match[0])) : id;
}

export function ProcurementInquiryDetailPage() {
	const { slug = "" } = useParams<{ slug: string }>();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const isMobile = useIsMobile();
	const activeTab = parseProcurementInquiryTab(searchParams.get("tab"));
	const taskId = searchParams.get("task");
	const supplierId = searchParams.get("supplier");
	const supplierTab = parseSupplierTab(searchParams.get("supplier_tab"));

	const { data: procurementInquiry, isLoading, isError } = useProcurementInquiry(slug);
	const { data: folders = [] } = useFolders();
	const items = procurementInquiry?.items ?? [];
	const { data: supplier } = useSupplierById(supplierId);

	function handleClose() {
		navigate({ pathname: INQUIRIES_PATH, search: searchParams.toString() });
	}

	function handleSupplierOpen(id: string, origin: SupplierDrawerTab = "info") {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("supplier", id);
				next.set("supplier_tab", origin);
				return next;
			},
			{ replace: false },
		);
	}

	function handleSupplierClose() {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete("supplier");
				next.delete("supplier_tab");
				return next;
			},
			{ replace: false },
		);
	}

	function handleSupplierTabChange(tab: SupplierDrawerTab) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("supplier_tab", tab);
				return next;
			},
			{ replace: true },
		);
	}

	function handleTaskOpen(id: string) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("task", id);
				return next;
			},
			{ replace: false },
		);
	}

	function handleTaskClose() {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete("task");
				return next;
			},
			{ replace: false },
		);
	}

	function handleTabChange(tab: ProcurementInquiryDetailTab) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (tab === DEFAULT_TAB) {
					next.delete("tab");
				} else {
					next.set("tab", tab);
				}
				return next;
			},
			{ replace: true },
		);
	}

	return (
		<>
			<Sheet
				open
				onOpenChange={(nextOpen) => {
					if (!nextOpen) handleClose();
				}}
			>
				<SheetContent
					side={isMobile ? "bottom" : "right"}
					size={isMobile ? "full" : undefined}
					className={isMobile ? undefined : "!w-4/5 !max-w-none"}
					closeButtonVariant="floating"
				>
					{isLoading && (
						<div className="flex h-full flex-col gap-4 p-6">
							<SheetHeader className="sr-only">
								<SheetTitle>Загрузка запроса</SheetTitle>
							</SheetHeader>
							<Skeleton className="h-6 w-64" data-testid="procurement-inquiry-detail-skeleton" />
							<Skeleton className="h-4 w-40" />
						</div>
					)}
					{!isLoading && (isError || !procurementInquiry) && (
						<div className="flex h-full flex-col p-6">
							<SheetHeader className="sr-only">
								<SheetTitle>Запрос недоступен</SheetTitle>
							</SheetHeader>
							<div
								className="flex flex-1 flex-col items-center justify-center gap-3 text-center"
								data-testid="procurement-inquiry-not-found"
							>
								<p className="text-sm font-medium">Запрос не найден</p>
								<p className="max-w-[20rem] text-pretty text-sm text-muted-foreground">
									Возможно, ссылка устарела или запрос был удалён.
								</p>
							</div>
						</div>
					)}
					{!isLoading && procurementInquiry && (
						<ProcurementInquiryDrawerBody
							procurementInquiry={procurementInquiry}
							items={items}
							folders={folders}
							activeTab={activeTab}
							onTabChange={handleTabChange}
							onTaskOpen={handleTaskOpen}
							onSupplierOpen={handleSupplierOpen}
						/>
					)}
				</SheetContent>
			</Sheet>
			<TaskDrawer taskId={taskId} onClose={handleTaskClose} isMobile={isMobile} />
			<SupplierDetailDrawer
				supplier={supplier ?? null}
				open={supplierId != null}
				onClose={handleSupplierClose}
				activeTab={supplierTab}
				onTabChange={handleSupplierTabChange}
			/>
		</>
	);
}

interface ProcurementInquiryDrawerBodyProps {
	procurementInquiry: ProcurementInquiry;
	items: readonly ProcurementItem[];
	folders: Folder[];
	activeTab: ProcurementInquiryDetailTab;
	onTabChange: (tab: ProcurementInquiryDetailTab) => void;
	onTaskOpen: (id: string) => void;
	onSupplierOpen: (id: string, origin?: SupplierDrawerTab) => void;
}

function ProcurementInquiryDrawerBody({
	procurementInquiry,
	items,
	folders,
	activeTab,
	onTabChange,
	onTaskOpen,
	onSupplierOpen,
}: ProcurementInquiryDrawerBodyProps) {
	const folder = folders.find((f) => f.id === procurementInquiry.folderId);
	const status: ProcurementInquiryStatus = procurementInquiry.status;
	const statusCfg = STATUS_CONFIG[status];
	const updateProcurementInquiryMutation = useUpdateProcurementInquiry();
	const updateSupplierMutation = useUpdateItemCurrentSupplier();
	const [isEditingName, setIsEditingName] = useState(false);

	const itemsWithoutSupplier = useMemo(() => items.filter((it) => !it.currentSupplier), [items]);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [dialogItemId, setDialogItemId] = useState<string | null>(null);
	const dialogItem = dialogItemId ? items.find((it) => it.id === dialogItemId) : undefined;

	function handleSaveName(name: string) {
		const trimmed = name.trim();
		if (trimmed && trimmed !== procurementInquiry.name) {
			updateProcurementInquiryMutation.mutate({ id: procurementInquiry.id, patch: { name: trimmed } });
		}
		setIsEditingName(false);
	}

	function handleAddSupplier() {
		if (itemsWithoutSupplier.length === 1) {
			setDialogItemId(itemsWithoutSupplier[0].id);
			return;
		}
		setPickerOpen(true);
	}

	function handlePickItem(itemId: string) {
		setPickerOpen(false);
		setDialogItemId(itemId);
	}

	function handleSaveSupplier(draft: CurrentSupplierDraft) {
		if (!dialogItemId) return;
		updateSupplierMutation.mutate({ id: dialogItemId, currentSupplier: buildCurrentSupplierFromDraft(draft) });
		setDialogItemId(null);
	}

	const itemIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
	const { data: allSuppliers = [] } = useAllSuppliers();
	// Identity-deduped so one supplier counts once across all inquiry positions.
	const metrics = useMemo(() => {
		const total = new Set<string>();
		const contacted = new Set<string>();
		const quotesReceived = new Set<string>();
		const refusals = new Set<string>();
		for (const s of allSuppliers) {
			if (s.archived) continue;
			if (!belongsToInquiry(s, procurementInquiry.id, itemIds)) continue;
			const identity = supplierIdentity(s);
			total.add(identity);
			if (s.status !== "new") contacted.add(identity);
			if (s.status === "quote_received") quotesReceived.add(identity);
			else if (s.status === "refused") refusals.add(identity);
		}
		return {
			total: total.size,
			contacted: contacted.size,
			quotesReceived: quotesReceived.size,
			refusals: refusals.size,
		};
	}, [allSuppliers, itemIds, procurementInquiry.id]);
	const taskColumnsForCounts = useTaskColumns({ procurementInquiry: procurementInquiry.id });
	const tabCounts: Partial<Record<ProcurementInquiryDetailTab, number>> = {
		suppliers: metrics.total,
		offers: metrics.quotesReceived,
		tasks: taskColumnsForCounts.active.count,
	};

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<SheetHeader>
				<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
					<span className="font-heading text-base font-medium text-foreground tabular-nums">
						№{formatInquiryNumber(procurementInquiry.id)}
					</span>
					<span aria-hidden="true" className="font-heading text-base font-medium text-foreground">
						•
					</span>
					{isEditingName ? (
						<SheetTitle className="flex-1 min-w-0 leading-snug text-balance">
							<InlineRenameInput
								defaultValue={procurementInquiry.name}
								onSave={handleSaveName}
								onCancel={() => setIsEditingName(false)}
							/>
						</SheetTitle>
					) : (
						<div className="group flex min-w-0 flex-1 items-center gap-1.5">
							<SheetTitle className="leading-snug text-balance">{procurementInquiry.name}</SheetTitle>
							<button
								type="button"
								onClick={() => setIsEditingName(true)}
								aria-label="Переименовать запрос"
								className={cn(
									"relative inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100",
									"transition-[opacity,background-color,color,scale] duration-150 ease-out active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100",
									"after:absolute after:inset-[-8px] after:content-['']",
								)}
								data-testid="procurement-inquiry-rename-button"
							>
								<Pencil aria-hidden="true" className="size-3.5" />
							</button>
						</div>
					)}
				</div>
				<SheetDescription className="sr-only">Детали запроса</SheetDescription>
				<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
					<span className={cn("inline-flex items-center gap-1.5 font-normal", statusCfg.className)}>
						<ProcurementStatusIcon status={status} iconClassName="size-3.5" />
						{statusCfg.label}
					</span>
					<span className="select-none text-muted-foreground/50" aria-hidden="true">
						•
					</span>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
						<HeaderMetric
							icon={Mail}
							count={metrics.contacted}
							label="Написали поставщикам"
							colorClass="text-muted-foreground"
							testId="procurement-inquiry-metric-contacted"
						/>
						<HeaderMetric
							icon={Check}
							count={metrics.quotesReceived}
							label="Получено КП"
							colorClass="text-green-600 dark:text-green-400"
							testId="procurement-inquiry-metric-quotes"
						/>
						<HeaderMetric
							icon={Ban}
							count={metrics.refusals}
							label="Отказ"
							colorClass="text-destructive"
							testId="procurement-inquiry-metric-refusals"
						/>
					</div>
				</div>
			</SheetHeader>

			<div className="flex gap-0 overflow-x-auto border-b border-border px-4" role="tablist">
				{TABS.map((tab) => {
					const isActive = activeTab === tab.key;
					const count = tabCounts[tab.key];
					return (
						<button
							key={tab.key}
							type="button"
							role="tab"
							aria-selected={isActive}
							aria-label={tab.label}
							className={cn(
								"inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors",
								"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
								isActive ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground",
							)}
							onClick={() => onTabChange(tab.key)}
						>
							{tab.mobileLabel ? (
								<>
									<span className="md:hidden">{tab.mobileLabel}</span>
									<span className="hidden md:inline">{tab.label}</span>
								</>
							) : (
								tab.label
							)}
							{count != null && count > 0 && (
								<span
									className={cn(
										"hidden min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs tabular-nums transition-colors md:inline-flex",
										isActive ? "text-foreground" : "text-muted-foreground",
									)}
									aria-hidden="true"
								>
									{count}
								</span>
							)}
						</button>
					);
				})}
			</div>

			<div
				className={cn(
					"min-h-0 flex-1 overflow-y-auto overflow-x-hidden [&_tr>*:last-child]:pr-lg",
					activeTab === "details" ? "p-4" : "pt-3",
				)}
			>
				{activeTab === "suppliers" && (
					<ProcurementInquirySuppliersTab
						procurementInquiryId={procurementInquiry.id}
						items={items}
						onSupplierClick={(id) => onSupplierOpen(id, "info")}
						onAddSupplier={handleAddSupplier}
					/>
				)}
				{activeTab === "offers" && (
					<ProcurementInquiryOffersTab
						procurementInquiryId={procurementInquiry.id}
						items={items}
						onSupplierClick={(id) => onSupplierOpen(id, "offers")}
						onAddSupplier={handleAddSupplier}
					/>
				)}
				{activeTab === "tasks" && (
					<ProcurementInquiryTasksTab procurementInquiryId={procurementInquiry.id} onTaskClick={onTaskOpen} />
				)}
				{activeTab === "details" && (
					<ProcurementInquiryDetailsTab
						procurementInquiry={procurementInquiry}
						items={items}
						folder={folder}
						status={status}
					/>
				)}
			</div>
			{pickerOpen && (
				<AddCurrentSupplierItemPicker
					open
					onOpenChange={setPickerOpen}
					items={itemsWithoutSupplier}
					onSelect={handlePickItem}
				/>
			)}
			{dialogItemId !== null && (
				<CurrentSupplierDialog
					open
					onOpenChange={(o) => {
						if (!o) setDialogItemId(null);
					}}
					initial={dialogItem?.currentSupplier ? buildCurrentSupplierDraft(dialogItem.currentSupplier) : undefined}
					onSave={handleSaveSupplier}
				/>
			)}
		</div>
	);
}

function HeaderMetric({
	icon: Icon,
	count,
	label,
	colorClass,
	testId,
}: {
	icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	count: number;
	label: string;
	colorClass: string;
	testId: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className={cn("inline-flex items-center gap-1 text-sm font-normal", colorClass)} data-testid={testId}>
					<Icon className="size-4" aria-hidden={true} />
					<span className="tabular-nums">{count}</span>
				</span>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

function NoItemsHint({ tab }: { tab: "suppliers" | "offers" }) {
	const message =
		tab === "suppliers"
			? "В этом запросе пока нет позиций — поставщиков нет."
			: "В этом запросе пока нет позиций — предложений нет.";
	return <p className="text-pretty py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

type TasksFilter = "completed" | "archived";

const FILTER_BUTTONS: { key: TasksFilter; label: string }[] = [
	{ key: "completed", label: "Завершённые" },
	{ key: "archived", label: "Архив" },
];

const TASK_TABLE_COLUMNS: DataTableColumn<Task>[] = [
	{
		id: "name",
		header: "ВОПРОС",
		sortable: true,
		cell: (t) => <span className="font-medium">{t.name}</span>,
	},
	{
		id: "questionCount",
		header: "КОЛИЧЕСТВО",
		sortable: true,
		align: "right",
		cell: (t) => (t.questionCount > 0 ? formatRussianPlural(t.questionCount, ["вопрос", "вопроса", "вопросов"]) : "—"),
	},
	{
		id: "deadlineAt",
		header: "ДЕДЛАЙН",
		sortable: true,
		align: "right",
		cell: (t) => (
			<time
				dateTime={t.deadlineAt}
				className={cn("tabular-nums", isOverdue(t.deadlineAt) && "font-medium text-destructive")}
			>
				{formatDayMonthShort(t.deadlineAt)}
			</time>
		),
	},
	{
		id: "createdAt",
		header: "ДАТА И ВРЕМЯ СОЗДАНИЯ",
		sortable: true,
		align: "right",
		cell: (t) => (
			<time dateTime={t.createdAt} className="tabular-nums">
				{formatDayMonthShortTime(t.createdAt)}
			</time>
		),
	},
];

type TaskSortField = "name" | "questionCount" | "deadlineAt" | "createdAt";

function compareTasks(a: Task, b: Task, field: TaskSortField, dir: "asc" | "desc"): number {
	const sign = dir === "asc" ? 1 : -1;
	if (field === "name") return a.name.localeCompare(b.name, "ru") * sign;
	if (field === "questionCount") return (a.questionCount - b.questionCount) * sign;
	const av = new Date(field === "deadlineAt" ? a.deadlineAt : a.createdAt).getTime();
	const bv = new Date(field === "deadlineAt" ? b.deadlineAt : b.createdAt).getTime();
	return (av - bv) * sign;
}

function ProcurementInquirySuppliersTab({
	procurementInquiryId,
	items,
	onSupplierClick,
	onAddSupplier,
}: {
	procurementInquiryId: string;
	items: readonly ProcurementItem[];
	onSupplierClick: (id: string) => void;
	onAddSupplier: () => void;
}) {
	if (items.length === 0) return <NoItemsHint tab="suppliers" />;
	return (
		<ProcurementInquiryConsolidatedSuppliersPanel
			procurementInquiryId={procurementInquiryId}
			items={items}
			onSupplierClick={onSupplierClick}
			onAddSupplier={onAddSupplier}
		/>
	);
}

function ProcurementInquiryConsolidatedSuppliersPanel({
	procurementInquiryId,
	items,
	onSupplierClick,
	onAddSupplier,
}: {
	procurementInquiryId: string;
	items: readonly ProcurementItem[];
	onSupplierClick: (id: string) => void;
	onAddSupplier: () => void;
}) {
	const itemIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
	const { data: allSuppliers = [], isLoading } = useAllSuppliers();
	const archiveMutation = useArchiveSuppliers();
	const unarchiveMutation = useUnarchiveSuppliers();
	const sendRequestMutation = useSendSupplierRequest();
	const createSupplierMutation = useCreateSupplier();
	const [addDialogOpen, setAddDialogOpen] = useState(false);

	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<SupplierSortState>({ field: "companyName", direction: "asc" });
	const [activeCompanyTypes, setActiveCompanyTypes] = useState<SupplierCompanyType[]>([]);
	const [activeStatuses, setActiveStatuses] = useState<SupplierStatus[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [showArchived, setShowArchived] = useState(false);

	const procurementInquirySuppliers = useMemo(
		() => allSuppliers.filter((s) => belongsToInquiry(s, procurementInquiryId, itemIds) && s.archived === showArchived),
		[allSuppliers, itemIds, procurementInquiryId, showArchived],
	);

	const dedupedSuppliers = useMemo(() => {
		const byIdentity = new Map<string, Supplier>();
		for (const s of procurementInquirySuppliers) {
			const identity = supplierIdentity(s);
			const existing = byIdentity.get(identity);
			if (!existing) {
				byIdentity.set(identity, s);
				continue;
			}
			if ((SUPPLIER_PIPELINE_RANK[s.status] ?? 0) > (SUPPLIER_PIPELINE_RANK[existing.status] ?? 0)) {
				byIdentity.set(identity, s);
			}
		}
		return [...byIdentity.values()];
	}, [procurementInquirySuppliers]);

	const statusCounts = useMemo(() => {
		const counts: Partial<Record<SupplierStatus, number>> = {};
		for (const s of dedupedSuppliers) {
			if (s.archived) continue;
			counts[s.status] = (counts[s.status] ?? 0) + 1;
		}
		return counts;
	}, [dedupedSuppliers]);

	const { pinnedSuppliers, placeholderPinnedRows, pinnedIds } = usePinnedAndPlaceholderRows(
		items,
		dedupedSuppliers,
		onAddSupplier,
	);

	const currentSupplierIdentities = useMemo(
		() =>
			items
				.map((it) => it.currentSupplier)
				.filter((cs): cs is NonNullable<typeof cs> => cs != null)
				.map((cs) => ({ inn: cs.inn, companyName: cs.companyName })),
		[items],
	);

	const filteredSuppliers = useMemo(() => {
		const q = search.trim().toLowerCase();
		const effectiveStatuses = activeStatuses.length > 0 ? activeStatuses : SUPPLIER_STATUSES;
		return dedupedSuppliers.filter((s) => {
			if (pinnedIds.has(s.id)) return false;
			if (q && !s.companyName.toLowerCase().includes(q) && !s.inn.includes(search)) return false;
			if (activeCompanyTypes.length > 0 && !activeCompanyTypes.includes(s.companyType)) return false;
			if (!effectiveStatuses.includes(s.status)) return false;
			return true;
		});
	}, [dedupedSuppliers, search, activeCompanyTypes, activeStatuses, pinnedIds]);

	const sortedSuppliers = useMemo(() => sortConsolidatedSuppliers(filteredSuppliers, sort), [filteredSuppliers, sort]);
	const {
		visible: visibleSuppliers,
		hasNextPage,
		loadMore,
	} = useClientPagination(sortedSuppliers, CONSOLIDATED_PAGE_SIZE);

	function handleSort(field: SupplierSortField) {
		setSort((prev) => {
			if (prev?.field !== field) return { field, direction: "asc" };
			if (prev.direction === "asc") return { field, direction: "desc" };
			return null;
		});
	}

	function handleCompanyTypeFilter(type: SupplierCompanyType) {
		setActiveCompanyTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
	}

	function handleStatusFilter(status: SupplierStatus) {
		setActiveStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
	}

	function handleSelectionChange(idOrAll: string) {
		if (idOrAll === "all") {
			setSelectedIds((prev) =>
				prev.size === visibleSuppliers.length ? new Set() : new Set(visibleSuppliers.map((s) => s.id)),
			);
			return;
		}
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(idOrAll)) next.delete(idOrAll);
			else next.add(idOrAll);
			return next;
		});
	}

	function dispatchByItem(ids: string[], action: (itemId: string, supplierIds: string[]) => void) {
		const byItem = groupSupplierIdsByItem(sortedSuppliers, ids);
		for (const [itemId, supplierIds] of byItem) action(itemId, supplierIds);
	}

	function handleArchiveBatch() {
		dispatchByItem([...selectedIds], (itemId, supplierIds) =>
			archiveMutation.mutate({ itemId, supplierIds }, { onSuccess: () => setSelectedIds(new Set()) }),
		);
	}

	function handleArchiveSupplier(id: string) {
		dispatchByItem([id], (itemId, supplierIds) => archiveMutation.mutate({ itemId, supplierIds }));
	}

	function handleUnarchiveSupplier(id: string) {
		dispatchByItem([id], (itemId, supplierIds) => unarchiveMutation.mutate({ itemId, supplierIds }));
	}

	function handleSendRequest(id: string) {
		dispatchByItem([id], (itemId, supplierIds) =>
			sendRequestMutation.mutate(
				{ itemId, supplierIds },
				{
					onSuccess: (transitioned) => {
						if (transitioned.length > 0) toast.success("Запрашиваем КП");
					},
				},
			),
		);
	}

	function handleSendRequestBatch() {
		dispatchByItem([...selectedIds], (itemId, supplierIds) =>
			sendRequestMutation.mutate(
				{ itemId, supplierIds },
				{
					onSuccess: (transitioned) => {
						if (transitioned.length > 0) toast.success("Запрашиваем КП у поставщиков");
					},
				},
			),
		);
		setSelectedIds(new Set());
	}

	function handleSendRequestAll() {
		const candidateIds = sortedSuppliers.filter((s) => s.status === "new" && !s.archived).map((s) => s.id);
		if (candidateIds.length === 0) {
			toast.info("Нет поставщиков со статусом «Кандидат»");
			return;
		}
		dispatchByItem(candidateIds, (itemId, supplierIds) =>
			sendRequestMutation.mutate(
				{ itemId, supplierIds },
				{
					onSuccess: (transitioned) => {
						if (transitioned.length > 0) toast.success("Запрашиваем КП у поставщиков");
					},
				},
			),
		);
	}

	function handleSaveNewSupplier(draft: AddSupplierDraft) {
		createSupplierMutation.mutate(
			{ procurementInquiryId, ...draft },
			{
				onSuccess: () => {
					setAddDialogOpen(false);
					toast.success("Поставщик добавлен");
				},
			},
		);
	}

	return (
		<div data-testid="procurement-inquiry-tab-suppliers" className="h-full">
			<SuppliersTable
				suppliers={visibleSuppliers}
				totalCount={sortedSuppliers.length + pinnedSuppliers.length}
				pinnedSuppliers={pinnedSuppliers.length > 0 ? pinnedSuppliers : undefined}
				placeholderPinnedRows={placeholderPinnedRows.length > 0 ? placeholderPinnedRows : undefined}
				currentSupplierIdentities={currentSupplierIdentities}
				isLoading={isLoading}
				onRowClick={onSupplierClick}
				hasNextPage={hasNextPage}
				loadMore={loadMore}
				isFetchingNextPage={false}
				search={search}
				onSearchChange={setSearch}
				sort={sort}
				onSort={handleSort}
				activeCompanyTypes={activeCompanyTypes}
				onCompanyTypeFilter={handleCompanyTypeFilter}
				activeStatuses={activeStatuses}
				onStatusFilter={handleStatusFilter}
				statusCounts={statusCounts}
				selectedIds={selectedIds}
				onSelectionChange={handleSelectionChange}
				onArchive={handleArchiveBatch}
				isArchiving={archiveMutation.isPending}
				onArchiveSupplier={handleArchiveSupplier}
				onUnarchiveSupplier={handleUnarchiveSupplier}
				onSendRequest={handleSendRequest}
				onSendRequestBatch={handleSendRequestBatch}
				onSendRequestAll={handleSendRequestAll}
				onAddSupplier={() => setAddDialogOpen(true)}
				showArchived={showArchived}
				onToggleArchived={() => {
					setShowArchived((v) => !v);
					setSelectedIds(new Set());
				}}
			/>
			{addDialogOpen && <AddSupplierDialog open onOpenChange={setAddDialogOpen} onSave={handleSaveNewSupplier} />}
		</div>
	);
}

function ProcurementInquiryOffersTab({
	procurementInquiryId: _procurementInquiryId,
	items,
	onSupplierClick,
	onAddSupplier,
}: {
	procurementInquiryId: string;
	items: readonly ProcurementItem[];
	onSupplierClick: (id: string) => void;
	onAddSupplier: () => void;
}) {
	if (items.length === 0) return <NoItemsHint tab="offers" />;
	return (
		<ProcurementInquiryConsolidatedOffersPanel
			items={items}
			onSupplierClick={onSupplierClick}
			onAddSupplier={onAddSupplier}
		/>
	);
}

function ProcurementInquiryConsolidatedOffersPanel({
	items,
	onSupplierClick,
	onAddSupplier,
}: {
	items: readonly ProcurementItem[];
	onSupplierClick: (id: string) => void;
	onAddSupplier: () => void;
}) {
	const itemIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
	const { data: allSuppliers = [], isLoading } = useAllSuppliers();
	const archiveMutation = useArchiveSuppliers();

	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<SupplierSortState>({ field: "tco", direction: "asc" });
	const [activePaymentTypes, setActivePaymentTypes] = useState<PaymentType[]>([]);
	const [activeDeliveryFilters, setActiveDeliveryFilters] = useState<DeliveryFilter[]>([]);
	const [activeItemIds, setActiveItemIds] = useState<string[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [showArchived, setShowArchived] = useState(false);

	const procurementInquiryQuotesByIdentity = useMemo(() => {
		const map = new Map<string, Map<string, number>>();
		for (const s of allSuppliers) {
			if (s.archived) continue;
			if (s.itemId == null || !itemIds.has(s.itemId)) continue;
			if (s.status !== "quote_received") continue;
			if (s.tco == null) continue;
			const identity = supplierIdentity(s);
			let perItem = map.get(identity);
			if (!perItem) {
				perItem = new Map();
				map.set(identity, perItem);
			}
			perItem.set(s.itemId, s.tco);
		}
		return map;
	}, [allSuppliers, itemIds]);

	const activeItemIdsSet = useMemo(() => new Set(activeItemIds), [activeItemIds]);
	// One row per identity; lowest-ТСО quote wins when a supplier covers multiple positions.
	const dedupedSuppliers = useMemo(() => {
		const byIdentity = new Map<string, Supplier>();
		for (const s of allSuppliers) {
			if (s.archived !== showArchived) continue;
			if (s.itemId == null || !itemIds.has(s.itemId)) continue;
			if (s.status !== "quote_received") continue;
			if (activeItemIdsSet.size > 0 && !activeItemIdsSet.has(s.itemId)) continue;
			const identity = supplierIdentity(s);
			const existing = byIdentity.get(identity);
			if (!existing) {
				byIdentity.set(identity, s);
				continue;
			}
			if (s.tco != null && (existing.tco == null || s.tco < existing.tco)) {
				byIdentity.set(identity, s);
			}
		}
		return [...byIdentity.values()];
	}, [allSuppliers, itemIds, showArchived, activeItemIdsSet]);

	const { pinnedSuppliers, placeholderPinnedRows, pinnedIds } = usePinnedAndPlaceholderRows(
		items,
		dedupedSuppliers,
		onAddSupplier,
	);

	const filteredSuppliers = useMemo(() => {
		const remaining: Supplier[] = [];
		for (const s of dedupedSuppliers) {
			if (pinnedIds.has(s.id)) continue;
			if (search) {
				const q = search.toLowerCase();
				if (!s.companyName.toLowerCase().includes(q) && !s.inn.includes(search)) continue;
			}
			if (activePaymentTypes.length > 0 && !activePaymentTypes.includes(s.paymentType)) continue;
			if (!matchesDeliveryFilter(s.deliveryCost, activeDeliveryFilters)) continue;
			remaining.push(s);
		}
		return remaining;
	}, [dedupedSuppliers, search, activePaymentTypes, activeDeliveryFilters, pinnedIds]);

	const sortedSuppliers = useMemo(() => sortConsolidatedSuppliers(filteredSuppliers, sort), [filteredSuppliers, sort]);
	const {
		visible: visibleSuppliers,
		hasNextPage,
		loadMore,
	} = useClientPagination(sortedSuppliers, CONSOLIDATED_PAGE_SIZE);
	const totalCount = sortedSuppliers.length + pinnedSuppliers.length;

	function handleSort(field: SupplierSortField) {
		setSort((prev) => {
			if (prev?.field !== field) return { field, direction: "asc" };
			if (prev.direction === "asc") return { field, direction: "desc" };
			return null;
		});
	}

	function handlePaymentTypeFilter(t: PaymentType) {
		setActivePaymentTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
	}

	function handleDeliveryFilter(t: DeliveryFilter) {
		setActiveDeliveryFilters((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
	}

	function handleItemFilter(itemId: string) {
		setActiveItemIds((prev) => (prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]));
	}

	function handleSelectionChange(idOrAll: string) {
		if (idOrAll === "all") {
			setSelectedIds((prev) =>
				prev.size === visibleSuppliers.length ? new Set() : new Set(visibleSuppliers.map((s) => s.id)),
			);
			return;
		}
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(idOrAll)) next.delete(idOrAll);
			else next.add(idOrAll);
			return next;
		});
	}

	function archiveByIds(ids: string[]) {
		const byItem = groupSupplierIdsByItem(sortedSuppliers, ids);
		for (const [itemId, supplierIds] of byItem) {
			archiveMutation.mutate({ itemId, supplierIds });
		}
	}

	function handleArchive() {
		archiveByIds([...selectedIds]);
		setSelectedIds(new Set());
	}

	function handleArchiveSupplier(id: string) {
		archiveByIds([id]);
	}

	return (
		<div data-testid="procurement-inquiry-tab-offers" className="h-full">
			<OffersTable
				suppliers={visibleSuppliers}
				totalCount={totalCount}
				// Multi-item: no single batch quantity, so СТОИМОСТЬ renders «—».
				item={{ quantityPerDelivery: undefined }}
				currentSupplier={undefined}
				currentSupplierRowId={undefined}
				extraPinnedSuppliers={pinnedSuppliers.length > 0 ? pinnedSuppliers : undefined}
				placeholderPinnedRows={placeholderPinnedRows.length > 0 ? placeholderPinnedRows : undefined}
				isLoading={isLoading}
				onRowClick={onSupplierClick}
				hasNextPage={hasNextPage}
				loadMore={loadMore}
				isFetchingNextPage={false}
				search={search}
				onSearchChange={setSearch}
				sort={sort}
				onSort={handleSort}
				activePaymentTypes={activePaymentTypes}
				onPaymentTypeFilter={handlePaymentTypeFilter}
				activeDeliveryFilters={activeDeliveryFilters}
				onDeliveryFilter={handleDeliveryFilter}
				selectedIds={selectedIds}
				onSelectionChange={handleSelectionChange}
				onArchive={handleArchive}
				isArchiving={archiveMutation.isPending}
				onArchiveSupplier={handleArchiveSupplier}
				showArchived={showArchived}
				onToggleArchived={() => setShowArchived((v) => !v)}
				procurementInquiryItems={items}
				procurementInquiryQuotesByIdentity={procurementInquiryQuotesByIdentity}
				activeItemIds={activeItemIds}
				onItemFilter={handleItemFilter}
				showSavings={false}
			/>
		</div>
	);
}

function sortConsolidatedSuppliers(suppliers: Supplier[], sort: SupplierSortState): Supplier[] {
	if (!sort) return suppliers;
	const sign = sort.direction === "asc" ? 1 : -1;
	const accessor = (s: Supplier): number | string | null => {
		switch (sort.field) {
			case "companyName":
				return s.companyName;
			case "tco":
				return s.tco;
			case "leadTimeDays":
				return s.leadTimeDays;
			case "foundedYear":
				return s.foundedYear;
			case "revenue":
				return s.revenue;
			default:
				return null;
		}
	};
	return [...suppliers].sort((a, b) => {
		const av = accessor(a);
		const bv = accessor(b);
		if (av == null && bv == null) return 0;
		if (av == null) return 1;
		if (bv == null) return -1;
		if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv, "ru") * sign;
		return ((av as number) - (bv as number)) * sign;
	});
}

function ProcurementInquiryTasksTab({
	procurementInquiryId,
	onTaskClick,
}: {
	procurementInquiryId: string;
	onTaskClick: (id: string) => void;
}) {
	const [searchParams, setSearchParams] = useSearchParams();
	const [search, setSearch] = useState("");
	const [searchUserExpanded, setSearchUserExpanded] = useState(false);
	const searchExpanded = search.length > 0 || searchUserExpanded;
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [sort, setSort] = useState<DataTableSort | null>({ field: "createdAt", direction: "desc" });
	const isMobile = useIsMobile();
	const updateStatus = useUpdateTaskStatus();

	const statusParam = searchParams.get("task_status") as TasksFilter | null;
	const activeFilter: TasksFilter | null =
		statusParam === "completed" || statusParam === "archived" ? statusParam : null;

	const taskColumns = useTaskColumns({ procurementInquiry: procurementInquiryId, q: search || undefined });

	function handleFilterToggle(filter: TasksFilter) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (activeFilter === filter) next.delete("task_status");
				else next.set("task_status", filter);
				return next;
			},
			{ replace: true },
		);
		setSelectedIds(new Set());
	}

	function handleSort(field: string) {
		setSort((prev) => {
			if (prev?.field !== field) return { field, direction: "asc" };
			if (prev.direction === "asc") return { field, direction: "desc" };
			return null;
		});
	}

	const activeFilterTasks = activeFilter ? taskColumns[activeFilter].tasks : null;

	const tasks = useMemo(() => {
		const base = activeFilterTasks ?? taskColumns.active.tasks;
		if (!sort) {
			return [...base].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		}
		return [...base].sort((a, b) => compareTasks(a, b, sort.field as TaskSortField, sort.direction));
	}, [activeFilterTasks, taskColumns.active.tasks, sort]);

	const isLoading = taskColumns.active.isLoading;

	const tasksTotalCount = activeFilter ? taskColumns[activeFilter].count : taskColumns.active.count;

	function handleSelectionChange(idOrAll: string) {
		if (idOrAll === "all") {
			setSelectedIds((prev) => {
				const allSelected = tasks.length > 0 && tasks.every((t) => prev.has(t.id));
				if (allSelected) {
					const next = new Set(prev);
					for (const t of tasks) next.delete(t.id);
					return next;
				}
				const next = new Set(prev);
				for (const t of tasks) next.add(t.id);
				return next;
			});
		} else {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (next.has(idOrAll)) next.delete(idOrAll);
				else next.add(idOrAll);
				return next;
			});
		}
	}

	function handleArchiveTask(id: string) {
		updateStatus.mutate({ id, status: "archived" });
	}

	function handleArchiveSelected() {
		for (const id of selectedIds) {
			updateStatus.mutate({ id, status: "archived" });
		}
		setSelectedIds(new Set());
	}

	const toolbar =
		selectedIds.size > 0 ? (
			<div className="mx-3 flex items-center gap-3 rounded-xl bg-muted px-3 py-2">
				<span className="text-sm font-medium tabular-nums">Выбрано: {selectedIds.size}</span>
				<Button type="button" variant="outline" size="sm" onClick={handleArchiveSelected} aria-label="Архивировать">
					<Archive className="mr-1 size-4" aria-hidden="true" />
					Архивировать
				</Button>
			</div>
		) : (
			<div className="flex items-center gap-2 px-3">
				{!(isMobile && searchExpanded) && (
					<span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
						{formatRussianPlural(tasksTotalCount, ["вопрос", "вопроса", "вопросов"])}
					</span>
				)}
				<div className={cn("ml-auto flex items-center gap-1", isMobile && searchExpanded && "flex-1")}>
					<ToolbarSearch
						value={search}
						onChange={setSearch}
						ariaLabel="Поиск вопросов"
						debounceMs={250}
						expanded={searchUserExpanded}
						onExpandedChange={setSearchUserExpanded}
					/>
					{!(isMobile && searchExpanded) &&
						FILTER_BUTTONS.map(({ key, label }) => {
							const Icon = STATUS_ICONS[key];
							const count = taskColumns[key].count;
							const active = activeFilter === key;
							return (
								<Tooltip key={key}>
									<TooltipTrigger asChild>
										<button
											type="button"
											aria-label={label}
											aria-pressed={active}
											className={cn(
												"inline-flex items-center gap-1 rounded-[min(var(--radius-md),12px)] px-2 py-1 text-sm transition-colors",
												"hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
											)}
											onClick={() => handleFilterToggle(key)}
										>
											<Icon className={cn("size-4", active && "text-highlight-foreground")} aria-hidden="true" />
											{count > 0 && (
												<span className={cn("tabular-nums text-xs", active && "text-highlight-foreground")}>
													{count}
												</span>
											)}
										</button>
									</TooltipTrigger>
									<TooltipContent>{label}</TooltipContent>
								</Tooltip>
							);
						})}
				</div>
			</div>
		);

	function renderMobileCard(t: Task) {
		return <TaskCard task={t} onClick={onTaskClick} hideProcurementInquiryName />;
	}

	return (
		<div data-testid="procurement-inquiry-tab-tasks" className="h-full">
			<DataTable<Task>
				columns={TASK_TABLE_COLUMNS}
				rows={tasks}
				getRowId={(t) => t.id}
				isLoading={isLoading}
				emptyMessage="Нет вопросов"
				selection={{
					selectedIds,
					onChange: handleSelectionChange,
					getRowLabel: (id) => `Выбрать ${tasks.find((t) => t.id === id)?.name ?? id}`,
				}}
				sort={sort}
				onSort={handleSort}
				rowActions={(t) => [
					{
						label: "Архивировать",
						icon: <Archive className="size-3.5" />,
						onSelect: () => handleArchiveTask(t.id),
					},
				]}
				toolbar={toolbar}
				mobileCardRender={renderMobileCard}
				onRowClick={onTaskClick}
				isMobile={isMobile}
			/>
		</div>
	);
}

function ProcurementInquiryDetailsTab({
	procurementInquiry,
	items,
	folder,
	status,
}: {
	procurementInquiry: ProcurementInquiry;
	items: readonly ProcurementItem[];
	folder?: Folder;
	status: ProcurementInquiryStatus;
}) {
	const { data: company } = useCompanyDetail(procurementInquiry.companyId ?? null);
	const addressText = useMemo(() => {
		if (!procurementInquiry.deliveryAddressId || !company?.addresses) return "";
		return company.addresses.find((a) => a.id === procurementInquiry.deliveryAddressId)?.address ?? "";
	}, [procurementInquiry.deliveryAddressId, company?.addresses]);
	const yesNo = (v: boolean | undefined) => (v ? "Да" : "Нет");
	const rfqEditable = RFQ_EDITABLE_STATUSES.has(status);

	const updateSupplierMutation = useUpdateItemCurrentSupplier();
	const [activeSupplierItemId, setActiveSupplierItemId] = useState<string | null>(null);
	const activeItem = activeSupplierItemId ? items.find((it) => it.id === activeSupplierItemId) : undefined;

	function handleSaveSupplier(draft: CurrentSupplierDraft) {
		if (!activeSupplierItemId) return;
		updateSupplierMutation.mutate({ id: activeSupplierItemId, currentSupplier: buildCurrentSupplierFromDraft(draft) });
		setActiveSupplierItemId(null);
	}

	function handleRemoveSupplier(itemId: string) {
		updateSupplierMutation.mutate({ id: itemId, currentSupplier: undefined });
	}

	return (
		<div data-testid="procurement-inquiry-tab-details" className="flex flex-col gap-6">
			<Section title="Основное">
				<CardGrid>
					<FieldCard label="Компания">
						<ValueText value={company?.name ?? ""} />
					</FieldCard>
					<FieldCard label="Категория">
						<ValueText value={folder?.name ?? ""} />
					</FieldCard>
					<FieldCard label="Название" span="full">
						<ValueText value={procurementInquiry.name} />
					</FieldCard>
					<FieldCard label="Дедлайн">
						<ValueText value={procurementInquiry.deadline ? formatShortDate(procurementInquiry.deadline) : ""} />
					</FieldCard>
					<FieldCard label="Дата создания">
						<ValueText value={formatShortDate(procurementInquiry.createdAt)} />
					</FieldCard>
				</CardGrid>
			</Section>

			<Section title={`Позиции (${items.length})`}>
				{items.length === 0 ? (
					<p className="py-2 text-sm text-muted-foreground">Позиций пока нет.</p>
				) : (
					<div className="flex flex-col gap-3" data-testid="procurement-inquiry-items-list">
						{items.map((item, index) => (
							<ProcurementInquiryPositionCard
								key={item.id}
								item={item}
								index={index}
								onEditSupplier={() => setActiveSupplierItemId(item.id)}
								onRemoveSupplier={() => handleRemoveSupplier(item.id)}
							/>
						))}
					</div>
				)}
			</Section>

			<Section title="Логистика">
				<CardGrid>
					<FieldCard label="Разгрузка">
						<ValueText
							value={
								procurementInquiry.unloading ? UNLOADING_LABELS[procurementInquiry.unloading as UnloadingType] : ""
							}
						/>
					</FieldCard>
					<FieldCard label="Адрес доставки" span="full">
						<ValueText value={addressText} />
					</FieldCard>
				</CardGrid>
			</Section>

			<ProcurementInquiryRfqSection procurementInquiry={procurementInquiry} editable={rfqEditable} />

			<ProcurementInquiryGeneratedQuestionsSection procurementInquiry={procurementInquiry} />

			<Section title="Дополнительно">
				<CardGrid>
					<FieldCard label="Условия" span="half">
						<ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
							<li>
								<span className="text-muted-foreground">Допускается оплата наличными:</span>{" "}
								{yesNo(procurementInquiry.cashAllowed)}
							</li>
							<li>
								<span className="text-muted-foreground">Аналоги допускаются:</span>{" "}
								{yesNo(!procurementInquiry.analoguesNotAllowed)}
							</li>
						</ul>
					</FieldCard>
					<FieldCard label="Комментарий" span="full">
						<ValueText value={procurementInquiry.additionalInfo ?? ""} />
					</FieldCard>
				</CardGrid>
			</Section>

			{activeSupplierItemId !== null && (
				<CurrentSupplierDialog
					open
					onOpenChange={(o) => {
						if (!o) setActiveSupplierItemId(null);
					}}
					initial={activeItem?.currentSupplier ? buildCurrentSupplierDraft(activeItem.currentSupplier) : undefined}
					onSave={handleSaveSupplier}
				/>
			)}
		</div>
	);
}

function ProcurementInquiryRfqSection({
	procurementInquiry,
	editable,
}: {
	procurementInquiry: ProcurementInquiry;
	editable: boolean;
}) {
	const updateMutation = useUpdateProcurementInquiry();
	const [editing, setEditing] = useState(false);
	const [bodyDraft, setBodyDraft] = useState("");
	const [autoSendDraft, setAutoSendDraft] = useState(false);

	const currentBody = procurementInquiry.emailBody ?? "";
	const currentAutoSend = procurementInquiry.sendRequestsAutomatically;

	function handleEdit() {
		setBodyDraft(currentBody);
		setAutoSendDraft(currentAutoSend);
		setEditing(true);
	}

	function handleCancel() {
		setEditing(false);
	}

	function handleSave() {
		const trimmedBody = bodyDraft.trim();
		updateMutation.mutate(
			{
				id: procurementInquiry.id,
				patch: { emailBody: trimmedBody, sendRequestsAutomatically: autoSendDraft },
			},
			{
				onSuccess: () => setEditing(false),
			},
		);
	}

	const dirty = bodyDraft !== currentBody || autoSendDraft !== currentAutoSend;

	return (
		<Section
			title="RFQ"
			editLabel={editable ? "Редактировать RFQ" : undefined}
			editing={editing}
			onEdit={editable ? handleEdit : undefined}
			onCancel={handleCancel}
			onSave={handleSave}
			saveDisabled={!dirty || updateMutation.isPending}
			isPending={updateMutation.isPending}
		>
			<CardGrid>
				<FieldCard label="Текст письма" span="full">
					{editing ? (
						<Textarea
							aria-label="Текст письма"
							value={bodyDraft}
							onChange={(e) => setBodyDraft(e.target.value)}
							rows={8}
							spellCheck={false}
						/>
					) : currentBody ? (
						<p className="whitespace-pre-wrap text-pretty text-sm">{currentBody}</p>
					) : (
						<ValueText value="" />
					)}
				</FieldCard>
				<FieldCard label="Автоотправка запросов" span="full">
					{editing ? (
						<div>
							<CheckboxBadge
								id="procurement-inquiry-rfq-autosend"
								checked={autoSendDraft}
								onChange={setAutoSendDraft}
								ariaLabel="Автоотправка запросов"
							>
								Автоотправка запросов
							</CheckboxBadge>
							<p className="mt-1.5 text-xs text-muted-foreground">
								Когда включено — запросы рассылаются всем поставщикам сразу после их нахождения.
							</p>
						</div>
					) : (
						<ValueText value={currentAutoSend ? "Включена" : "Выключена"} />
					)}
				</FieldCard>
			</CardGrid>
		</Section>
	);
}

function ProcurementInquiryGeneratedQuestionsSection({
	procurementInquiry,
}: {
	procurementInquiry: ProcurementInquiry;
}) {
	const updateMutation = useUpdateProcurementInquiry();
	const questions = procurementInquiry.generatedQuestions;
	const [editing, setEditing] = useState(false);
	const [drafts, setDrafts] = useState<string[]>([]);

	function handleEdit() {
		setDrafts(questions.map((q) => q.answer));
		setEditing(true);
	}

	function handleCancel() {
		setEditing(false);
	}

	function handleSave() {
		updateMutation.mutate(
			{
				id: procurementInquiry.id,
				patch: {
					generatedQuestions: questions.map((q, i) => ({
						questionText: q.questionText,
						suggests: q.suggests,
						answer: drafts[i] ?? q.answer,
					})),
				},
			},
			{ onSuccess: () => setEditing(false) },
		);
	}

	if (questions.length === 0) return null;

	const dirty = drafts.some((draft, i) => draft !== (questions[i]?.answer ?? ""));

	return (
		<Section
			title="Дополнительные вопросы"
			editLabel="Редактировать дополнительные вопросы"
			editing={editing}
			onEdit={handleEdit}
			onCancel={handleCancel}
			onSave={handleSave}
			saveDisabled={!dirty || updateMutation.isPending}
			isPending={updateMutation.isPending}
		>
			<CardGrid>
				{questions.map((question, index) => (
					<FieldCard key={question.id} label={question.questionText} span="full">
						{editing ? (
							<Input
								aria-label={`Ответ: ${question.questionText}`}
								value={drafts[index] ?? ""}
								onChange={(e) =>
									setDrafts((prev) => {
										const next = prev.slice();
										next[index] = e.target.value;
										return next;
									})
								}
								spellCheck={false}
								autoComplete="off"
							/>
						) : (
							<ValueText value={question.answer} />
						)}
					</FieldCard>
				))}
			</CardGrid>
		</Section>
	);
}

function ProcurementInquiryPositionCard({
	item,
	index,
	onEditSupplier,
	onRemoveSupplier,
}: {
	item: ProcurementItem;
	index: number;
	onEditSupplier: () => void;
	onRemoveSupplier: () => void;
}) {
	const supplier = item.currentSupplier;
	return (
		<section
			aria-label={`Позиция ${index + 1}`}
			data-testid={`procurement-inquiry-item-${item.id}`}
			className="relative flex flex-col gap-4 rounded-xl border border-border/60 bg-card/40 p-4"
		>
			<FieldCardLine label="Название" value={item.name} />
			<FieldCardLine label="Спецификация" value={item.description ?? ""} />
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<FieldCardLine label="Ед. изм." value={item.unit ?? ""} />
				<FieldCardLine
					label="Кол-во в поставке"
					value={item.quantityPerDelivery != null ? String(item.quantityPerDelivery) : ""}
				/>
				<FieldCardLine label="Объём в год" value={String(item.annualQuantity)} />
			</div>
			{supplier ? (
				<CurrentSupplierInlineSummary supplier={supplier} onEdit={onEditSupplier} onRemove={onRemoveSupplier} />
			) : (
				<Button
					type="button"
					variant="outline"
					onClick={onEditSupplier}
					aria-label="Добавить текущего поставщика"
					className="w-full border-dashed border-foreground/25 text-foreground/80 hover:border-foreground/45 hover:bg-background hover:text-foreground dark:border-foreground/30 dark:hover:bg-background"
				>
					<Plus aria-hidden="true" className="size-4" />
					Добавить текущего поставщика
				</Button>
			)}
		</section>
	);
}

function CurrentSupplierInlineSummary({
	supplier,
	onEdit,
	onRemove,
}: {
	supplier: NonNullable<ProcurementItem["currentSupplier"]>;
	onEdit: () => void;
	onRemove: () => void;
}) {
	return (
		<div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/60 p-3 dark:bg-input/20">
			<div className="flex items-start gap-2">
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
						Текущий поставщик
					</span>
					<span className="text-sm font-medium text-foreground break-words">
						{supplier.companyName || supplier.inn || "—"}
					</span>
					{supplier.companyName && supplier.inn && (
						<span className="text-xs text-muted-foreground tabular-nums">ИНН {supplier.inn}</span>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Button type="button" variant="ghost" size="sm" onClick={onEdit}>
						Изменить
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={onRemove}
						aria-label="Удалить текущего поставщика"
						className="relative text-muted-foreground hover:text-foreground before:absolute before:-inset-1.5 before:content-['']"
					>
						<X aria-hidden="true" className="size-4" />
					</Button>
				</div>
			</div>
			<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
				<span className="text-muted-foreground">
					Цена:{" "}
					<span className="text-foreground">
						{supplier.pricePerUnit != null ? formatCurrency(supplier.pricePerUnit) : "—"}
					</span>
				</span>
				<span className="text-muted-foreground">
					Доставка:{" "}
					<span className="text-foreground">
						{supplier.deliveryCost == null ? "Включена" : formatCurrency(supplier.deliveryCost)}
					</span>
				</span>
				{supplier.leadTimeDays != null && (
					<span className="text-muted-foreground">
						Срок: <span className="text-foreground">{supplier.leadTimeDays} дн.</span>
					</span>
				)}
				{supplier.paymentType && (
					<span className="text-muted-foreground">
						Оплата:{" "}
						<span className="text-foreground">
							{formatPaymentType(supplier.paymentType, {
								deferralDays: supplier.deferralDays ?? 0,
								prepaymentPercent: supplier.prepaymentPercent,
							})}
						</span>
					</span>
				)}
			</div>
		</div>
	);
}

function FieldCardLine({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
			<ValueText value={value} />
		</div>
	);
}
