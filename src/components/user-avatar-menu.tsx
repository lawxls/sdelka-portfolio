import { LogOut, Moon, Sun, User } from "lucide-react";
import { useNavigate } from "react-router";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearTokens } from "@/data/auth";
import { useSettings } from "@/data/use-settings";
import { cn } from "@/lib/utils";

interface UserAvatarMenuProps {
	side?: "top" | "right" | "bottom" | "left";
	align?: "start" | "center" | "end";
	className?: string;
}

function formatTriggerName(firstName: string, lastName: string): string {
	const trimmedLast = lastName.trim();
	return trimmedLast ? `${firstName} ${trimmedLast}` : firstName;
}

export function UserAvatarMenu({ side = "bottom", align = "end", className }: UserAvatarMenuProps) {
	const navigate = useNavigate();
	const { data: settings } = useSettings();

	const displayName = settings ? formatTriggerName(settings.first_name, settings.last_name) : null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Меню пользователя"
					className={cn(
						"inline-flex shrink-0 items-center gap-2.5 rounded-md bg-muted px-3.5 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-muted/80 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
						className,
					)}
				>
					<User className="size-4 shrink-0" aria-hidden="true" />
					{displayName && <span className="leading-none">{displayName}</span>}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent side={side} align={align} className="w-56">
				<DropdownMenuItem onSelect={() => navigate("/settings/profile")}>
					<User />
					Мой профиль
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onSelect={() => {
						const isDark = document.documentElement.classList.toggle("dark");
						localStorage.setItem("theme", isDark ? "dark" : "light");
					}}
				>
					<Sun className="scale-100 dark:scale-0 dark:hidden" aria-hidden="true" />
					<Moon className="hidden scale-0 dark:block dark:scale-100" aria-hidden="true" />
					<span className="dark:hidden">Сменить тему</span>
					<span className="hidden dark:inline">Сменить тему</span>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive" onSelect={clearTokens}>
					<LogOut />
					Выйти
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
