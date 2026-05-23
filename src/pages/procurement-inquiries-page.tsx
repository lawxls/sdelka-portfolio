import {
	Archive,
	ArchiveRestore,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	FileText,
	FolderInput,
	Pencil,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { CreateProcurementInquiryDrawer } from "@/components/create-procurement-inquiry-drawer";
import { FilterChip } from "@/components/filter-chip";
import { InlineRenameInput } from "@/components/inline-rename-input";
import { InquiryCard } from "@/components/inquiry-card";
import { PageToolbar } from "@/components/page-toolbar";
import { ProcurementStatusIcon, STATUS_CONFIG } from "@/components/procurement-card";
import { type DeadlineFilter, ProcurementInquiriesToolbar } from "@/components/procurement-inquiries-toolbar";
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
import type {
	ProcurementInquiry,
	ProcurementInquirySortDirection,
	ProcurementInquirySortField,
} from "@/data/domains/procurement-inquiries";
import {
	useArchiveProcurementInquiryCascade,
	useCreateProcurementInquiryWithItems,
} from "@/data/operations/use-procurement-operations";
import type { Folder, ProcurementInquiryStatus } from "@/data/types";
import { useProcurementCompanies } from "@/data/use-companies";
import { useCreateFolder, useDeleteFolder, useFolderStats, useFolders, useUpdateFolder } from "@/data/use-folders";
import {
	useDeleteProcurementInquiry,
	useProcurementInquiries,
	useUpdateProcurementInquiry,
} from "@/data/use-procurement-inquiries";
import { useSubscription } from "@/data/use-subscription";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useMenuEditGuard } from "@/hooks/use-menu-edit-guard";
import { useModuleGuard } from "@/hooks/use-module-guard";
import { formatDayMonthShort, formatRussianPlural } from "@/lib/format";
import { inquiryDetailPath } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

interface ColumnDef {
	label: string;
	align: "left" | "right" | "center";
	field?: ProcurementInquirySortField;
}

const COLUMNS: readonly ColumnDef[] = [
	{ label: "№", align: "center" },
	{ label: "НАЗВАНИЕ", align: "left" },
	{ label: "ВСЕГО ПОСТАВЩИКОВ", align: "center", field: "suppliersCount" },
	{ label: "ПОЛУЧЕНО КП", align: "center", field: "kpCount" },
	{ label: "ВОПРОСЫ", align: "center", field: "tasksCount" },
	{ label: "ДЕДЛАЙН", align: "center", field: "deadline" },
	{ label: "ДАТА СОЗДАНИЯ", align: "center", field: "createdAt" },
] as const;

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"] as const;

const PROCUREMENT_INQUIRY_SORT_FIELDS: ReadonlySet<string> = new Set([
	"suppliersCount",
	"kpCount",
	"tasksCount",
	"createdAt",
	"deadline",
]);

interface ProcurementInquirySortState {
	field: ProcurementInquirySortField;
	direction: ProcurementInquirySortDirection;
}

const PROCUREMENT_INQUIRY_STATUSES: ReadonlySet<ProcurementInquiryStatus> = new Set([
	"searching",
	"searching_completed",
	"negotiating",
	"completed",
]);

function parseStatus(params: URLSearchParams): ProcurementInquiryStatus | undefined {
	const v = params.get("status");
	return v && PROCUREMENT_INQUIRY_STATUSES.has(v as ProcurementInquiryStatus)
		? (v as ProcurementInquiryStatus)
		: undefined;
}

function parseDeadline(params: URLSearchParams): DeadlineFilter {
	const v = params.get("deadline");
	return v === "overdue" || v === "soon" ? v : "all";
}

function parseSort(params: URLSearchParams): ProcurementInquirySortState | null {
	const field = params.get("sort");
	const dir = params.get("dir");
	if (!field || !PROCUREMENT_INQUIRY_SORT_FIELDS.has(field) || (dir !== "asc" && dir !== "desc")) return null;
	return { field: field as ProcurementInquirySortField, direction: dir };
}

function InquiriesEmptyState({ className }: { className?: string }) {
	return (
		<div
			className={cn("flex flex-col items-center justify-center gap-3 text-muted-foreground", className)}
			data-testid="procurement-inquiries-empty"
		>
			<FileText className="size-8" aria-hidden="true" />
			<p className="text-sm">Создайте свой первый запрос</p>
		</div>
	);
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

function SortIcon({ field, sort }: { field: ProcurementInquirySortField; sort: ProcurementInquirySortState | null }) {
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
	col: ColumnDef & { field: ProcurementInquirySortField };
	sort: ProcurementInquirySortState | null;
	onSort: (field: ProcurementInquirySortField) => void;
}) {
	return (
		<button
			type="button"
			className={cn(
				"inline-flex items-center gap-1 transition-colors hover:text-foreground",
				col.align === "right" && "ml-auto",
				col.align === "center" && "mx-auto",
			)}
			onClick={() => onSort(col.field)}
			aria-label={`Сортировать по ${col.label}`}
		>
			{col.label}
			<SortIcon field={col.field} sort={sort} />
		</button>
	);
}

