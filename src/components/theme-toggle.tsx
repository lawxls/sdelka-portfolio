import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "theme";

export function ThemeToggle({ iconClassName = "size-5" }: { iconClassName?: string } = {}) {
	function handleToggle() {
		const isDark = document.documentElement.classList.toggle("dark");
		window.localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="ghost" size="icon" onClick={handleToggle} aria-label="Сменить тему">
					<Sun
						className={cn(iconClassName, "scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90")}
						aria-hidden="true"
					/>
					<Moon
						className={cn(
							"absolute",
							iconClassName,
							"scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0",
						)}
						aria-hidden="true"
					/>
				</Button>
			</TooltipTrigger>
			<TooltipContent side="right">Сменить тему</TooltipContent>
		</Tooltip>
	);
}
