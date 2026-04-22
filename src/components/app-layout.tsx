import { Moon, Sun } from "lucide-react";
import { Outlet } from "react-router";
import { AppRail } from "@/components/app-rail";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsPopover } from "@/components/notifications-popover";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function handleToggleTheme() {
	const isDark = document.documentElement.classList.toggle("dark");
	window.localStorage.setItem("theme", isDark ? "dark" : "light");
}

export function AppLayout() {
	return (
		<div className="flex h-svh w-full flex-col bg-sidebar text-foreground" data-testid="app-layout">
			<div className="flex min-h-0 flex-1">
				<AppRail />
				<div className="flex min-w-0 flex-1 flex-col">
					<header
						className="relative flex h-12 shrink-0 items-center justify-between gap-3 px-3 md:pl-px md:pr-4"
						data-testid="global-header"
					>
						<GlobalSearch />
						<div className="flex items-center gap-1">
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label="Сменить тему"
										onClick={handleToggleTheme}
										className="text-muted-foreground hover:text-foreground"
									>
										<Sun className="size-5 scale-100 dark:scale-0 dark:hidden" aria-hidden="true" />
										<Moon className="hidden size-5 scale-0 dark:block dark:scale-100" aria-hidden="true" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Сменить тему</TooltipContent>
							</Tooltip>
							<NotificationsPopover />
						</div>
					</header>
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t border-sidebar-border bg-background md:rounded-tl-xl md:border-l">
						<Outlet />
					</div>
				</div>
			</div>
			<BottomTabBar />
		</div>
	);
}
