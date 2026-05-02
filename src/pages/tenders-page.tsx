import { Archive, ArchiveRestore, ArrowDown, ArrowUp, ArrowUpDown, FolderInput, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { CreateTenderDrawer } from "@/components/create-tender-drawer";
import { FilterChip } from "@/components/filter-chip";
import { InlineRenameInput } from "@/components/inline-rename-input";
import { PageToolbar } from "@/components/page-toolbar";
import { ProcurementStatusIcon, STATUS_CONFIG } from "@/components/procurement-card";
import { type DeadlineFilter, TendersToolbar } from "@/components/tenders-toolbar";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TenderSortDirection, TenderSortField, TenderSummary } from "@/data/domains/tenders";
import { useArchiveTenderCascade, useCreateTenderWithItems } from "@/data/operations/use-procurement-operations";
import type { Folder, TenderStatus } from "@/data/types";
import { useProcurementCompanies } from "@/data/use-companies";
import { useCreateFolder, useDeleteFolder, useFolderStats, useFolders, useUpdateFolder } from "@/data/use-folders";
import { useDeleteTender, useTenders, useUpdateTender } from "@/data/use-tenders";
import { useMenuEditGuard } from "@/hooks/use-menu-edit-guard";
import { formatCurrency, formatDayMonthShort, formatRussianPlural } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ColumnDef {
	label: string;
	align: "left" | "right" | "center";
	field?: TenderSortField;
}

const COLUMNS: readonly ColumnDef[] = [
	{ label: "№", align: "left" },
	{ label: "НАЗВАНИЕ", align: "left" },
	{ label: "БЮДЖЕТ", align: "right", field: "budget" },
	{ label: "ВСЕГО ПОСТАВЩИКОВ", align: "right", field: "suppliersCount" },
	{ label: "ПОЛУЧЕНО КП", align: "right", field: "kpCount" },
	{ label: "ДАТА СОЗДАНИЯ", align: "right", field: "createdAt" },
	{ label: "ДЕДЛАЙН", align: "right", field: "deadline" },
] as const;

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"] as const;

const TENDER_SORT_FIELDS: ReadonlySet<string> = new Set([
	"budget",
	"suppliersCount",
	"kpCount",
	"createdAt",
	"deadline",
]);

interface TenderSortState {
	field: TenderSortField;
	direction: TenderSortDirection;
}

const TENDER_STATUSES: ReadonlySet<TenderStatus> = new Set([
	"searching",
	"searching_completed",
	"negotiating",
	"completed",
]);

function parseStatus(params: URLSearchParams): TenderStatus | undefined {
	const v = params.get("status");
	return v && TENDER_STATUSES.has(v as TenderStatus) ? (v as TenderStatus) : undefined;
}

function parseDeadline(params: URLSearchParams): DeadlineFilter {
	const v = params.get("deadline");
	return v === "overdue" || v === "soon" ? v : "all";
}

function parseSort(params: URLSearchParams): TenderSortState | null {
	const field = params.get("sort");
	const dir = params.get("dir");
	if (!field || !TENDER_SORT_FIELDS.has(field) || (dir !== "asc" && dir !== "desc")) return null;
	return { field: field as TenderSortField, direction: dir };
}

function FolderBadge({ folder }: { folder?: Folder }) {
	if (!folder) return null;
	return (
		<div
			className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#ebebed] px-2 py-0.5 dark:bg-[#35353a]"
			data-testid={`folder-badge-${folder.id}`}
		>
			<span
				className="size-2 shrink-0 rounded-full"
				style={{ backgroundColor: `var(--folder-${folder.color})` }}
				aria-hidden="true"
			/>
			<span className="text-xs text-muted-foreground">{folder.name}</span>
		</div>
	);
}

function SortIcon({ field, sort }: { field: TenderSortField; sort: TenderSortState | null }) {
	if (sort?.field !== field)
		return <ArrowUpDown className="size-3.5 opacity-50 transition-opacity" aria-hidden="true" />;
	return sort.direction === "asc" ? (
		<ArrowUp className="size-3.5" aria-hidden="true" />
	) : (
		<ArrowDown className="size-3.5" aria-hidden="true" />
	);
}

