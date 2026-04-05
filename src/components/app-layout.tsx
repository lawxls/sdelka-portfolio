import { createContext, useContext, useState } from "react";
import { Link, Outlet } from "react-router";
import { LogoWordmark } from "@/components/logo-wordmark";
import { Badge } from "@/components/ui/badge";
import { UserAvatarMenu } from "@/components/user-avatar-menu";

const ToolbarPortalContext = createContext<HTMLDivElement | null>(null);

export function useToolbarPortal() {
	return useContext(ToolbarPortalContext);
}

export function AppLayout() {
	const [toolbarEl, setToolbarEl] = useState<HTMLDivElement | null>(null);

	return (
		<ToolbarPortalContext.Provider value={toolbarEl}>
			<div className="flex h-svh w-full flex-col" data-testid="app-layout">
				<header
					className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 py-1.5"
					data-testid="global-header"
				>
					<div className="flex shrink-0 items-center gap-2">
						<Link to="/procurement" aria-label="На главную">
							<LogoWordmark className="h-4 w-auto" />
						</Link>
						<Badge variant="secondary" className="hidden text-[0.625rem] md:inline-flex">
							Beta
						</Badge>
					</div>
					<div ref={setToolbarEl} className="hidden min-w-0 flex-1 items-center md:flex" data-testid="toolbar-slot" />
					<UserAvatarMenu />
				</header>
				<div className="flex min-h-0 flex-1 flex-col">
					<Outlet />
				</div>
			</div>
		</ToolbarPortalContext.Provider>
	);
}
