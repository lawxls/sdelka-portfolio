import { Ban, Check, Clock, Mail, MessageCircle, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Supplier, SupplierStatus } from "@/data/supplier-types";

interface SupplierResponseStatusCardProps {
	suppliers: Supplier[];
}

const STATUS_FIELDS: {
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	className: string;
	count: (suppliers: Supplier[]) => number;
}[] = [
	{
		label: "Всего поставщиков",
		icon: Users,
		className: "text-foreground",
		count: (s) => s.length,
	},
	{
		label: "Письмо не отправлено",
		icon: Mail,
		className: "text-muted-foreground",
		count: (s) => s.filter((x) => x.status === ("письмо_не_отправлено" satisfies SupplierStatus)).length,
	},
	{
		label: "Ждём ответа",
		icon: Clock,
		className: "text-violet-600 dark:text-violet-400",
		count: (s) => s.filter((x) => x.status === ("ждем_ответа" satisfies SupplierStatus)).length,
	},
	{
		label: "Переговоры",
		icon: MessageCircle,
		className: "text-blue-600 dark:text-blue-400",
		count: (s) => s.filter((x) => x.status === ("переговоры" satisfies SupplierStatus)).length,
	},
	{
		label: "Получено КП",
		icon: Check,
		className: "text-green-600 dark:text-green-400",
		count: (s) => s.filter((x) => x.status === ("получено_кп" satisfies SupplierStatus)).length,
	},
	{
		label: "Отказ",
		icon: Ban,
		className: "text-destructive",
		count: (s) => s.filter((x) => x.status === ("отказ" satisfies SupplierStatus)).length,
	},
];

export function SupplierResponseStatusCard({ suppliers }: SupplierResponseStatusCardProps) {
	return (
		<div className="rounded-lg border bg-muted px-4 py-3">
			<p className="mb-3 text-xs font-medium text-muted-foreground">Воронка поставщиков</p>
			<div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
				{STATUS_FIELDS.map(({ label, icon: Icon, className, count }) => (
					<Tooltip key={label}>
						<TooltipTrigger asChild>
							<div className={`flex flex-col items-center gap-1 ${className}`}>
								<Icon className="size-5" aria-hidden="true" />
								<span className="text-sm font-medium tabular-nums">{count(suppliers)}</span>
							</div>
						</TooltipTrigger>
						<TooltipContent>{label}</TooltipContent>
					</Tooltip>
				))}
			</div>
		</div>
	);
}
