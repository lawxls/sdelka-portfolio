import { MessageCircleQuestion } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TaskCountBadge({ count }: { count: number }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="inline-flex items-center gap-1">
					<MessageCircleQuestion className="size-3 text-red-500 dark:text-red-400" aria-hidden="true" />
					<span className="tabular-nums text-red-500 dark:text-red-400">{count}</span>
				</span>
			</TooltipTrigger>
			<TooltipContent>Вопросы поставщиков</TooltipContent>
		</Tooltip>
	);
}
