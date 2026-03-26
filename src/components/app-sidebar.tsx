import { Link, useLocation } from "react-router";
import { LogoIcon } from "@/components/logo-icon";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { NAV_ITEMS } from "@/lib/nav-items";

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
				<UserAvatarMenu side="right" align="end" />
			</SidebarFooter>
		</Sidebar>
	);
}
