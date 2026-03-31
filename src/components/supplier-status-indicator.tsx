import { Check, Clock, X } from "lucide-react";
import type { SupplierStatus } from "@/data/supplier-types";
import { SUPPLIER_STATUS_CONFIG } from "@/data/supplier-types";

export function SupplierStatusIndicator({ status, className }: { status: SupplierStatus; className?: string }) {
	const config = SUPPLIER_STATUS_CONFIG[status];
	return (
		<span className={`inline-flex items-center gap-1.5 ${config.className} ${className ?? ""}`}>
			{status === "ждем_ответа" && <Clock className="size-3" aria-hidden="true" />}
			{status === "переговоры" && (
				<span className="size-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />
			)}
			{status === "получено_кп" && <Check className="size-3" aria-hidden="true" />}
			{status === "отказ" && <X className="size-3" aria-hidden="true" />}
			{config.label}
		</span>
	);
}
