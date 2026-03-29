import { CircleUser, LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { useNavigate } from "react-router";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearTokens } from "@/data/auth";

interface UserAvatarMenuProps {
	side?: "top" | "right" | "bottom" | "left";
	align?: "start" | "center" | "end";
	iconClassName?: string;
}

export function UserAvatarMenu({ side = "bottom", align = "end", iconClassName = "size-7" }: UserAvatarMenuProps) {
	const navigate = useNavigate();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Меню пользователя"
					className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<CircleUser className={iconClassName} />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent side={side} align={align} className="w-56">
				<DropdownMenuItem onSelect={() => navigate("/profile")}>
					<User />
					Мой профиль
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => navigate("/profile?tab=settings")}>
					<Settings />
					Настройки
				</DropdownMenuItem>
				<DropdownMenuItem
					onSelect={() => {
						const isDark = document.documentElement.classList.toggle("dark");
						localStorage.setItem("theme", isDark ? "dark" : "light");
					}}
				>
					<Sun className="scale-100 dark:scale-0 dark:hidden" aria-hidden="true" />
					<Moon className="hidden scale-0 dark:block dark:scale-100" aria-hidden="true" />
					<span className="dark:hidden">Сменить на тёмную тему</span>
					<span className="hidden dark:inline">Сменить на светлую тему</span>
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
