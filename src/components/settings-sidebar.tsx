import { Building2, ChevronLeft, LogOut, PanelLeft, User, Users } from "lucide-react";
import { Link, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { clearTokens } from "@/data/auth";
import { cn } from "@/lib/utils";

interface SettingsSidebarProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const NAV_ITEMS = [
	{
		section: "Пользователь",
		items: [{ path: "/settings/profile", label: "Профиль", icon: User }],
	},
	{
		section: "Рабочее пространство",
		items: [
			{ path: "/settings/companies", label: "Компании", icon: Building2 },
			{ path: "/settings/employees", label: "Сотрудники", icon: Users },
		],
	},
];

function NavLink({ path, label, icon: Icon }: { path: string; label: string; icon: React.ElementType }) {
	const { pathname } = useLocation();
	const active = pathname === path;

	return (
		<Link
			to={path}
			aria-current={active ? "page" : undefined}
			className={cn(
				"flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
				active
					? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
					: "text-sidebar-foreground hover:bg-sidebar-accent/50",
			)}
		>
			<Icon className="size-4 shrink-0" aria-hidden="true" />
			{label}
		</Link>
	);
}

export function SettingsSidebar({ open, onOpenChange }: SettingsSidebarProps) {
	if (!open) {
		return (
			<div className="hidden shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar p-2 md:flex">
				<Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(true)} aria-label="Открыть настройки">
					<PanelLeft className="size-4" />
				</Button>
			</div>
		);
	}

	const sidebarContent = (
		<aside className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground" data-testid="settings-sidebar">
			<div className="flex shrink-0 items-center justify-between border-b border-sidebar-border px-3 py-2">
				<h2 className="text-sm font-semibold">Настройки</h2>
				<Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label="Закрыть настройки">
					<ChevronLeft className="size-4" />
				</Button>
			</div>

			<nav className="flex-1 overflow-y-auto p-2" aria-label="Настройки">
				{NAV_ITEMS.map(({ section, items }) => (
					<div key={section} className="mb-4">
						<p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{section}</p>
						<div className="space-y-0.5">
							{items.map((item) => (
								<NavLink key={item.path} {...item} />
							))}
						</div>
					</div>
				))}
			</nav>

			<div className="shrink-0 border-t border-sidebar-border p-2">
				<button
					type="button"
					onClick={clearTokens}
					aria-label="Выйти"
					className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
				>
					<LogOut className="size-4 shrink-0" aria-hidden="true" />
					Выйти
				</button>
			</div>
		</aside>
	);

	return <div className="w-52 shrink-0 border-r border-sidebar-border">{sidebarContent}</div>;
}
