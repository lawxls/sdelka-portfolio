import { useNavigate } from "react-router";
import { PageToolbar } from "@/components/page-toolbar";
import { ProcurementStatusIcon, STATUS_CONFIG } from "@/components/procurement-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TenderSummary } from "@/data/domains/tenders";
import type { Folder } from "@/data/types";
import { useFolders } from "@/data/use-folders";
import { useTenders } from "@/data/use-tenders";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLUMNS = ["№", "НАЗВАНИЕ", "БЮДЖЕТ ₽", "КОЛ-ВО ПОЗИЦИЙ", "КОЛ-ВО КП", "ДАТА СОЗДАНИЯ", "ДЕДЛАЙН"] as const;

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"] as const;

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

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

function TenderRow({ tender, folders, onClick }: { tender: TenderSummary; folders: Folder[]; onClick: () => void }) {
	const folder = folders.find((f) => f.id === tender.folderId);
	const status = STATUS_CONFIG[tender.status];
	return (
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
}

export function TendersPage() {
	const navigate = useNavigate();
	const { items, isLoading } = useTenders();
	const { data: folders = [] } = useFolders();

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
					</>
				}
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
										onClick={() => navigate(`/tenders/${tender.id}`)}
									/>
								))}
					</TableBody>
				</Table>
			</main>
		</div>
	);
}
