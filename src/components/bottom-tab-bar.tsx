import { Link, useLocation } from "react-router";
import { NAV_ITEMS } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

export function BottomTabBar() {
	const { pathname } = useLocation();
	return (
		<nav
			aria-label="Основная навигация"
			className="flex shrink-0 border-t border-sidebar-border bg-sidebar md:hidden"
			data-testid="bottom-tab-bar"
		>
			{NAV_ITEMS.map(({ path, label, icon: Icon }) => {
				const active = pathname.startsWith(path);
				return (
					<Link
						key={path}
						to={path}
						aria-label={label}
						aria-current={active ? "page" : undefined}
						className={cn(
							"flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.6875rem] transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
							active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground",
						)}
					>
						<Icon className="size-5" aria-hidden="true" />
						<span>{label}</span>
					</Link>
				);
			})}
		</nav>
	);
}
