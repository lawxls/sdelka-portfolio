import { Outlet } from "react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { LogoIcon } from "@/components/logo-icon";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SidebarProvider } from "@/components/ui/sidebar";
import { UserAvatarMenu } from "@/components/user-avatar-menu";

const NOOP = () => {};

export function AppLayout() {
	return (
		<SidebarProvider
			open={false}
			onOpenChange={NOOP}
			style={{ "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}
		>
			<div className="flex min-h-svh w-full" data-testid="app-layout">
				<AppSidebar />
				<div className="flex min-w-0 flex-1 flex-col">
					<div
						className="flex items-center justify-between border-b border-border bg-background px-3 py-2 md:hidden"
						data-testid="mobile-header"
					>
						<LogoIcon className="h-4 w-auto" />
						<UserAvatarMenu />
					</div>
					<div className="flex min-h-0 flex-1 flex-col">
						<Outlet />
					</div>
					<MobileBottomNav />
				</div>
			</div>
		</SidebarProvider>
	);
}
