import { CircleCheck, Truck } from "lucide-react";
import { formatDelivery } from "@/lib/format";

export function DeliveryValue({ cost }: { cost: number | null }) {
	const text = formatDelivery(cost);
	if (cost == null) {
		return (
			<span className="inline-flex items-center gap-1 tabular-nums">
				<Truck className="size-3.5 text-muted-foreground" aria-hidden="true" />
				{text}
			</span>
		);
	}
	if (cost === 0) {
		return (
			<span className="inline-flex items-center gap-1 tabular-nums">
				<CircleCheck className="size-3.5 text-muted-foreground" aria-hidden="true" />
				{text}
			</span>
		);
	}
	return <span className="tabular-nums">{text}</span>;
}
