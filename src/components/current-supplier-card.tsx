import type { CurrentSupplier } from "@/data/types";
import { formatCurrency, formatDeferral, formatDelivery } from "@/lib/format";

interface CurrentSupplierCardProps {
	currentSupplier: CurrentSupplier;
}

const FIELDS: { label: string; render: (s: CurrentSupplier) => string }[] = [
	{ label: "Доставка", render: (s) => formatDelivery(s.deliveryCost) },
	{ label: "Отсрочка", render: (s) => formatDeferral(s.deferralDays) },
	{ label: "Цена/ед.", render: (s) => formatCurrency(s.pricePerUnit) },
	{ label: "ТСО", render: (s) => formatCurrency(s.tco) },
];

export function CurrentSupplierCard({ currentSupplier }: CurrentSupplierCardProps) {
	return (
		<div className="rounded-lg border bg-muted px-4 py-3">
			<p className="mb-3 text-xs font-medium text-muted-foreground">
				Текущий поставщик: <span className="text-foreground">{currentSupplier.companyName}</span>
			</p>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{FIELDS.map(({ label, render }) => (
					<div key={label} className="flex flex-col gap-1">
						<p className="flex h-5 items-center text-xs text-muted-foreground">{label}</p>
						<p className="text-sm font-medium tabular-nums">{render(currentSupplier)}</p>
					</div>
				))}
			</div>
		</div>
	);
}
