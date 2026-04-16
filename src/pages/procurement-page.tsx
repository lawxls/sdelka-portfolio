import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { AddPositionsDialog } from "@/components/add-positions-dialog";
import { AddPositionsDrawer } from "@/components/add-positions-drawer";
import { FilterChip } from "@/components/filter-chip";
import { PageToolbar } from "@/components/page-toolbar";
import { ProcurementItemDrawer } from "@/components/procurement-item-drawer";
import { ProcurementTable } from "@/components/procurement-table";
import { Toolbar } from "@/components/toolbar";
import { TotalCount } from "@/components/total-count";
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

	const { data: companies = [] } = useProcurementCompanies();
	const isMultiCompany = companies.length > 1;

	// Show company badge when multi-company and no company selected
	const showCompanyBadge = isMultiCompany && !company;

	const companyMap = useMemo(() => {
		const map: Record<string, string> = {};
		for (const c of companies) map[c.id] = c.name;
		return map;
	}, [companies]);

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

	const { data: folders = [], isLoading: foldersLoading } = useFolders(company);
	const { data: counts = { all: 0, none: 0 }, isLoading: statsLoading } = useFolderStats(company);
	const createFolderMutation = useCreateFolder();
	const updateFolderMutation = useUpdateFolder();
	const deleteFolderMutation = useDeleteFolder();

	const updateItemMutation = useUpdateItem();
	const deleteItemMutation = useDeleteItem();
	const assignFolderMutation = useAssignFolder();
	const archiveItemMutation = useArchiveItem();
	const createItemsMutation = useCreateItems();
	const exportItemsMutation = useExportItems();

	const isArchiveView = folder === "archive";
	const isMobile = useIsMobile();
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
			folders={folders}
			folderCounts={counts}
			foldersLoading={foldersLoading || statsLoading}
			activeFolder={folder}
			onFolderSelect={handleFolderSelect}
			onCreateFolder={(name) => createFolderMutation.mutate({ name, color: nextUnusedColor(folders) })}
			onRenameFolder={(id, name) => updateFolderMutation.mutate({ id, name })}
			onRecolorFolder={(id, color) => updateFolderMutation.mutate({ id, color })}
			onDeleteFolder={(id) => deleteFolderMutation.mutate(id)}
			companies={companies}
			selectedCompany={company}
			onCompanySelect={handleCompanySelect}
			showCompanies={isMultiCompany}
		/>
	);

	return (
		<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<PageToolbar
				left={
					<>
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
					isLoading={itemsLoading}
					isFetchingNextPage={isFetchingNextPage}
					error={itemsError}
					onRetry={() => refetchItems()}
					isMobile={isMobile}
					companyMap={companyMap}
					showCompanyBadge={showCompanyBadge}
				/>
			</main>

			<AddPositionsDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onManual={() => setDrawerOpen(true)}
				onImport={(items) => handleCreateItems(items, "Позиции импортированы")}
			/>
			<AddPositionsDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSubmit={handleCreateItems} />
			<ProcurementItemDrawer item={selectedItem} />
		</div>
	);
}