interface ProcurementInquiryRowProps {
	procurementInquiry: ProcurementInquiry;
	rowNumber: number;
	folders: Folder[];
	onClick: () => void;
	onArchive: (id: string, isArchived: boolean) => void;
	onRename: (id: string) => void;
	onMoveToFolder: (id: string, folderId: string | null) => void;
	onDelete: (procurementInquiry: ProcurementInquiry) => void;
	isArchiveView: boolean;
	isEditing: boolean;
	onSaveRename: (id: string, name: string) => void;
	onCancelRename: () => void;
}

function ProcurementInquiryRow({
	procurementInquiry,
	rowNumber,
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
}: ProcurementInquiryRowProps) {
	const folder = folders.find((f) => f.id === procurementInquiry.folderId);
	const status = STATUS_CONFIG[procurementInquiry.status];
	const { willEditRef, onCloseAutoFocus } = useMenuEditGuard();
	const row = (
		<TableRow
			data-testid={`procurement-inquiry-row-${procurementInquiry.id}`}
			onClick={isEditing ? undefined : onClick}
			className={isEditing ? "" : "cursor-pointer"}
		>
			<TableCell className="text-center tabular-nums text-muted-foreground">{rowNumber}</TableCell>
			<TableCell className="font-medium">
				<div className="max-w-[350px]">
					<div className="flex items-center gap-2 min-w-0">
						{isEditing ? (
							<InlineRenameInput
								defaultValue={procurementInquiry.name}
								onSave={(name) => onSaveRename(procurementInquiry.id, name)}
								onCancel={onCancelRename}
							/>
						) : (
							<span className="truncate">{procurementInquiry.name}</span>
						)}
						{folder && <FolderBadge folder={folder} />}
					</div>
					<div className="mt-0.5">
						<span className={cn("relative z-10 inline-flex items-center gap-1.5 py-0.5 text-xs", status.className)}>
							<ProcurementStatusIcon status={procurementInquiry.status} />
							{status.label}
						</span>
					</div>
				</div>
			</TableCell>
			<TableCell className="text-center tabular-nums">{procurementInquiry.suppliersCount}</TableCell>
			<TableCell className="text-center tabular-nums">{procurementInquiry.kpCount}</TableCell>
			<TableCell className="text-center tabular-nums">
				{procurementInquiry.tasksCount > 0 ? (
					procurementInquiry.tasksCount
				) : (
					<span className="text-muted-foreground">—</span>
				)}
			</TableCell>
			<TableCell className="text-center tabular-nums">
				{procurementInquiry.deadline ? (
					formatDayMonthShort(procurementInquiry.deadline)
				) : (
					<span className="text-muted-foreground">—</span>
				)}
			</TableCell>
			<TableCell className="text-center tabular-nums">{formatDayMonthShort(procurementInquiry.createdAt)}</TableCell>
		</TableRow>
	);
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
			<ContextMenuContent onCloseAutoFocus={onCloseAutoFocus}>
				<ContextMenuItem
					onSelect={() => {
						willEditRef.current = true;
						onRename(procurementInquiry.id);
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
						<ContextMenuItem
							onSelect={() => onMoveToFolder(procurementInquiry.id, null)}
							disabled={procurementInquiry.folderId === null}
						>
							Без категории
						</ContextMenuItem>
						{folders.length > 0 && <ContextMenuSeparator />}
						{folders.map((f) => (
							<ContextMenuItem
								key={f.id}
								onSelect={() => onMoveToFolder(procurementInquiry.id, f.id)}
								disabled={procurementInquiry.folderId === f.id}
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
					<ContextMenuItem onSelect={() => onArchive(procurementInquiry.id, false)}>
						<ArchiveRestore className="size-3.5" />
						Восстановить из архива
					</ContextMenuItem>
				) : (
					<ContextMenuItem onSelect={() => onArchive(procurementInquiry.id, true)}>
						<Archive className="size-3.5" />
						Архив
					</ContextMenuItem>
				)}
				<ContextMenuSeparator />
				<ContextMenuItem variant="destructive" onSelect={() => onDelete(procurementInquiry)}>
					<Trash2 className="size-3.5" />
					Удалить
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}

export function ProcurementInquiriesPage() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const isMobile = useIsMobile();

	const search = searchParams.get("q") ?? "";
	const status = parseStatus(searchParams);
	const deadline = parseDeadline(searchParams);
	const deadlineFrom = searchParams.get("deadlineFrom") ?? undefined;
	const deadlineTo = searchParams.get("deadlineTo") ?? undefined;
	const createdAtFrom = searchParams.get("createdAtFrom") ?? undefined;
	const createdAtTo = searchParams.get("createdAtTo") ?? undefined;
	const sort = parseSort(searchParams);
	const folder = searchParams.get("folder") ?? undefined;
	const company = searchParams.get("company") ?? undefined;
	const isArchiveView = folder === "archive";

	const { data: companies = [] } = useProcurementCompanies();
	const isMultiCompany = companies.length > 1;

	const { items, isLoading } = useProcurementInquiries({
		q: search || undefined,
		status,
		deadline,
		deadlineFrom,
		deadlineTo,
		createdAtFrom,
		createdAtTo,
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
	const archiveProcurementInquiryMutation = useArchiveProcurementInquiryCascade();
	const updateProcurementInquiryMutation = useUpdateProcurementInquiry();
	const deleteProcurementInquiryMutation = useDeleteProcurementInquiry();
	const createProcurementInquiryMutation = useCreateProcurementInquiryWithItems();
	const { guard: inquiriesGuard } = useModuleGuard("procurementInquiries");
	const { data: subscription } = useSubscription();
	const inquiriesLimitReached =
		subscription !== undefined &&
		subscription.requests_limit > 0 &&
		subscription.requests_used >= subscription.requests_limit;
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [editingProcurementInquiryId, setEditingProcurementInquiryId] = useState<string | null>(null);
	const [deletingProcurementInquiry, setDeletingProcurementInquiry] = useState<ProcurementInquiry | null>(null);

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

	function handleStatusChange(next: ProcurementInquiryStatus | undefined) {
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

	function handleCreatedAtRangeChange(from: string | undefined, to: string | undefined) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (from) next.set("createdAtFrom", from);
			else next.delete("createdAtFrom");
			if (to) next.set("createdAtTo", to);
			else next.delete("createdAtTo");
			return next;
		});
	}

	function handleSort(field: ProcurementInquirySortField) {
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
	if (folder === "none") {
		folderChipLabel = "Без категории";
	} else if (folder && folder !== "archive") {
		const f = folders.find((ff) => ff.id === folder);
		if (f) {
			folderChipLabel = f.name;
			folderChipColor = f.color;
		}
	}

	const toolbar = (
		<ProcurementInquiriesToolbar
			status={status}
			onStatusChange={handleStatusChange}
			deadline={deadline}
			onDeadlineChange={handleDeadlineChange}
			deadlineFrom={deadlineFrom}
			deadlineTo={deadlineTo}
			onDeadlineRangeChange={handleDeadlineRangeChange}
			createdAtFrom={createdAtFrom}
			createdAtTo={createdAtTo}
			onCreatedAtRangeChange={handleCreatedAtRangeChange}
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
			onCreateProcurementInquiry={inquiriesGuard(() => {
				if (inquiriesLimitReached) {
					toast.error("Достигнут лимит запросов. Перейдите на другой тариф или докупите запросы отдельно");
					return;
				}
				setDrawerOpen(true);
			})}
		/>
	);

	function handleRowClick(procurementInquiry: ProcurementInquiry) {
		navigate({ pathname: inquiryDetailPath(procurementInquiry.id), search: searchParams.toString() });
	}

	const handleArchive = inquiriesGuard((id: string, isArchived: boolean) => {
		archiveProcurementInquiryMutation.mutate({ id, isArchived });
	});

	function handleRename(id: string) {
		setEditingProcurementInquiryId(id);
	}

	function handleSaveRename(id: string, name: string) {
		updateProcurementInquiryMutation.mutate({ id, patch: { name } });
		setEditingProcurementInquiryId(null);
	}

	function handleCancelRename() {
		setEditingProcurementInquiryId(null);
	}

	function handleMoveToFolder(id: string, folderId: string | null) {
		updateProcurementInquiryMutation.mutate({ id, patch: { folderId } });
	}

	const handleConfirmDelete = inquiriesGuard(() => {
		if (!deletingProcurementInquiry) return;
		deleteProcurementInquiryMutation.mutate(deletingProcurementInquiry.id, {
			onSuccess: () => toast.success(`Запрос ${deletingProcurementInquiry.id} удалён`),
		});
		setDeletingProcurementInquiry(null);
	});

	return (
		<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<PageToolbar
				left={
					<>
						<h1 className="text-sm font-semibold leading-none">Запросы</h1>
						<span aria-hidden="true" className="text-sm leading-none text-border">
							/
						</span>
						<span className="text-sm font-normal leading-none text-muted-foreground tabular-nums">
							{isLoading ? "…" : formatRussianPlural(items.length, ["запрос", "запроса", "запросов"])}
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
				{isMobile ? (
					<div className="flex flex-1 flex-col overflow-auto touch-manipulation">
						{isLoading && (
							<div className="flex flex-col gap-3 p-4">
								{SKELETON_KEYS.map((key) => (
									<div
										key={key}
										data-testid="procurement-inquiries-skeleton-card"
										className="rounded-lg border bg-background p-4"
									>
										<Skeleton className="h-3 w-6" />
										<Skeleton className="mt-2 h-4 w-48" />
										<Skeleton className="mt-1 h-3 w-24" />
										<div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
											<Skeleton className="h-8 w-full" />
											<Skeleton className="h-8 w-full" />
											<Skeleton className="h-8 w-full" />
											<Skeleton className="h-8 w-full" />
										</div>
									</div>
								))}
							</div>
						)}
						{!isLoading && items.length === 0 && <InquiriesEmptyState className="h-48" />}
						{!isLoading && items.length > 0 && (
							<div className="flex flex-col gap-3 p-4">
								{items.map((procurementInquiry, index) => (
									<InquiryCard
										key={procurementInquiry.id}
										procurementInquiry={procurementInquiry}
										folders={folders}
										folder={folders.find((f) => f.id === procurementInquiry.folderId)}
										index={index}
										isEditing={editingProcurementInquiryId === procurementInquiry.id}
										isArchiveView={isArchiveView}
										onClick={handleRowClick}
										onArchive={handleArchive}
										onRename={handleRename}
										onSaveRename={handleSaveRename}
										onCancelRename={handleCancelRename}
										onMoveToFolder={handleMoveToFolder}
										onDelete={setDeletingProcurementInquiry}
									/>
								))}
							</div>
						)}
					</div>
				) : (
					<div className="flex flex-1 flex-col overflow-auto [&_tr>*:first-child]:pl-lg [&_tr>*:last-child]:pr-lg">
						<Table>
							<TableHeader>
								<TableRow className="hover:!bg-background">
									{COLUMNS.map((col) => {
										const headClass = cn(
											col.label === "№" && "w-12",
											col.align === "right" && "text-right",
											col.align === "center" && "text-center",
										);
										return col.field ? (
											<TableHead key={col.label} className={headClass}>
												<SortableHeaderButton
													col={col as ColumnDef & { field: ProcurementInquirySortField }}
													sort={sort}
													onSort={handleSort}
												/>
											</TableHead>
										) : (
											<TableHead key={col.label} className={headClass}>
												{col.label}
											</TableHead>
										);
									})}
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading
									? SKELETON_KEYS.map((key) => (
											<TableRow key={key} data-testid="procurement-inquiries-skeleton-row">
												{COLUMNS.map((col) => (
													<TableCell
														key={col.label}
														className={cn(
															col.align === "right" && "text-right",
															col.align === "center" && "text-center",
														)}
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
									: items.map((procurementInquiry, index) => (
											<ProcurementInquiryRow
												key={procurementInquiry.id}
												procurementInquiry={procurementInquiry}
												rowNumber={index + 1}
												folders={folders}
												onClick={() => handleRowClick(procurementInquiry)}
												onArchive={handleArchive}
												onRename={handleRename}
												onMoveToFolder={handleMoveToFolder}
												onDelete={setDeletingProcurementInquiry}
												isArchiveView={isArchiveView}
												isEditing={editingProcurementInquiryId === procurementInquiry.id}
												onSaveRename={handleSaveRename}
												onCancelRename={handleCancelRename}
											/>
										))}
							</TableBody>
						</Table>
						{!isLoading && items.length === 0 && <InquiriesEmptyState className="flex-1" />}
					</div>
				)}
			</main>
			<CreateProcurementInquiryDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				onSubmit={(payload) => {
					createProcurementInquiryMutation.mutate(payload, {
						onSuccess: ({ procurementInquiry }) => {
							toast.success(`Запрос ${procurementInquiry.id} создан`);
						},
					});
				}}
			/>
			{deletingProcurementInquiry && (
				<AlertDialog open onOpenChange={(open) => !open && setDeletingProcurementInquiry(null)}>
					<AlertDialogContent size="sm">
						<AlertDialogHeader>
							<AlertDialogTitle>Удалить запрос?</AlertDialogTitle>
							<AlertDialogDescription className="text-pretty">
								«{deletingProcurementInquiry.name}» будет удалён вместе с привязанными позициями.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel onClick={() => setDeletingProcurementInquiry(null)}>Отмена</AlertDialogCancel>
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
