import { Archive, ArchiveRestore } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { FilterChip } from "@/components/filter-chip";
import { PageToolbar } from "@/components/page-toolbar";
import { ProcurementStatusIcon, STATUS_CONFIG } from "@/components/procurement-card";
import { type DeadlineFilter, TendersToolbar } from "@/components/tenders-toolbar";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TenderSummary } from "@/data/domains/tenders";
import { useArchiveTenderCascade } from "@/data/operations/use-procurement-operations";
import type { Folder, TenderStatus } from "@/data/types";
import { useProcurementCompanies } from "@/data/use-companies";
import { useCreateFolder, useDeleteFolder, useFolderStats, useFolders, useUpdateFolder } from "@/data/use-folders";
import { useTenders } from "@/data/use-tenders";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLUMNS = ["№", "НАЗВАНИЕ", "БЮДЖЕТ ₽", "КОЛ-ВО ПОЗИЦИЙ", "КОЛ-ВО КП", "ДАТА СОЗДАНИЯ", "ДЕДЛАЙН"] as const;

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"] as const;

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

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

function formatDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return dateFormatter.format(date);
}

function FolderBadge({ folder }: { folder?: Folder }) {
	if (!folder) return null;
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
				`bg-folder-${folder.color}/15 text-folder-${folder.color}`,
			)}
		>
			{folder.name}
		</span>
	);
}

interface TenderRowProps {
	tender: TenderSummary;
	folders: Folder[];
	onClick: () => void;
	onArchive: (id: string, isArchived: boolean) => void;
	isArchiveView: boolean;
}

function TenderRow({ tender, folders, onClick, onArchive, isArchiveView }: TenderRowProps) {
	const folder = folders.find((f) => f.id === tender.folderId);
	const status = STATUS_CONFIG[tender.status];
	const row = (
		<TableRow data-testid={`tender-row-${tender.id}`} onClick={onClick} className="cursor-pointer">
			<TableCell className="font-mono text-xs text-muted-foreground">{tender.id}</TableCell>
			<TableCell>
				<div className="flex flex-col gap-1">
					<span className="font-medium">{tender.name}</span>
					<div className="flex items-center gap-2">
						<span className={cn("inline-flex items-center gap-1.5 text-xs", status.className)}>
							<ProcurementStatusIcon status={tender.status} />
							{status.label}
						</span>
						{folder && <FolderBadge folder={folder} />}
					</div>
				</div>
			</TableCell>
			<TableCell className="tabular-nums">{formatCurrency(tender.budget)}</TableCell>
			<TableCell className="tabular-nums">{tender.positionsCount}</TableCell>
			<TableCell className="tabular-nums">{tender.kpCount}</TableCell>
			<TableCell className="tabular-nums">{formatDate(tender.createdAt)}</TableCell>
			<TableCell className="tabular-nums">{formatDate(tender.deadline)}</TableCell>
		</TableRow>
	);
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
			<ContextMenuContent>
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
	const folder = searchParams.get("folder") ?? undefined;
	const company = searchParams.get("company") ?? undefined;
	const isArchiveView = folder === "archive";

	const { data: companies = [] } = useProcurementCompanies();
	const isMultiCompany = companies.length > 1;

	const { items, isLoading } = useTenders({
		q: search || undefined,
		status,
		deadline,
		folder,
		company,
	});

	const { data: folders = [], isLoading: foldersLoading } = useFolders(company);
	const { data: counts = { all: 0, none: 0 }, isLoading: statsLoading } = useFolderStats(company);
	const createFolderMutation = useCreateFolder();
	const updateFolderMutation = useUpdateFolder();
	const deleteFolderMutation = useDeleteFolder();
	const archiveTenderMutation = useArchiveTenderCascade();

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
		/>
	);

	function handleRowClick(tender: TenderSummary) {
		navigate(`/tenders/${tender.id}`);
	}

	function handleArchive(id: string, isArchived: boolean) {
		archiveTenderMutation.mutate({ id, isArchived });
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
							{isLoading ? "…" : items.length}
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
				<Table>
					<TableHeader>
						<TableRow>
							{COLUMNS.map((label) => (
								<TableHead key={label}>{label}</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading
							? SKELETON_KEYS.map((key) => (
									<TableRow key={key} data-testid="tenders-skeleton-row">
										{COLUMNS.map((label) => (
											<TableCell key={label}>
												<Skeleton className="h-4 w-20" />
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
										isArchiveView={isArchiveView}
									/>
								))}
					</TableBody>
				</Table>
			</main>
		</div>
	);
}
