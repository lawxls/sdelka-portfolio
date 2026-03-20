import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProcurementItem, ProcurementStatus, SortField, SortState } from "@/data/types";
import { getDeviation, getOverpayment } from "@/data/types";
import { formatCurrency, formatDeviation, formatNumber } from "@/lib/format";

const STATUS_CONFIG: Record<ProcurementStatus, { label: string; className: string }> = {
	searching: {
		label: "Ищем поставщиков",
		className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	},
	negotiating: {
		label: "Ведём переговоры",
		className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	},
	completed: {
		label: "Переговоры завершены",
		className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	},
};

function getOverpaymentClassName(value: number | null): string {
	if (value == null) return "";
	if (value > 0) return "text-red-600 dark:text-red-400";
	if (value < 0) return "text-green-600 dark:text-green-400";
	return "";
}

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
	startIndex: number;
	sort: SortState | null;
	onSort: (field: SortField) => void;
	onRowClick: (item: ProcurementItem) => void;
}

export function ProcurementTable({ items, startIndex, sort, onSort, onRowClick }: ProcurementTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-12 text-right">№</TableHead>
					<TableHead>Наименование</TableHead>
					<TableHead>Статус</TableHead>
					{SORTABLE_COLUMNS.map((col) => (
						<TableHead key={col.field} className="text-right">
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
						<TableRow key={item.id} className="cursor-pointer" onClick={() => onRowClick(item)}>
							<TableCell className="text-right tabular-nums text-muted-foreground">{startIndex + index + 1}</TableCell>
							<TableCell className="font-medium">{item.name}</TableCell>
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
							<TableCell className={`text-right tabular-nums ${getOverpaymentClassName(overpayment)}`}>
								{formatCurrency(overpayment)}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
