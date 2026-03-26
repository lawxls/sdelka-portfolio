import { Outlet } from "react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

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
				<Outlet />
			</div>
		</SidebarProvider>
	);
}
