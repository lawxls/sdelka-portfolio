import { Building2, ChevronLeft, LogOut, PanelLeft, User, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { clearTokens } from "@/data/auth";
import { cn } from "@/lib/utils";
import { DESKTOP_QUERY } from "./folder-sidebar";

interface SettingsSidebarProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface NavItemDef {
	path: string;
	label: string;
	icon: React.ReactNode;
}

const USER_ITEMS: NavItemDef[] = [{ path: "/settings/profile", label: "Профиль", icon: <User className="size-4" /> }];

const WORKSPACE_ITEMS: NavItemDef[] = [
	{ path: "/settings/companies", label: "Компании", icon: <Building2 className="size-4" /> },
	{ path: "/settings/employees", label: "Сотрудники", icon: <Users className="size-4" /> },
];

function NavItem({ path, label, icon, isActive }: NavItemDef & { isActive: boolean }) {
	const navigate = useNavigate();

	return (
		<button
			type="button"
			className={cn(
				"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
				isActive
					? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
					: "text-sidebar-foreground hover:bg-sidebar-accent/50",
			)}
			onClick={() => navigate(path)}
		>
			<span className="shrink-0" aria-hidden="true">
				{icon}
			</span>
			<span className="flex-1 text-left">{label}</span>
		</button>
	);
}

export function SettingsSidebar({ open, onOpenChange }: SettingsSidebarProps) {
	const location = useLocation();
	const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;

	if (!open) {
		return (
			<div className="hidden shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar p-2 md:flex">
				<Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(true)} aria-label="Открыть боковую панель">
					<PanelLeft className="size-4" />
				</Button>
			</div>
		);
	}

	function toggle() {
		const next = !open;
		if (isDesktop) {
			localStorage.setItem("settings-sidebar-open", String(next));
		}
		onOpenChange(next);
	}

	const sidebarContent = (
		<aside className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground" data-testid="settings-sidebar">
			<div className="flex shrink-0 items-center justify-between border-b border-sidebar-border px-3 py-2">
				<h2 className="text-sm font-semibold">Настройки</h2>
				<Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Закрыть боковую панель">
					<ChevronLeft className="size-4" />
				</Button>
			</div>

			<nav className="flex-1 overflow-y-auto p-2" aria-label="Настройки">
				<div className="mb-3">
					<div className="px-2 pb-1 text-xs font-medium text-muted-foreground">Пользователь</div>
					<div className="space-y-0.5">
						{USER_ITEMS.map((item) => (
							<NavItem key={item.path} {...item} isActive={location.pathname === item.path} />
						))}
					</div>
				</div>

				<div className="mb-3">
					<div className="px-2 pb-1 text-xs font-medium text-muted-foreground">Рабочее пространство</div>
					<div className="space-y-0.5">
						{WORKSPACE_ITEMS.map((item) => (
							<NavItem key={item.path} {...item} isActive={location.pathname === item.path} />
						))}
					</div>
				</div>

				<div className="mb-3">
					<div className="px-2 pb-1 text-xs font-medium text-muted-foreground">Аккаунт</div>
					<div className="space-y-0.5">
						<button
							type="button"
							className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
							onClick={clearTokens}
							data-testid="settings-logout"
						>
							<LogOut className="size-4 shrink-0" aria-hidden="true" />
							<span className="flex-1 text-left">Выход</span>
						</button>
					</div>
				</div>
			</nav>
		</aside>
	);

	if (isDesktop) {
		return <div className="w-52 shrink-0 border-r border-sidebar-border">{sidebarContent}</div>;
	}

	return (
		<div className="fixed inset-0 z-40" data-testid="settings-sidebar-overlay">
			<div className="absolute inset-0 bg-black/50" onClick={toggle} aria-hidden="true" />
			<div className="relative z-10 h-full w-64 shadow-lg">{sidebarContent}</div>
		</div>
	);
}
