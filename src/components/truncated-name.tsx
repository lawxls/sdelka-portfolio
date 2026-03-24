import { ITEM_NAME_DISPLAY_MAX_LENGTH } from "@/data/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface TruncatedNameProps {
	name: string;
	className?: string;
}

export function TruncatedName({ name, className }: TruncatedNameProps) {
	if (name.length <= ITEM_NAME_DISPLAY_MAX_LENGTH) {
		return <span className={className}>{name}</span>;
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className={className}>{name.slice(0, ITEM_NAME_DISPLAY_MAX_LENGTH)}…</span>
				</TooltipTrigger>
				<TooltipContent>{name}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
