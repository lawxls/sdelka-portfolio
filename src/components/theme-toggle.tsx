import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const STORAGE_KEY = "theme";

export function ThemeToggle() {
	function handleToggle() {
		const isDark = document.documentElement.classList.toggle("dark");
		window.localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="ghost" size="icon" onClick={handleToggle} aria-label="Сменить тему">
					<Sun
						className="h-5 w-5 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90"
						aria-hidden="true"
					/>
					<Moon
						className="absolute h-5 w-5 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0"
						aria-hidden="true"
					/>
				</Button>
			</TooltipTrigger>
			<TooltipContent>Сменить тему</TooltipContent>
		</Tooltip>
	);
}
