import { Outlet } from "react-router";
import { SidebarProvider } from "@/components/ui/sidebar";

export function AppLayout() {
	return (
		<SidebarProvider>
			<div className="flex min-h-svh w-full" data-testid="app-layout">
				{/* Icon rail sidebar — built in #95 */}
				<Outlet />
			</div>
		</SidebarProvider>
	);
}
