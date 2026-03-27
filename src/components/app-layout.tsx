import { Outlet } from "react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { LogoWordmark } from "@/components/logo-wordmark";
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
			<div className="flex h-svh w-full" data-testid="app-layout">
				<AppSidebar />
				<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
					<div
						className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-3 py-0.5 md:hidden"
						data-testid="mobile-header"
					>
						<LogoWordmark className="h-4 w-auto" />
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
