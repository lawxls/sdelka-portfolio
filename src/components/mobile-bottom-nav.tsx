import { Link, useLocation } from "react-router";
import { NAV_ITEMS } from "@/lib/nav-items";

export function MobileBottomNav() {
	const { pathname } = useLocation();

	return (
		<nav
			className="flex items-center justify-around border-t border-border bg-background md:hidden"
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
						className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs touch-manipulation ${
							active ? "text-primary" : "text-muted-foreground"
						}`}
					>
						<Icon className="size-6" />
						<span aria-hidden="true">{label}</span>
					</Link>
				);
			})}
		</nav>
	);
}
