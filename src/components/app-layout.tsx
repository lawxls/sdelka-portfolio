import { Link, Outlet } from "react-router";
import { AppRail } from "@/components/app-rail";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { LogoWordmark } from "@/components/logo-wordmark";
import { UserAvatarMenu } from "@/components/user-avatar-menu";

export function AppLayout() {
	return (
		<div className="flex h-svh w-full flex-col" data-testid="app-layout">
			<header
				className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 py-1.5"
				data-testid="global-header"
			>
				<Link to="/procurement" aria-label="На главную" className="flex shrink-0 items-center">
					<LogoWordmark className="h-4 w-auto" />
				</Link>
				<UserAvatarMenu />
			</header>
			<div className="flex min-h-0 flex-1">
				<AppRail />
				<div className="flex min-w-0 flex-1 flex-col">
					<Outlet />
				</div>
			</div>
			<BottomTabBar />
		</div>
	);
}