function SortableHeaderButton({
	col,
	sort,
	onSort,
}: {
	col: ColumnDef & { field: TenderSortField };
	sort: TenderSortState | null;
	onSort: (field: TenderSortField) => void;
}) {
	return (
		<button
			type="button"
			className={cn(
				"inline-flex items-center gap-1 transition-colors hover:text-foreground",
				col.align === "right" && "ml-auto",
			)}
			onClick={() => onSort(col.field)}
			aria-label={`Сортировать по ${col.label}`}
		>
			{col.label}
			<SortIcon field={col.field} sort={sort} />
		</button>
	);
}

interface TenderRowProps {
	tender: TenderSummary;
	folders: Folder[];
	onClick: () => void;
	onArchive: (id: string, isArchived: boolean) => void;
	onRename: (id: string) => void;
	onMoveToFolder: (id: string, folderId: string | null) => void;
	onDelete: (tender: TenderSummary) => void;
	isArchiveView: boolean;
	isEditing: boolean;
	onSaveRename: (id: string, name: string) => void;
	onCancelRename: () => void;
}

function TenderRow({
	tender,
	folders,
	onClick,
	onArchive,
	onRename,
	onMoveToFolder,
	onDelete,
	isArchiveView,
	isEditing,
	onSaveRename,
	onCancelRename,
}: TenderRowProps) {
	const folder = folders.find((f) => f.id === tender.folderId);
	const status = STATUS_CONFIG[tender.status];
	const { willEditRef, onCloseAutoFocus } = useMenuEditGuard();
	const row = (
		<TableRow
			data-testid={`tender-row-${tender.id}`}
			onClick={isEditing ? undefined : onClick}
			className={isEditing ? "" : "cursor-pointer"}
		>
			<TableCell className="font-mono text-xs text-muted-foreground">{tender.id}</TableCell>
			<TableCell className="font-medium">
				<div className="max-w-[350px]">
					<div className="flex items-center gap-2 min-w-0">
						{isEditing ? (
							<InlineRenameInput
								defaultValue={tender.name}
								onSave={(name) => onSaveRename(tender.id, name)}
								onCancel={onCancelRename}
							/>
						) : (
							<span className="truncate">{tender.name}</span>
						)}
						{folder && <FolderBadge folder={folder} />}
					</div>
					<div className="mt-0.5">
						<span className={cn("relative z-10 inline-flex items-center gap-1.5 py-0.5 text-xs", status.className)}>
							<ProcurementStatusIcon status={tender.status} />
							{status.label}
						</span>
					</div>
				</div>
			</TableCell>
			<TableCell className="text-right tabular-nums">{formatCurrency(tender.budget)}</TableCell>
			<TableCell className="text-right tabular-nums">{tender.suppliersCount}</TableCell>
			<TableCell className="text-right tabular-nums">{tender.kpCount}</TableCell>
			<TableCell className="text-right tabular-nums">{formatDayMonthShort(tender.createdAt)}</TableCell>
			<TableCell className="text-right tabular-nums">{formatDayMonthShort(tender.deadline)}</TableCell>
		</TableRow>
	);
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
			<ContextMenuContent onCloseAutoFocus={onCloseAutoFocus}>
				<ContextMenuItem
					onSelect={() => {
						willEditRef.current = true;
						onRename(tender.id);
					}}
				>
					<Pencil className="size-3.5" />
					Переименовать
				</ContextMenuItem>
				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<FolderInput className="size-3.5" />
						Переместить в категорию
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						<ContextMenuItem onSelect={() => onMoveToFolder(tender.id, null)} disabled={tender.folderId === null}>
							Без категории
						</ContextMenuItem>
						{folders.length > 0 && <ContextMenuSeparator />}
						{folders.map((f) => (
							<ContextMenuItem
								key={f.id}
								onSelect={() => onMoveToFolder(tender.id, f.id)}
								disabled={tender.folderId === f.id}
							>
								<span
									className="size-2 rounded-full"
									style={{ backgroundColor: `var(--folder-${f.color})` }}
									aria-hidden="true"
								/>
								{f.name}
							</ContextMenuItem>
						))}
					</ContextMenuSubContent>
				</ContextMenuSub>
				{isArchiveView ? (
					<ContextMenuItem onSelect={() => onArchive(tender.id, false)}>
						<ArchiveRestore className="size-3.5" />
						Восстановить из архива
					</ContextMenuItem>
				) : (
					<ContextMenuItem onSelect={() => onArchive(tender.id, true)}>
						<Archive className="size-3.5" />
						Архив
					</ContextMenuItem>
				)}
				<ContextMenuSeparator />
				<ContextMenuItem variant="destructive" onSelect={() => onDelete(tender)}>
					<Trash2 className="size-3.5" />
					Удалить
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}

