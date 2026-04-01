import { Building2, CircleUser, LogOut, Moon, Sun, User, Users } from "lucide-react";
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
import { getAvatarColor } from "@/lib/avatar-colors";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface UserAvatarMenuProps {
	side?: "top" | "right" | "bottom" | "left";
	align?: "start" | "center" | "end";
	iconClassName?: string;
}

export function UserAvatarMenu({ side = "bottom", align = "end", iconClassName = "size-7" }: UserAvatarMenuProps) {
	const navigate = useNavigate();
	const { data: settings } = useSettings();

	const initials = settings ? getInitials(settings.first_name, settings.last_name) : null;
	const avatarColor = settings ? getAvatarColor(settings.avatar_icon) : "";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Меню пользователя"
					className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					{initials ? (
						<span
							className={cn(
								"flex items-center justify-center rounded-full text-xs font-semibold text-white",
								avatarColor,
								iconClassName,
							)}
						>
							{initials}
						</span>
					) : (
						<CircleUser className={iconClassName} />
					)}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent side={side} align={align} className="w-56">
				<DropdownMenuItem onSelect={() => navigate("/settings/profile")}>
					<User />
					Мой профиль
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => navigate("/settings/companies")}>
					<Building2 />
					Компании
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => navigate("/settings/employees")}>
					<Users />
					Сотрудники
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
