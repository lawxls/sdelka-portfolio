import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PageInfo, ProcurementItem, ProcurementStatus, SortField, SortState } from "@/data/types";
import { getAnnualCost, getDeviation, getOverpayment, STATUS_LABELS } from "@/data/types";
import { formatCurrency, formatDeviation, signClassName } from "@/lib/format";

const STATUS_BG = "bg-[#ebebed] dark:bg-[#35353a]";

const STATUS_CONFIG: Record<ProcurementStatus, { label: string; className: string }> = {
	searching: {
		label: STATUS_LABELS.searching,
		className: `${STATUS_BG} text-blue-700 dark:text-blue-400`,
	},
	negotiating: {
		label: STATUS_LABELS.negotiating,
		className: `${STATUS_BG} text-status-highlight`,
	},
	completed: {
		label: STATUS_LABELS.completed,
		className: `${STATUS_BG} text-emerald-700 dark:text-emerald-400`,
	},
};

interface SortableColumn {
	label: string;
	field: SortField;
}

const INPUT_COLUMNS: SortableColumn[] = [
	{ label: "СТОИМОСТЬ В\u00A0ГОД", field: "annualCost" },
	{ label: "ТЕКУЩАЯ ЦЕНА", field: "currentPrice" },
];

const ANALYSIS_COLUMNS: SortableColumn[] = [
	{ label: "ЛУЧШАЯ ЦЕНА", field: "bestPrice" },
	{ label: "СРЕДНЯЯ ЦЕНА", field: "averagePrice" },
	{ label: "ОТКЛ.\u00A0(%)", field: "deviation" },
	{ label: "ПЕРЕПЛАТА\u00A0(₽)", field: "overpayment" },
];

function SortIcon({ field, sort }: { field: SortField; sort: SortState | null }) {
	if (sort?.field !== field) return <ArrowUpDown className="size-3.5 text-muted-foreground/50" aria-hidden="true" />;
	return sort.direction === "asc" ? (
		<ArrowUp className="size-3.5" aria-hidden="true" />
	) : (
		<ArrowDown className="size-3.5" aria-hidden="true" />
	);
}

interface ProcurementTableProps {
	items: ProcurementItem[];
	sort: SortState | null;
	pageInfo: PageInfo;
	onSort: (field: SortField) => void;
	onRowClick?: (item: ProcurementItem) => void;
	onPageChange: (page: number) => void;
}

export function ProcurementTable({ items, sort, pageInfo, onSort, onRowClick, onPageChange }: ProcurementTableProps) {
	const startIndex = (pageInfo.currentPage - 1) * pageInfo.pageSize;
	const stickyHead = "sticky top-0 z-20 bg-background border-b border-border";
	const stickyNameHead = "sticky top-0 left-0 z-30 bg-background border-b border-border";
	const stickyNameCell =
		"sticky left-0 z-10 bg-background transition-colors group-even:bg-muted/40 group-hover:bg-muted/60";
	const analysisHead = "sticky top-0 z-20 bg-background border-b border-border text-status-highlight";

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex-1 overflow-auto touch-manipulation" data-testid="table-scroll-container">
				<Table>
					<TableHeader className="[&_tr]:border-b-0">
						<TableRow>
							<TableHead className={`w-12 text-right ${stickyHead}`}>№</TableHead>
							<TableHead className={stickyNameHead}>НАИМЕНОВАНИЕ</TableHead>
							{INPUT_COLUMNS.map((col) => (
								<TableHead key={col.field} className={`text-right ${stickyHead}`}>
									<button
										type="button"
										className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
										onClick={() => onSort(col.field)}
										aria-label={`Сортировать по ${col.label}`}
									>
										{col.label}
										<SortIcon field={col.field} sort={sort} />
									</button>
								</TableHead>
							))}
							{ANALYSIS_COLUMNS.map((col) => (
								<TableHead key={col.field} className={`text-right ${analysisHead}`}>
									<button
										type="button"
										className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
										onClick={() => onSort(col.field)}
										aria-label={`Сортировать по ${col.label}`}
									>
										{col.label}
										<SortIcon field={col.field} sort={sort} />
									</button>
								</TableHead>
							))}
							<TableHead className={analysisHead}>СТАТУС</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((item, index) => {
							const deviation = getDeviation(item);
							const overpayment = getOverpayment(item);
							const dev = formatDeviation(deviation);
							const status = STATUS_CONFIG[item.status];
							const isInProgress = item.status !== "completed";
							const rowCls = onRowClick ? "cursor-pointer group" : "group";

							return (
								<TableRow
									key={item.id}
									className={item.status === "negotiating" ? `${rowCls} negotiating-stripe` : rowCls}
									onClick={onRowClick ? () => onRowClick(item) : undefined}
								>
									<TableCell className="text-right tabular-nums text-muted-foreground">
										{startIndex + index + 1}
									</TableCell>
									<TableCell className={`font-medium ${stickyNameCell}`}>{item.name}</TableCell>
									<TableCell className="text-right tabular-nums">{formatCurrency(getAnnualCost(item))}</TableCell>
									<TableCell className="text-right tabular-nums">{formatCurrency(item.currentPrice)}</TableCell>
									<TableCell className="text-right tabular-nums">{formatCurrency(item.bestPrice)}</TableCell>
									<TableCell className="text-right tabular-nums">{formatCurrency(item.averagePrice)}</TableCell>
									<TableCell className={`text-right tabular-nums ${dev.className}`}>{dev.text}</TableCell>
									<TableCell className={`text-right tabular-nums ${signClassName(overpayment)}`}>
										{formatCurrency(overpayment)}
									</TableCell>
									<TableCell>
										<span
											className={`relative z-10 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${status.className}${isInProgress ? " status-pulse" : ""}`}
										>
											<span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
											{status.label}
										</span>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				{pageInfo.totalPages > 1 && (
					<div className="flex items-center justify-end gap-4 px-4 py-3">
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPageChange(pageInfo.currentPage - 1)}
							disabled={pageInfo.currentPage <= 1}
							aria-label="Предыдущая страница"
						>
							<ChevronLeft aria-hidden="true" />
							Назад
						</Button>
						<span className="text-sm tabular-nums text-muted-foreground">
							Страница {pageInfo.currentPage} из&nbsp;{pageInfo.totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPageChange(pageInfo.currentPage + 1)}
							disabled={pageInfo.currentPage >= pageInfo.totalPages}
							aria-label="Следующая страница"
						>
							Вперёд
							<ChevronRight aria-hidden="true" />
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
