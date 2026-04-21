import { Ban, Check, Circle, CircleAlert, Mail, MessagesSquare } from "lucide-react";
import type { SupplierStatus } from "@/data/supplier-types";
import { SUPPLIER_STATUS_CONFIG } from "@/data/supplier-types";

export const STATUS_ICONS: Record<SupplierStatus, React.ComponentType<{ className?: string }>> = {
	new: Circle,
	кп_запрошено: Mail,
	переговоры: MessagesSquare,
	получено_кп: Check,
	отказ: Ban,
	ошибка: CircleAlert,
};

export function SupplierStatusIndicator({ status, className }: { status: SupplierStatus; className?: string }) {
	const config = SUPPLIER_STATUS_CONFIG[status];
	const Icon = STATUS_ICONS[status];
	return (
		<span className={`inline-flex items-center gap-1.5 ${config.className} ${className ?? ""}`}>
			<Icon className="size-3" aria-hidden="true" />
			{config.label}
		</span>
	);
}
