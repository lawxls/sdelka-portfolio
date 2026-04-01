import { Check, Clock, LoaderCircle, MessageCircle, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { AnalyticsTabPanel } from "@/components/analytics-tab-panel";
import { DetailsTabPanel } from "@/components/details-tab-panel";
import { STATUS_CONFIG } from "@/components/procurement-card";
import { SupplierDetailDrawer } from "@/components/supplier-detail-drawer";
import { SuppliersTable } from "@/components/suppliers-table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { seedItemDetail } from "@/data/item-detail-mock-data";
import type { SupplierSortField, SupplierSortState, SupplierStatus } from "@/data/supplier-types";
import type { ProcurementItem } from "@/data/types";
import { useDeleteSuppliers, useInfiniteSuppliers, useSupplier, useSuppliers } from "@/data/use-suppliers";
import { useIsMobile } from "@/hooks/use-is-mobile";

type ItemDrawerTab = "suppliers" | "analytics" | "details";

const TABS: { key: ItemDrawerTab; label: string }[] = [
	{ key: "suppliers", label: "Поставщики" },
	{ key: "analytics", label: "Аналитика" },
	{ key: "details", label: "Информация" },
];

const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

function parseItemDrawerTab(param: string | null): ItemDrawerTab {
	if (param && VALID_TABS.has(param)) return param as ItemDrawerTab;
	return "suppliers";
}

interface ProcurementItemDrawerProps {
	item?: ProcurementItem;
}

export function ProcurementItemDrawer({ item }: ProcurementItemDrawerProps) {
	const [searchParams, setSearchParams] = useSearchParams();
	const isMobile = useIsMobile();

	const itemId = searchParams.get("item");
	const activeTab = parseItemDrawerTab(searchParams.get("tab"));
	const supplierId = searchParams.get("supplier");
	const open = itemId != null;

	const { data: supplier } = useSupplier(itemId ?? "", supplierId);

	function handleTabChange(tab: ItemDrawerTab) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (tab === "suppliers") {
					next.delete("tab");
				} else {
					next.set("tab", tab);
				}
				return next;
			},
			{ replace: true },
		);
	}

	function handleClose() {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete("item");
				next.delete("tab");
				next.delete("supplier");
				return next;
			},
			{ replace: false },
		);
	}

	function handleSupplierOpen(id: string) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("supplier", id);
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
				return next;
			},
			{ replace: false },
		);
	}

	return (
		<>
			<Sheet
				open={open}
				onOpenChange={(nextOpen) => {
					if (!nextOpen) handleClose();
				}}
			>
				<SheetContent
					side={isMobile ? "bottom" : "right"}
					size={isMobile ? "full" : undefined}
					className={isMobile ? undefined : "!w-2/3 !max-w-none"}
				>
					{itemId && (
						<ProcurementItemDrawerContent
							key={itemId}
							itemId={itemId}
							item={item}
							activeTab={activeTab}
							onTabChange={handleTabChange}
							onSupplierClick={handleSupplierOpen}
						/>
					)}
				</SheetContent>
			</Sheet>
			<SupplierDetailDrawer supplier={supplier ?? null} open={supplierId != null} onClose={handleSupplierClose} />
		</>
	);
}

function SuppliersTabPanel({ itemId, onSupplierClick }: { itemId: string; onSupplierClick: (id: string) => void }) {
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<SupplierSortState>(null);
	const [activeStatuses, setActiveStatuses] = useState<SupplierStatus[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const filterParams = useMemo(
		() => ({
			search: search || undefined,
			statuses: activeStatuses.length > 0 ? activeStatuses : undefined,
			sort: sort?.field,
			dir: sort?.direction,
		}),
		[search, activeStatuses, sort],
	);
	const query = useInfiniteSuppliers(itemId, filterParams);
	const deleteMutation = useDeleteSuppliers();
	const suppliers = query.data?.pages.flatMap((p) => p.suppliers) ?? [];

	function handleSort(field: SupplierSortField) {
		setSort((prev) => {
			if (prev?.field !== field) return { field, direction: "asc" };
			if (prev.direction === "asc") return { field, direction: "desc" };
			return null;
		});
	}

	function handleStatusFilter(status: SupplierStatus) {
		setActiveStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
	}

	function handleSelectionChange(idOrAll: string) {
		if (idOrAll === "all") {
			setSelectedIds((prev) => (prev.size === suppliers.length ? new Set() : new Set(suppliers.map((s) => s.id))));
		} else {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (next.has(idOrAll)) next.delete(idOrAll);
				else next.add(idOrAll);
				return next;
			});
		}
	}

	function handleDelete() {
		const ids = [...selectedIds];
		deleteMutation.mutate(
			{ itemId, supplierIds: ids },
			{
				onSuccess: () => setSelectedIds(new Set()),
			},
		);
	}

	return (
		<div data-testid="tab-panel-suppliers">
			<SuppliersTable
				suppliers={suppliers}
				isLoading={query.isLoading}
				search={search}
				onSearchChange={setSearch}
				sort={sort}
				onSort={handleSort}
				activeStatuses={activeStatuses}
				onStatusFilter={handleStatusFilter}
				selectedIds={selectedIds}
				onSelectionChange={handleSelectionChange}
				onArchive={() => {}}
				isArchiving={false}
				onDelete={handleDelete}
				isDeleting={deleteMutation.isPending}
				onRowClick={onSupplierClick}
				hasNextPage={query.hasNextPage}
				loadMore={query.fetchNextPage}
				isFetchingNextPage={query.isFetchingNextPage}
			/>
		</div>
	);
}

