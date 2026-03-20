import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PageInfo, ProcurementItem, ProcurementStatus, SortField, SortState } from "@/data/types";
import { getDeviation, getOverpayment, STATUS_LABELS } from "@/data/types";
import { formatCurrency, formatDeviation, formatNumber, signClassName } from "@/lib/format";

const STATUS_CONFIG: Record<ProcurementStatus, { label: string; className: string }> = {
	searching: {
		label: STATUS_LABELS.searching,
		className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	},
	negotiating: {
		label: STATUS_LABELS.negotiating,
		className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	},
	completed: {
		label: STATUS_LABELS.completed,
		className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	},
};

interface SortableColumn {
	label: string;
	field: SortField;
}

const SORTABLE_COLUMNS: SortableColumn[] = [
	{ label: "Кол-во в\u00A0год", field: "annualQuantity" },
	{ label: "Текущая цена", field: "currentPrice" },
	{ label: "Лучшая цена", field: "bestPrice" },
	{ label: "Средняя цена", field: "averagePrice" },
	{ label: "Откл.\u00A0(%)", field: "deviation" },
	{ label: "Переплата\u00A0(₽)", field: "overpayment" },
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
	const stickyNameCell = "sticky left-0 z-10 bg-background transition-colors group-hover:bg-muted/50";

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex-1 overflow-auto touch-manipulation" data-testid="table-scroll-container">
				<Table>
					<TableHeader className="[&_tr]:border-b-0">
						<TableRow>
							<TableHead className={`w-12 text-right ${stickyHead}`}>№</TableHead>
							<TableHead className={stickyNameHead}>Наименование</TableHead>
							<TableHead className={stickyHead}>Статус</TableHead>
							{SORTABLE_COLUMNS.map((col) => (
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
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((item, index) => {
							const deviation = getDeviation(item);
							const overpayment = getOverpayment(item);
							const dev = formatDeviation(deviation);
							const status = STATUS_CONFIG[item.status];

							return (
								<TableRow
									key={item.id}
									className={onRowClick ? "cursor-pointer group" : "group"}
									onClick={onRowClick ? () => onRowClick(item) : undefined}
								>
									<TableCell className="text-right tabular-nums text-muted-foreground">
										{startIndex + index + 1}
									</TableCell>
									<TableCell className={`font-medium ${stickyNameCell}`}>{item.name}</TableCell>
									<TableCell>
										<Badge variant="outline" className={status.className}>
											{status.label}
										</Badge>
									</TableCell>
									<TableCell className="text-right tabular-nums">{formatNumber(item.annualQuantity)}</TableCell>
									<TableCell className="text-right tabular-nums">{formatCurrency(item.currentPrice)}</TableCell>
									<TableCell className="text-right tabular-nums">{formatCurrency(item.bestPrice)}</TableCell>
									<TableCell className="text-right tabular-nums">{formatCurrency(item.averagePrice)}</TableCell>
									<TableCell className={`text-right tabular-nums ${dev.className}`}>{dev.text}</TableCell>
									<TableCell className={`text-right tabular-nums ${signClassName(overpayment)}`}>
										{formatCurrency(overpayment)}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
			{pageInfo.totalPages > 1 && (
				<div className="flex shrink-0 items-center justify-center gap-4 py-4">
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
	);
}
