import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "theme";

export function ThemeToggle() {
	function handleToggle() {
		const isDark = document.documentElement.classList.toggle("dark");
		window.localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
	}

	return (
		<Button variant="ghost" size="icon" onClick={handleToggle} aria-label="Toggle theme">
			<Sun
				className="h-5 w-5 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90"
				aria-hidden="true"
			/>
			<Moon
				className="absolute h-5 w-5 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0"
				aria-hidden="true"
			/>
		</Button>
	);
}
