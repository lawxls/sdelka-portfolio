import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { FilterChip } from "@/components/filter-chip";
import { PageToolbar } from "@/components/page-toolbar";
import { PositionsUploadDialog } from "@/components/positions-upload-dialog";
import { ProcurementItemDrawer } from "@/components/procurement-item-drawer";
import { ProcurementTable } from "@/components/procurement-table";
import { Toolbar } from "@/components/toolbar";
import { TotalCount } from "@/components/total-count";
import { useCreateProcurementInquiryWithItems } from "@/data/operations/use-procurement-operations";
import { groupItemsIntoProcurementInquiries } from "@/data/procurement-inquiries/group-items-into-procurement-inquiries";
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
import { useCreateFolder, useDeleteFolder, useFolderStats, useFolders, useUpdateFolder } from "@/data/use-folders";
import {
	buildFilterParams,
	useArchiveItem,
	useDeleteItem,
	useExportItems,
	useItems,
	useTotals,
	useUpdateItem,
} from "@/data/use-items";
import { useProcurementInquiries } from "@/data/use-procurement-inquiries";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { isoDateInDays } from "@/lib/format";

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
	return v === "searching" || v === "searching_completed" || v === "negotiating" || v === "completed" ? v : "all";
}

const DEFAULT_IMPORT_DEADLINE_DAYS = 14;

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
	const procurementInquiry = searchParams.get("procurementInquiry") ?? undefined;
	const isArchiveView = folder === "archive";

	const { data: companies = [] } = useProcurementCompanies();
	const isMultiCompany = companies.length > 1;
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
	} = useItems({ search, filters, sort, folder, company, procurementInquiry });

	const { data: totals, isLoading: totalsLoading } = useTotals({
		search,
		filters,
		folder,
		company,
		procurementInquiry,
	});

	const { data: folders = [], isLoading: foldersLoading } = useFolders(company);
	const { data: counts = { all: 0, none: 0 }, isLoading: statsLoading } = useFolderStats(company);
	const createFolderMutation = useCreateFolder();
	const updateFolderMutation = useUpdateFolder();
	const deleteFolderMutation = useDeleteFolder();

	const { items: procurementInquiryRows } = useProcurementInquiries({ limit: 1000 });
	const procurementInquiryMap = useMemo(() => {
		const map: Record<string, { companyId: string; folderId: string | null }> = {};
		for (const t of procurementInquiryRows) map[t.id] = { companyId: t.companyId, folderId: t.folderId };
		return map;
	}, [procurementInquiryRows]);

	const updateItemMutation = useUpdateItem();
	const deleteItemMutation = useDeleteItem();
	const archiveItemMutation = useArchiveItem();
	const createProcurementInquiryWithItemsMutation = useCreateProcurementInquiryWithItems();
	const exportItemsMutation = useExportItems();

	const isMobile = useIsMobile();
	const [dialogOpen, setDialogOpen] = useState(false);

	function handleExport() {
		exportItemsMutation.mutate(buildFilterParams({ search, filters, folder, sort, company }));
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
			next.delete("folder");
			return next;
		});
	}

	function handleAddPositions() {
		if (isMultiCompany && !company) {
			toast.error("Выберите компанию, чтобы добавить позиции");
			return;
		}
		setDialogOpen(true);
	}

	function handleImportItems(items: NewItemInput[]) {
		const groups = groupItemsIntoProcurementInquiries(items);
		if (groups.length === 0) return;
		if (isMultiCompany && !company) {
			toast.error("Выберите компанию для импорта позиций");
			return;
		}
		const targetCompanyId = company ?? companies[0]?.id;
		if (!targetCompanyId) {
			toast.error("Не удалось определить компанию для импорта");
			return;
		}
		const folderId = folder && folder !== "none" ? folder : null;
		const deadline = isoDateInDays(DEFAULT_IMPORT_DEADLINE_DAYS);
		Promise.allSettled(
			groups.map((group) =>
				createProcurementInquiryWithItemsMutation.mutateAsync({
					procurementInquiry: {
						name: group.name,
						companyId: targetCompanyId,
						folderId,
						budget: 0,
						deadline,
					},
					items: group.items,
				}),
			),
		).then((results) => {
			const created = results.filter((r) => r.status === "fulfilled").length;
			if (created === 0) return;
			toast.success(created === 1 ? "Создан 1 запрос" : `Создано запросов: ${created}`);
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
	if (folder === "none") {
		folderChipLabel = "Без категории";
	} else if (folder) {
		const f = folders.find((ff) => ff.id === folder);
		if (f) {
			folderChipLabel = f.name;
			folderChipColor = f.color;
		}
	}

	function handleArchiveToggle() {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (next.get("folder") === "archive") next.delete("folder");
			else next.set("folder", "archive");
			return next;
		});
	}

	function handleProcurementInquirySelect(procurementInquiryId: string | undefined) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (procurementInquiryId) next.set("procurementInquiry", procurementInquiryId);
			else next.delete("procurementInquiry");
			return next;
		});
	}

	const toolbar = (
		<Toolbar
			filters={filters}
			onFiltersChange={handleFiltersChange}
			sort={sort}
			onSort={handleSort}
			onAddPositions={handleAddPositions}
			onExport={handleExport}
			isArchiveView={isArchiveView}
			onArchiveToggle={handleArchiveToggle}
			folders={folders}
			folderCounts={counts}
			foldersLoading={foldersLoading || statsLoading}
			activeFolder={folder}
			onFolderSelect={handleFolderSelect}
			onCreateFolder={(name, color) => createFolderMutation.mutate({ name, color })}
			onRenameFolder={(id, name) => updateFolderMutation.mutate({ id, name })}
			onRecolorFolder={(id, color) => updateFolderMutation.mutate({ id, color })}
			onDeleteFolder={(id) => deleteFolderMutation.mutate(id)}
			companies={companies}
			selectedCompany={company}
			onCompanySelect={handleCompanySelect}
			showCompanies={isMultiCompany}
			procurementInquiries={procurementInquiryRows}
			selectedProcurementInquiry={procurementInquiry}
			onProcurementInquirySelect={handleProcurementInquirySelect}
		/>
	);

	return (
		<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<PageToolbar
				left={
					<>
						<h1 className="text-sm font-semibold text-foreground leading-none">Позиции</h1>
						<span aria-hidden="true" className="text-sm text-border leading-none">
							/
						</span>
						<TotalCount
							value={totals?.itemCount}
							isLoading={totalsLoading}
							forms={["позиция", "позиции", "позиций"]}
							className="text-sm font-normal text-muted-foreground leading-none"
						/>
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
					procurementInquiryMap={procurementInquiryMap}
					sort={sort}
					hasNextPage={hasNextPage}
					loadMore={loadMore}
					onSort={handleSort}
					onRowClick={handleRowClick}
					onRenameItem={(id, name) => updateItemMutation.mutate({ id, name })}
					onDeleteItem={(id) => deleteItemMutation.mutate(id)}
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

			<PositionsUploadDialog open={dialogOpen} onOpenChange={setDialogOpen} onImport={handleImportItems} />
			<ProcurementItemDrawer item={selectedItem} />
		</div>
	);
}