function ProcurementItemDrawerContent({
	itemId,
	item,
	activeTab,
	onTabChange,
	onSupplierClick,
}: {
	itemId: string;
	item?: ProcurementItem;
	activeTab: ItemDrawerTab;
	onTabChange: (tab: ItemDrawerTab) => void;
	onSupplierClick: (id: string) => void;
}) {
	// Idempotent — only seeds if item.id is missing from the mock store
	if (item) seedItemDetail(item);

	const itemName = item?.name;
	const itemStatus = item?.status;
	const { data: allSuppliersData } = useSuppliers(itemId);
	const allSuppliers = allSuppliersData?.suppliers ?? [];

	const totalCount = allSuppliers.length;
	const negotiatingCount = allSuppliers.filter((s) => s.status === "переговоры").length;
	const kpCount = allSuppliers.filter((s) => s.status === "получено_кп").length;

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<SheetHeader>
				<SheetTitle className="flex flex-wrap items-center gap-x-2 gap-y-1">
					<span>{itemName ?? "Позиция"}</span>
					{itemStatus && (
						<>
							<span className="text-muted-foreground/40" aria-hidden="true">
								&bull;
							</span>
							<span
								className={`inline-flex items-center gap-1.5 text-sm font-normal ${STATUS_CONFIG[itemStatus].className}`}
							>
								{itemStatus === "awaiting_analytics" && <Clock className="size-3.5" aria-hidden="true" />}
								{itemStatus === "searching" && <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />}
								{itemStatus === "negotiating" && (
									<span className="size-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />
								)}
								{itemStatus === "completed" && <Check className="size-3.5" aria-hidden="true" />}
								{STATUS_CONFIG[itemStatus].label}
							</span>
						</>
					)}
					{totalCount > 0 && (
						<>
							<span className="text-muted-foreground/40" aria-hidden="true">
								&bull;
							</span>
							<span className="inline-flex items-center gap-3 text-sm font-normal text-muted-foreground">
								<Tooltip>
									<TooltipTrigger asChild>
										<span className="inline-flex items-center gap-1">
											<Users className="size-3.5" aria-hidden="true" />
											{totalCount}
										</span>
									</TooltipTrigger>
									<TooltipContent>Всего поставщиков</TooltipContent>
								</Tooltip>
								{negotiatingCount > 0 && (
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
												<MessageCircle className="size-3.5" aria-hidden="true" />
												{negotiatingCount}
											</span>
										</TooltipTrigger>
										<TooltipContent>Переговоры</TooltipContent>
									</Tooltip>
								)}
								{kpCount > 0 && (
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="inline-flex items-center gap-1 text-[oklch(0.50_0.18_122)] dark:text-primary">
												<Check className="size-3.5" aria-hidden="true" />
												{kpCount}
											</span>
										</TooltipTrigger>
										<TooltipContent>Получено КП</TooltipContent>
									</Tooltip>
								)}
							</span>
						</>
					)}
				</SheetTitle>
				<SheetDescription className="sr-only">Детали позиции закупки</SheetDescription>
			</SheetHeader>

			<div className="flex gap-0 overflow-x-auto border-b border-border px-4" role="tablist">
				{TABS.map((tab) => (
					<button
						key={tab.key}
						type="button"
						role="tab"
						aria-selected={activeTab === tab.key}
						className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors ${
							activeTab === tab.key
								? "border-b-2 border-primary text-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
						onClick={() => onTabChange(tab.key)}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div className={`min-h-0 flex-1 overflow-y-auto ${activeTab === "suppliers" ? "pt-3" : "p-4"}`}>
				{activeTab === "suppliers" && <SuppliersTabPanel itemId={itemId} onSupplierClick={onSupplierClick} />}
				{activeTab === "analytics" && (
					<div data-testid="tab-panel-analytics">
						<AnalyticsTabPanel itemId={itemId} />
					</div>
				)}
				{activeTab === "details" && <DetailsTabPanel itemId={itemId} />}
			</div>
		</div>
	);
}
