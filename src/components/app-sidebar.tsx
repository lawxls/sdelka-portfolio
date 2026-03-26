import { Building2, CircleUser, Layers, LayoutDashboard, ListTodo, LogOut, Settings, User } from "lucide-react";
import { Link, useLocation } from "react-router";
import { LogoIcon } from "@/components/logo-icon";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { clearToken } from "@/data/auth";

const NAV_ITEMS = [
	{ path: "/analytics", label: "Аналитика", icon: LayoutDashboard },
	{ path: "/procurement", label: "Закупки", icon: Layers },
	{ path: "/companies", label: "Компании", icon: Building2 },
	{ path: "/tasks", label: "Задачи", icon: ListTodo },
] as const;

export function AppSidebar() {
	const { pathname } = useLocation();

	return (
		<Sidebar collapsible="icon" data-testid="app-sidebar">
			<SidebarHeader className="items-center py-3">
				<Link to="/procurement" data-testid="app-sidebar-logo" aria-label="На главную">
					<LogoIcon className="h-5 w-auto" />
				</Link>
			</SidebarHeader>
			<SidebarContent>
				<SidebarMenu className="items-center gap-1 px-1">
					{NAV_ITEMS.map(({ path, label, icon: Icon }) => {
						const active = pathname.startsWith(path);
						return (
							<SidebarMenuItem key={path}>
								<SidebarMenuButton
									asChild
									isActive={active}
									tooltip={label}
									className={
										active ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""
									}
								>
									<Link to={path} aria-label={label}>
										<Icon />
										<span>{label}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarContent>
			<SidebarFooter className="items-center pb-3">
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
					<DropdownMenuContent side="right" align="end" className="w-48">
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
			</SidebarFooter>
		</Sidebar>
	);
}
