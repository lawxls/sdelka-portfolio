import { Link, Outlet } from "react-router";
import { LogoWordmark } from "@/components/logo-wordmark";
import { UserAvatarMenu } from "@/components/user-avatar-menu";

export function AppLayout() {
	return (
		<div className="flex h-svh w-full flex-col" data-testid="app-layout">
			<header
				className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 py-1.5"
				data-testid="global-header"
			>
				<div className="flex shrink-0 items-center gap-2">
					<Link to="/procurement" aria-label="На главную">
						<LogoWordmark className="h-4 w-auto" />
					</Link>
					<span className="hidden -translate-y-px select-none items-center rounded-full px-1.5 py-0.5 text-[0.5625rem] font-medium tracking-wide text-muted-foreground/70 ring-1 ring-border md:inline-flex">
						Beta
					</span>
				</div>
				<UserAvatarMenu />
			</header>
			<div className="flex min-h-0 flex-1 flex-col">
				<Outlet />
			</div>
		</div>
	);
}
