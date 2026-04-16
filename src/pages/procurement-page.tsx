import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	pointerWithin,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { PanelLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { AddPositionsDialog } from "@/components/add-positions-dialog";
import { AddPositionsDrawer } from "@/components/add-positions-drawer";
import { CompanyDrawer, parseCompanyTab } from "@/components/company-drawer";
import { FilterChip } from "@/components/filter-chip";
import { DESKTOP_QUERY, LS_SIDEBAR_KEY } from "@/components/folder-sidebar";
import { PageToolbar } from "@/components/page-toolbar";
import { ProcurementItemDrawer } from "@/components/procurement-item-drawer";
import { ProcurementSidebar } from "@/components/procurement-sidebar";
import { ProcurementTable } from "@/components/procurement-table";
import { Toolbar } from "@/components/toolbar";
import { TotalCount } from "@/components/total-count";
import { Button } from "@/components/ui/button";
import type {
	DeviationFilter,
	FilterState,
	NewItemInput,
	ProcurementItem,
	SortField,
	SortState,
	StatusFilter,
} from "@/data/types";
import { useProcurementCompanies } from "@/data/use-companies";
import {
	nextUnusedColor,
	useCreateFolder,
	useDeleteFolder,
	useFolderStats,
	useFolders,
	useUpdateFolder,
} from "@/data/use-folders";
import {
	buildFilterParams,
	useArchiveItem,
	useAssignFolder,
	useCreateItems,
	useDeleteItem,
	useExportItems,
	useItems,
	useTotals,
	useUpdateItem,
} from "@/data/use-items";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { anchorDragOverlayToCursor } from "@/lib/drag-overlay";

const DRAG_OVERLAY_MODIFIERS = [anchorDragOverlayToCursor];

const SORT_FIELDS = new Set<string>([
	"annualCost",
	"currentPrice",
	"bestPrice",
	"averagePrice",
	"deviation",
	"overpayment",
]);

function parseSort(params: URLSearchParams): SortState | null {
	const field = params.get("sort");
	const dir = params.get("dir");
	if (!field || !SORT_FIELDS.has(field) || (dir !== "asc" && dir !== "desc")) return null;
	return { field: field as SortField, direction: dir };
}

function parseDeviation(params: URLSearchParams): DeviationFilter {
	const v = params.get("deviation");
	return v === "overpaying" || v === "saving" ? v : "all";
}

function parseStatus(params: URLSearchParams): StatusFilter {
	const v = params.get("status");
	return v === "awaiting_analytics" || v === "searching" || v === "negotiating" || v === "completed" ? v : "all";
}

export function DragItemOverlay({ item }: { item: ProcurementItem }) {
	return (
		<div
			className="inline-flex items-center rounded-md bg-background px-3 py-2 text-sm font-medium shadow-lg ring-1 ring-border"
			data-testid="drag-overlay"
		>
			{item.name}
		</div>
	);
}

export function ProcurementPage() {
	const [searchParams, setSearchParams] = useSearchParams();

	const search = searchParams.get("q") ?? "";
	const filters: FilterState = {
		deviation: parseDeviation(searchParams),
		status: parseStatus(searchParams),
	};
	const sort = parseSort(searchParams);
	const folder = searchParams.get("folder") ?? undefined;
	const company = searchParams.get("company") ?? undefined;

	// Companies for multi-company sidebar
	const { data: companies = [], isLoading: companiesLoading } = useProcurementCompanies();
	const isMultiCompany = companies.length > 1;

	// Show company badge when multi-company and no company selected
	const showCompanyBadge = isMultiCompany && !company;

	// Company name map for badges
	const companyMap = useMemo(() => {
		const map: Record<string, string> = {};
		for (const c of companies) map[c.id] = c.name;
		return map;
	}, [companies]);

	// Server-backed item hooks — scoped to selected company
	const {
		items,
		hasNextPage,
		loadMore,
		isLoading: itemsLoading,
		isFetchingNextPage,
		error: itemsError,
		refetch: refetchItems,
	} = useItems({ search, filters, sort, folder, company });

	const { data: totals, isLoading: totalsLoading } = useTotals({ search, filters, folder, company });

	// Server-backed folder hooks — scoped to selected company
	const { data: folders = [], isLoading: foldersLoading } = useFolders(company);
	const { data: counts = { all: 0, none: 0 }, isLoading: statsLoading } = useFolderStats(company);
	const createFolderMutation = useCreateFolder();
	const updateFolderMutation = useUpdateFolder();
	const deleteFolderMutation = useDeleteFolder();

	// Item mutation hooks
	const updateItemMutation = useUpdateItem();
	const deleteItemMutation = useDeleteItem();
	const assignFolderMutation = useAssignFolder();
	const archiveItemMutation = useArchiveItem();
	const createItemsMutation = useCreateItems();
	const exportItemsMutation = useExportItems();

	const isArchiveView = folder === "archive";
	const isMobile = useIsMobile();
	const [sidebarOpen, setSidebarOpen] = useState(() => {
		if (!window.matchMedia(DESKTOP_QUERY).matches) return false;
		return localStorage.getItem(LS_SIDEBAR_KEY) !== "false";
	});
	const [dialogOpen, setDialogOpen] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(false);

	function handleExport() {
		exportItemsMutation.mutate(buildFilterParams({ search, filters, folder, sort, company }));
	}

	function handleSearchChange(query: string) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (query) next.set("q", query);
				else next.delete("q");
				return next;
			},
			{ replace: true },
		);
	}

	function handleFiltersChange(newFilters: FilterState) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (newFilters.deviation !== "all") next.set("deviation", newFilters.deviation);
			else next.delete("deviation");
			if (newFilters.status !== "all") next.set("status", newFilters.status);
			else next.delete("status");
			return next;
		});
	}

	function handleSort(field: SortField) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			const currentField = next.get("sort");
			const currentDir = next.get("dir");
			if (currentField === field) {
				if (currentDir === "asc") {
					next.set("dir", "desc");
				} else {
					next.delete("sort");
					next.delete("dir");
				}
			} else {
				next.set("sort", field);
				next.set("dir", "asc");
			}
			return next;
		});
	}

	function handleCompanySelect(companyId: string | undefined) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (companyId) {
				next.set("company", companyId);
			} else {
				next.delete("company");
			}
			// Changing company clears folder
			next.delete("folder");
			return next;
		});
	}

	// Drag-and-drop
	const [reducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	const [activeItem, setActiveItem] = useState<ProcurementItem | null>(null);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
	);

	function handleDragStart(event: DragStartEvent) {
		const item = items.find((i) => i.id === event.active.id);
		setActiveItem(item ?? null);
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveItem(null);
		if (!event.over) return;
		const itemId = String(event.active.id);
		const targetId = String(event.over.id);
		if (targetId === "archive") {
			archiveItemMutation.mutate({ id: itemId, isArchived: true });
		} else if (targetId === "none") {
			assignFolderMutation.mutate({ id: itemId, folderId: null, ...(isArchiveView && { isArchived: false }) });
		} else if (targetId.startsWith("folder-drop-")) {
			const folderId = targetId.replace("folder-drop-", "");
			assignFolderMutation.mutate({ id: itemId, folderId, ...(isArchiveView && { isArchived: false }) });
		}
	}

	function handleCreateItems(items: NewItemInput[], successMsg?: string) {
		createItemsMutation.mutate(items, {
			onSuccess: (data) => {
				if (data.isAsync) {
					toast.info("Позиции обрабатываются");
				} else if (successMsg) {
					toast.success(successMsg);
				}
			},
		});
	}

	const settingsCompanyId = searchParams.get("settings_company");
	const settingsTab = parseCompanyTab(searchParams.get("settings_tab"));

	function handleCompanySettings(companyId: string) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			next.set("settings_company", companyId);
			next.delete("settings_tab");
			return next;
		});
	}

	function handleSettingsDrawerClose() {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			next.delete("settings_company");
			next.delete("settings_tab");
			return next;
		});
	}

	function handleSettingsTabChange(tab: string) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("settings_tab", tab);
				return next;
			},
			{ replace: true },
		);
	}

	const selectedItemId = searchParams.get("item");
	const selectedItem = selectedItemId ? items.find((i) => i.id === selectedItemId) : undefined;

	function handleRowClick(item: ProcurementItem) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("item", item.id);
				return next;
			},
			{ replace: false },
		);
	}

	function handleFolderSelect(folderId: string | undefined) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (folderId != null) next.set("folder", folderId);
			else next.delete("folder");
			return next;
		});
	}

	function handleArchiveToggle() {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (next.get("folder") === "archive") next.delete("folder");
			else next.set("folder", "archive");
			return next;
		});
	}

	function handleClearCompanyFilter() {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			next.delete("company");
			return next;
		});
	}

	function handleClearFolderFilter() {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			next.delete("folder");
			return next;
		});
	}

	const companyChipLabel = company ? companyMap[company] : undefined;

	let folderChipLabel: string | undefined;
	let folderChipColor: string | undefined;
	if (folder === "archive") {
		folderChipLabel = "Архив";
	} else if (folder === "none") {
		folderChipLabel = "Без категории";
	} else if (folder) {
		const f = folders.find((ff) => ff.id === folder);
		if (f) {
			folderChipLabel = f.name;
			folderChipColor = f.color;
		}
	}

	const toolbar = (
		<Toolbar
			defaultSearch={search}
			onSearchChange={handleSearchChange}
			filters={filters}
			onFiltersChange={handleFiltersChange}
			sort={sort}
			onSort={handleSort}
			onAddPositions={() => setDialogOpen(true)}
			onExport={handleExport}
			isArchiveView={isArchiveView}
			onArchiveToggle={handleArchiveToggle}
		/>
	);

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={pointerWithin}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
				<PageToolbar
					left={
						<>
							{isMobile && (
								<Button
									variant="ghost"
									size="icon-sm"
									className="shrink-0"
									onClick={() => setSidebarOpen(true)}
									aria-label="Открыть боковую панель"
								>
									<PanelLeft className="size-4" />
								</Button>
							)}
							<TotalCount value={totals?.itemCount} isLoading={totalsLoading} />
							{companyChipLabel && (
								<FilterChip
									testId="chip-company"
									label={companyChipLabel}
									onRemove={handleClearCompanyFilter}
									removeAriaLabel={`Снять фильтр компании ${companyChipLabel}`}
								/>
							)}
							{folderChipLabel && (
								<FilterChip
									testId="chip-folder"
									label={folderChipLabel}
									color={folderChipColor}
									onRemove={handleClearFolderFilter}
									removeAriaLabel={`Снять фильтр категории ${folderChipLabel}`}
								/>
							)}
						</>
					}
					middle={toolbar}
				/>

				<div className="flex min-h-0 min-w-0 flex-1">
					<ProcurementSidebar
						folders={folders}
						counts={counts}
						activeFolder={folder}
						isLoading={foldersLoading || statsLoading}
						open={sidebarOpen}
						onOpenChange={setSidebarOpen}
						onFolderSelect={handleFolderSelect}
						onCreateFolder={(name) => createFolderMutation.mutate({ name, color: nextUnusedColor(folders) })}
						onRenameFolder={(id, name) => updateFolderMutation.mutate({ id, name })}
						onRecolorFolder={(id, color) => updateFolderMutation.mutate({ id, color })}
						onDeleteFolder={(id) => deleteFolderMutation.mutate(id)}
						companies={companies}
						companiesLoading={companiesLoading}
						selectedCompany={company}
						isMultiCompany={isMultiCompany}
						onCompanySelect={handleCompanySelect}
						onCompanySettings={handleCompanySettings}
					/>
					<main className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/50">
						<ProcurementTable
							items={items}
							folders={folders}
							sort={sort}
							hasNextPage={hasNextPage}
							loadMore={loadMore}
							onSort={handleSort}
							onRowClick={handleRowClick}
							onRenameItem={(id, name) => updateItemMutation.mutate({ id, name })}
							onDeleteItem={(id) => deleteItemMutation.mutate(id)}
							onAssignFolder={(itemId, folderId) => assignFolderMutation.mutate({ id: itemId, folderId })}
							onArchiveItem={(id, isArchived) => archiveItemMutation.mutate({ id, isArchived })}
							isArchiveView={isArchiveView}
							draggable={!isMobile}
							activeItemId={activeItem?.id}
							isLoading={itemsLoading}
							isFetchingNextPage={isFetchingNextPage}
							error={itemsError}
							onRetry={() => refetchItems()}
							isMobile={isMobile}
							companyMap={companyMap}
							showCompanyBadge={showCompanyBadge}
						/>
					</main>
				</div>
			</div>

			<DragOverlay dropAnimation={reducedMotion ? null : undefined} modifiers={DRAG_OVERLAY_MODIFIERS}>
				{activeItem ? <DragItemOverlay item={activeItem} /> : null}
			</DragOverlay>
			<div data-testid="dnd-overlay-container" aria-hidden="true" />

			<AddPositionsDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onManual={() => setDrawerOpen(true)}
				onImport={(items) => handleCreateItems(items, "Позиции импортированы")}
			/>
			<AddPositionsDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSubmit={handleCreateItems} />
			<ProcurementItemDrawer item={selectedItem} />
			<CompanyDrawer
				companyId={settingsCompanyId}
				activeTab={settingsTab}
				onClose={handleSettingsDrawerClose}
				onTabChange={handleSettingsTabChange}
			/>
		</DndContext>
	);
}
