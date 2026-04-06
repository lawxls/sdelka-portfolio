import type { CurrentSupplier } from "@/data/types";
import { formatCurrency, formatDeferral, formatDelivery } from "@/lib/format";

interface CurrentSupplierCardProps {
	currentSupplier: CurrentSupplier;
}

const FIELDS: { label: string; render: (s: CurrentSupplier) => string }[] = [
	{ label: "Компания", render: (s) => s.companyName },
	{ label: "Доставка", render: (s) => formatDelivery(s.deliveryCost) },
	{ label: "Отсрочка", render: (s) => formatDeferral(s.deferralDays) },
	{ label: "Цена/ед.", render: (s) => formatCurrency(s.pricePerUnit) },
	{ label: "ТСО", render: (s) => formatCurrency(s.tco) },
];

export function CurrentSupplierCard({ currentSupplier }: CurrentSupplierCardProps) {
	return (
		<div className="mb-3 rounded-lg border bg-muted px-4 py-3">
			<p className="mb-2 text-xs font-medium text-muted-foreground">Текущий поставщик</p>
			<div className="grid grid-cols-5 gap-3">
				{FIELDS.map(({ label, render }) => (
					<div key={label}>
						<p className="text-xs text-muted-foreground">{label}</p>
						<p className="text-sm font-medium tabular-nums">{render(currentSupplier)}</p>
					</div>
				))}
			</div>
		</div>
	);
}
