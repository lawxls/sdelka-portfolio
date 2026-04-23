import { LifeBuoy } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { LogoWordmark } from "@/components/logo-wordmark";
import { SupportDialog } from "@/components/support-dialog";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { NAV_ITEMS } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

const TOP_NAV = NAV_ITEMS.filter((item) => item.placement === "top");
const BOTTOM_NAV = NAV_ITEMS.filter((item) => item.placement === "bottom");

const NAV_ITEM_CLASSES =
	"flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-[background-color,color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export function AppRail() {
	const { pathname } = useLocation();
	const [supportOpen, setSupportOpen] = useState(false);
	return (
		<>
			<aside
				aria-label="Боковая панель"
				className="hidden w-52 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex"
				data-testid="app-rail"
			>
				<div className="flex h-12 shrink-0 items-center px-3">
					<Link to="/procurement" aria-label="На главную" className="flex shrink-0 items-center">
						<LogoWordmark className="h-5 w-auto" />
					</Link>
				</div>
				<nav aria-label="Основная навигация" className="flex flex-1 flex-col gap-0.5 px-2 py-2">
					{TOP_NAV.map(({ path, label, icon: Icon }) => {
						const active = pathname.startsWith(path);
						return (
							<Link
								key={path}
								to={path}
								aria-current={active ? "page" : undefined}
								className={cn(
									NAV_ITEM_CLASSES,
									"text-sidebar-foreground",
									active ? "bg-foreground/[0.06]" : "hover:bg-sidebar-accent/50",
								)}
							>
								<Icon className={cn("size-4 shrink-0", active && "text-primary")} aria-hidden="true" />
								<span className="flex-1 text-left">{label}</span>
							</Link>
						);
					})}
				</nav>
				<div className="flex flex-col px-2 py-2" data-testid="app-rail-bottom">
					<div className="flex flex-col gap-0.5">
						{BOTTOM_NAV.map(({ path, label, icon: Icon }) => {
							const active = pathname.startsWith(path);
							return (
								<Link
									key={path}
									to={path}
									aria-current={active ? "page" : undefined}
									className={cn(
										NAV_ITEM_CLASSES,
										active
											? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
											: "text-sidebar-foreground hover:bg-sidebar-accent/50",
									)}
								>
									<Icon className="size-4 shrink-0" aria-hidden="true" />
									<span className="flex-1 text-left">{label}</span>
								</Link>
							);
						})}
						<button
							type="button"
							className={cn(NAV_ITEM_CLASSES, "text-sidebar-foreground hover:bg-sidebar-accent/50")}
							onClick={() => setSupportOpen(true)}
						>
							<LifeBuoy className="size-4 shrink-0" aria-hidden="true" />
							<span className="flex-1 text-left">Помощь</span>
						</button>
					</div>
					<div className="mt-2 px-0.5">
						<UserAvatarMenu side="right" align="end" />
					</div>
				</div>
			</aside>
			<SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
		</>
	);
}
