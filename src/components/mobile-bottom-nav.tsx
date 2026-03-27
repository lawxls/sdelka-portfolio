import { Link, useLocation } from "react-router";
import { NAV_ITEMS } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
	const { pathname } = useLocation();

	return (
		<nav
			className="sticky bottom-0 z-30 flex shrink-0 items-center justify-around border-t border-border bg-background md:hidden"
			style={{ paddingBottom: "env(safe-area-inset-bottom)", WebkitTapHighlightColor: "transparent" }}
			data-testid="mobile-bottom-nav"
		>
			{NAV_ITEMS.map(({ path, label, icon: Icon }) => {
				const active = pathname.startsWith(path);
				return (
					<Link
						key={path}
						to={path}
						aria-label={label}
						className={cn(
							"flex flex-col items-center gap-0.5 rounded-md px-3 py-2 text-xs touch-manipulation focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
							active ? "text-[oklch(0.55_0.2_122)] dark:text-primary" : "text-muted-foreground",
						)}
					>
						<Icon className="size-6" />
						<span aria-hidden="true">{label}</span>
					</Link>
				);
			})}
		</nav>
	);
}