export function TendersPage() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();

	const search = searchParams.get("q") ?? "";
	const status = parseStatus(searchParams);
	const deadline = parseDeadline(searchParams);
	const deadlineFrom = searchParams.get("deadlineFrom") ?? undefined;
	const deadlineTo = searchParams.get("deadlineTo") ?? undefined;
	const sort = parseSort(searchParams);
	const folder = searchParams.get("folder") ?? undefined;
	const company = searchParams.get("company") ?? undefined;
	const isArchiveView = folder === "archive";

	const { data: companies = [] } = useProcurementCompanies();
	const isMultiCompany = companies.length > 1;

	const { items, isLoading } = useTenders({
		q: search || undefined,
		status,
		deadline,
		deadlineFrom,
		deadlineTo,
		folder,
		company,
		sort: sort?.field,
		dir: sort?.direction,
	});

	const { data: folders = [], isLoading: foldersLoading } = useFolders(company);
	const { data: counts = { all: 0, none: 0 }, isLoading: statsLoading } = useFolderStats(company);
	const createFolderMutation = useCreateFolder();
	const updateFolderMutation = useUpdateFolder();
	const deleteFolderMutation = useDeleteFolder();
	const archiveTenderMutation = useArchiveTenderCascade();
	const updateTenderMutation = useUpdateTender();
	const deleteTenderMutation = useDeleteTender();
	const createTenderMutation = useCreateTenderWithItems();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [editingTenderId, setEditingTenderId] = useState<string | null>(null);
	const [deletingTender, setDeletingTender] = useState<TenderSummary | null>(null);

	const companyMap = useMemo(() => {
		const map: Record<string, string> = {};
		for (const c of companies) map[c.id] = c.name;
		return map;
	}, [companies]);

	function setParam(key: string, value: string | undefined) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (value === undefined) next.delete(key);
			else next.set(key, value);
			return next;
		});
	}

	function handleStatusChange(next: TenderStatus | undefined) {
		setParam("status", next);
	}

	function handleDeadlineChange(next: DeadlineFilter) {
		setParam("deadline", next === "all" ? undefined : next);
	}

	function handleDeadlineRangeChange(from: string | undefined, to: string | undefined) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (from) next.set("deadlineFrom", from);
			else next.delete("deadlineFrom");
			if (to) next.set("deadlineTo", to);
			else next.delete("deadlineTo");
			return next;
		});
	}

	function handleSort(field: TenderSortField) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			const currentField = next.get("sort");
			const currentDir = next.get("dir");
			if (currentField === field) {
				if (currentDir === "asc") next.set("dir", "desc");
				else {
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

	function handleFolderSelect(next: string | undefined) {
		setParam("folder", next);
	}

	function handleCompanySelect(next: string | undefined) {
		setSearchParams((prev) => {
			const params = new URLSearchParams(prev);
			if (next) params.set("company", next);
			else params.delete("company");
			params.delete("folder");
			return params;
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
		setParam("company", undefined);
	}

	function handleClearFolderFilter() {
		setParam("folder", undefined);
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
		<TendersToolbar
			status={status}
			onStatusChange={handleStatusChange}
			deadline={deadline}
			onDeadlineChange={handleDeadlineChange}
			deadlineFrom={deadlineFrom}
			deadlineTo={deadlineTo}
			onDeadlineRangeChange={handleDeadlineRangeChange}
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
			isArchiveView={isArchiveView}
			onArchiveToggle={handleArchiveToggle}
			onCreateTender={() => setDrawerOpen(true)}
		/>
	);

	function handleRowClick(tender: TenderSummary) {
		navigate({ pathname: `/tenders/${tender.id}`, search: searchParams.toString() });
	}

	function handleArchive(id: string, isArchived: boolean) {
		archiveTenderMutation.mutate({ id, isArchived });
	}

	function handleRename(id: string) {
		setEditingTenderId(id);
	}

	function handleSaveRename(id: string, name: string) {
		updateTenderMutation.mutate({ id, patch: { name } });
		setEditingTenderId(null);
	}

	function handleCancelRename() {
		setEditingTenderId(null);
	}

	function handleMoveToFolder(id: string, folderId: string | null) {
		updateTenderMutation.mutate({ id, patch: { folderId } });
	}

	function handleConfirmDelete() {
		if (!deletingTender) return;
		deleteTenderMutation.mutate(deletingTender.id, {
			onSuccess: () => toast.success(`Тендер ${deletingTender.id} удалён`),
		});
		setDeletingTender(null);
	}

	return (
		<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<PageToolbar
				left={
					<>
						<h1 className="text-sm font-semibold leading-none">Тендеры</h1>
						<span aria-hidden="true" className="text-sm leading-none text-border">
							/
						</span>
						<span className="text-sm font-normal leading-none text-muted-foreground tabular-nums">
							{isLoading ? "…" : formatRussianPlural(items.length, ["тендер", "тендера", "тендеров"])}
						</span>
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
				<div className="flex flex-1 flex-col overflow-auto [&_tr>*:first-child]:pl-lg [&_tr>*:last-child]:pr-lg">
					<Table>
						<TableHeader>
							<TableRow>
								{COLUMNS.map((col) =>
									col.field ? (
										<TableHead
											key={col.label}
											className={cn(col.align === "right" && "text-right", col.align === "center" && "text-center")}
										>
											<SortableHeaderButton
												col={col as ColumnDef & { field: TenderSortField }}
												sort={sort}
												onSort={handleSort}
											/>
										</TableHead>
									) : (
										<TableHead
											key={col.label}
											className={cn(col.align === "right" && "text-right", col.align === "center" && "text-center")}
										>
											{col.label}
										</TableHead>
									),
								)}
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading
								? SKELETON_KEYS.map((key) => (
										<TableRow key={key} data-testid="tenders-skeleton-row">
											{COLUMNS.map((col) => (
												<TableCell
													key={col.label}
													className={cn(col.align === "right" && "text-right", col.align === "center" && "text-center")}
												>
													<Skeleton
														className={cn(
															"h-4 w-20",
															col.align === "right" && "ml-auto",
															col.align === "center" && "mx-auto",
														)}
													/>
												</TableCell>
											))}
										</TableRow>
									))
								: items.map((tender) => (
										<TenderRow
											key={tender.id}
											tender={tender}
											folders={folders}
											onClick={() => handleRowClick(tender)}
											onArchive={handleArchive}
											onRename={handleRename}
											onMoveToFolder={handleMoveToFolder}
											onDelete={setDeletingTender}
											isArchiveView={isArchiveView}
											isEditing={editingTenderId === tender.id}
											onSaveRename={handleSaveRename}
											onCancelRename={handleCancelRename}
										/>
									))}
						</TableBody>
					</Table>
				</div>
			</main>
			<CreateTenderDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				onSubmit={(payload) => {
					createTenderMutation.mutate(payload, {
						onSuccess: ({ tender }) => {
							toast.success(`Тендер ${tender.id} создан`);
						},
					});
				}}
			/>
			{deletingTender && (
				<AlertDialog open onOpenChange={(open) => !open && setDeletingTender(null)}>
					<AlertDialogContent size="sm">
						<AlertDialogHeader>
							<AlertDialogTitle>Удалить тендер?</AlertDialogTitle>
							<AlertDialogDescription className="text-pretty">
								«{deletingTender.name}» будет удалён вместе с привязанными позициями.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel onClick={() => setDeletingTender(null)}>Отмена</AlertDialogCancel>
							<AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
								Удалить
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</div>
	);
}
