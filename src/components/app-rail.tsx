import { ListTodo, Package, Settings } from "lucide-react";
import { Link, useLocation } from "react-router";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const RAIL_ITEMS = [
	{ path: "/procurement", label: "Закупки", icon: Package },
	{ path: "/tasks", label: "Задачи", icon: ListTodo },
	{ path: "/settings", label: "Настройки", icon: Settings },
] as const;

export function AppRail() {
	const { pathname } = useLocation();
	return (
		<nav
			aria-label="Основная навигация"
			className="hidden w-12 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-2 md:flex"
			data-testid="app-rail"
		>
			{RAIL_ITEMS.map(({ path, label, icon: Icon }) => {
				const active = pathname.startsWith(path);
				return (
					<Tooltip key={path}>
						<TooltipTrigger asChild>
							<Link
								to={path}
								aria-label={label}
								aria-current={active ? "page" : undefined}
								className={cn(
									"flex size-9 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
									active
										? "bg-sidebar-accent text-sidebar-accent-foreground"
										: "text-sidebar-foreground hover:bg-sidebar-accent/50",
								)}
							>
								<Icon className="size-5" aria-hidden="true" />
							</Link>
						</TooltipTrigger>
						<TooltipContent side="right">{label}</TooltipContent>
					</Tooltip>
				);
			})}
		</nav>
	);
}
