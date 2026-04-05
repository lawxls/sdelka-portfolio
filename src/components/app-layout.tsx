import { Link, Outlet } from "react-router";
import { LogoWordmark } from "@/components/logo-wordmark";
import { Badge } from "@/components/ui/badge";
import { UserAvatarMenu } from "@/components/user-avatar-menu";

export function AppLayout() {
	return (
		<div className="flex h-svh w-full flex-col" data-testid="app-layout">
			<header
				className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-border bg-background px-3 py-1.5"
				data-testid="global-header"
			>
				<div className="flex items-center gap-2">
					<Link to="/procurement" aria-label="На главную">
						<LogoWordmark className="h-4 w-auto" />
					</Link>
					<Badge variant="secondary" className="hidden text-[0.625rem] md:inline-flex">
						Beta
					</Badge>
				</div>
				<UserAvatarMenu />
			</header>
			<div className="flex min-h-0 flex-1 flex-col">
				<Outlet />
			</div>
		</div>
	);
}
