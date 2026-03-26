import { CircleUser, LogOut, Settings, User } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearToken } from "@/data/auth";

interface UserAvatarMenuProps {
	side?: "top" | "right" | "bottom" | "left";
	align?: "start" | "center" | "end";
}

export function UserAvatarMenu({ side = "bottom", align = "end" }: UserAvatarMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Меню пользователя"
					className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<CircleUser className="size-7" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent side={side} align={align} className="w-48">
				<DropdownMenuItem disabled>
					<User />
					Мой профиль
				</DropdownMenuItem>
				<DropdownMenuItem disabled>
					<Settings />
					Настройки
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive" onSelect={clearToken}>
					<LogOut />
					Выйти
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
