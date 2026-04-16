import { ChevronRight } from "lucide-react";
import type { Supplier } from "@/data/supplier-types";
import type { CurrentSupplier } from "@/data/types";
import { formatCurrency, formatSignedCurrency, signClassName } from "@/lib/format";

interface BestOfferCardProps {
	suppliers: Supplier[];
	currentSupplier?: CurrentSupplier;
	onSupplierClick?: (id: string) => void;
}

function pickBestOffer(suppliers: Supplier[]): Supplier | null {
	const candidates = suppliers.filter((s) => !s.archived && s.status === "получено_кп" && s.tco != null);
	if (candidates.length === 0) return null;
	return candidates.reduce((best, s) =>
		(s.tco ?? Number.POSITIVE_INFINITY) < (best.tco ?? Number.POSITIVE_INFINITY) ? s : best,
	);
}

export function BestOfferCard({ suppliers, currentSupplier, onSupplierClick }: BestOfferCardProps) {
	const best = pickBestOffer(suppliers);

	if (!best) {
		return (
			<div className="rounded-lg border bg-muted px-4 py-3">
				<p className="mb-3 text-xs font-medium text-muted-foreground">Лучшее предложение от: </p>
				<p className="text-sm text-muted-foreground">Ждём первое&nbsp;КП</p>
			</div>
		);
	}

	const currentPrice = currentSupplier?.pricePerUnit ?? null;
	const savings = currentPrice != null && best.pricePerUnit != null ? best.pricePerUnit - currentPrice : null;

	return (
		<div className="rounded-lg border bg-muted px-4 py-3">
			{onSupplierClick ? (
				<button
					type="button"
					onClick={() => onSupplierClick(best.id)}
					className="group mb-3 block w-full rounded text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					Лучшее предложение от: <span className="text-foreground group-hover:underline">{best.companyName}</span>
					<ChevronRight
						className="ml-0.5 inline-block size-3.5 -translate-y-px text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
						aria-hidden="true"
					/>
				</button>
			) : (
				<p className="mb-3 text-xs font-medium text-muted-foreground">
					Лучшее предложение от: <span className="text-foreground">{best.companyName}</span>
				</p>
			)}
			<div className="grid grid-cols-3 gap-3">
				<div className="flex flex-col gap-1">
					<p className="flex h-5 items-center text-xs text-muted-foreground">Цена/ед.</p>
					<p className="text-sm font-medium tabular-nums">{formatCurrency(best.pricePerUnit)}</p>
				</div>
				<div className="flex flex-col gap-1">
					<p className="flex h-5 items-center text-xs text-muted-foreground">TCO</p>
					<p className="text-sm font-medium tabular-nums">{formatCurrency(best.tco)}</p>
				</div>
				<div className="flex flex-col gap-1">
					<p className="flex h-5 items-center text-xs text-muted-foreground">Экономия</p>
					<p className={`text-sm font-medium tabular-nums ${signClassName(savings)}`}>
						{formatSignedCurrency(savings)}
					</p>
				</div>
			</div>
		</div>
	);
}
