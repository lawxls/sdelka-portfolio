import { Link, useLocation } from "react-router";
import { useActiveTasksCount } from "@/data/use-tasks";
import { NAV_ITEMS } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

function TasksCountDot({ count }: { count: number }) {
	if (count === 0) return null;
	return (
		<span
			data-testid="nav-tasks-count"
			aria-hidden="true"
			className="absolute -top-1.5 left-full ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium tabular-nums text-primary-foreground leading-none"
		>
			{count}
		</span>
	);
}

export function BottomTabBar() {
	const { pathname } = useLocation();
	const activeTasksCount = useActiveTasksCount();
	return (
		<nav
			aria-label="Основная навигация"
			className="flex shrink-0 border-t border-sidebar-border bg-sidebar md:hidden"
			data-testid="bottom-tab-bar"
		>
			{NAV_ITEMS.map((item) => {
				const { path, label, icon: Icon } = item;
				const matchPath = "activePrefix" in item ? item.activePrefix : path;
				const active = pathname.startsWith(matchPath);
				return (
					<Link
						key={path}
						to={path}
						aria-label={label}
						aria-current={active ? "page" : undefined}
						className={cn(
							"relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.6875rem] transition-[color,scale] duration-150 ease-out touch-manipulation focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.96] motion-reduce:active:scale-100",
							active ? "font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground",
						)}
					>
						<span className="relative">
							<Icon className="size-5" aria-hidden="true" />
							{path === "/tasks" && <TasksCountDot count={activeTasksCount} />}
						</span>
						<span>{label}</span>
					</Link>
				);
			})}
		</nav>
	);
}
