import { Building2, Layers, LayoutDashboard, ListTodo } from "lucide-react";
import { Link, useLocation } from "react-router";
import { LogoIcon } from "@/components/logo-icon";
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

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
		</Sidebar>
	);
}
