import { Check, LoaderCircle } from "lucide-react";
import type { Folder, ProcurementItem, ProcurementStatus } from "@/data/types";
import { getAnnualCost, getDeviation, getOverpayment, STATUS_LABELS } from "@/data/types";
import { formatCurrency, formatDeviation, signClassName } from "@/lib/format";

const STATUS_CONFIG: Record<ProcurementStatus, { label: string; className: string }> = {
	searching: { label: STATUS_LABELS.searching, className: "text-orange-600 dark:text-orange-400" },
	negotiating: { label: STATUS_LABELS.negotiating, className: "text-blue-600 dark:text-blue-400" },
	completed: { label: STATUS_LABELS.completed, className: "text-[oklch(0.50_0.18_122)] dark:text-primary" },
};

interface ProcurementCardProps {
	item: ProcurementItem;
	folder?: Folder;
	index: number;
	onRowClick?: (item: ProcurementItem) => void;
}

const FIELDS: { label: string; key: string }[] = [
	{ label: "Стоимость в\u00A0год", key: "annualCost" },
	{ label: "Текущая цена", key: "currentPrice" },
	{ label: "Лучшая цена", key: "bestPrice" },
];

export function ProcurementCard({ item, folder, index, onRowClick }: ProcurementCardProps) {
	const deviation = getDeviation(item);
	const overpayment = getOverpayment(item);
	const dev = formatDeviation(deviation);

	const values: Record<string, string> = {
		annualCost: formatCurrency(getAnnualCost(item)),
		currentPrice: formatCurrency(item.currentPrice),
		bestPrice: formatCurrency(item.bestPrice),
	};

	const handleClick = onRowClick ? () => onRowClick(item) : undefined;
	const handleKeyDown = onRowClick
		? (e: React.KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onRowClick(item);
				}
			}
		: undefined;

	return (
		<article
			className={`rounded-lg border bg-background p-4${onRowClick ? " cursor-pointer active:bg-muted/50 transition-colors" : ""}`}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			tabIndex={onRowClick ? 0 : undefined}
			role={onRowClick ? "button" : undefined}
		>
			<div className="flex items-start justify-between">
				<span className="text-xs text-muted-foreground tabular-nums">{index + 1}</span>
			</div>
			<div className="mt-1 flex items-center gap-2">
				<span className="font-medium text-sm">{item.name}</span>
				{folder && (
					<div
						className="flex items-center gap-1 rounded-md bg-[#ebebed] px-2 py-0.5 dark:bg-[#35353a]"
						data-testid={`folder-badge-${item.id}`}
					>
						<span
							className="size-2 shrink-0 rounded-full"
							style={{ backgroundColor: `var(--folder-${folder.color})` }}
							aria-hidden="true"
						/>
						<span className="text-xs text-muted-foreground">{folder.name}</span>
					</div>
				)}
			</div>
			<span className={`mt-0.5 inline-flex items-center gap-1.5 text-xs ${STATUS_CONFIG[item.status].className}`}>
				{item.status === "searching" && <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />}
				{item.status === "negotiating" && (
					<span className="size-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />
				)}
				{item.status === "completed" && <Check className="size-3" aria-hidden="true" />}
				{STATUS_CONFIG[item.status].label}
			</span>
			<dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
				{FIELDS.map((f) => (
					<div key={f.key}>
						<dt className="text-xs text-muted-foreground">{f.label}</dt>
						<dd className="tabular-nums">{values[f.key]}</dd>
					</div>
				))}
				<div>
					<dt className="text-xs text-muted-foreground">Откл.&nbsp;(%)</dt>
					<dd data-field="deviation" className={`tabular-nums ${dev.className}`}>
						{dev.text}
					</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Переплата&nbsp;(₽)</dt>
					<dd data-field="overpayment" className={`tabular-nums ${signClassName(overpayment)}`}>
						{formatCurrency(overpayment)}
					</dd>
				</div>
			</dl>
		</article>
	);
}
