import { Building2, CreditCard, LogOut, Mail, Settings, User, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { canViewNavItem } from "@/data/permissions";
import type { PermissionModuleKey } from "@/data/types";
import { useMe } from "@/data/use-me";
import { useLogout } from "@/data/use-session";
import { cn } from "@/lib/utils";

interface NavItemDef {
	path: string;
	label: string;
	icon: React.ReactNode;
	module?: PermissionModuleKey;
}

const ACCOUNT_ITEMS: NavItemDef[] = [
	{ path: "/settings/profile", label: "Профиль", icon: <User className="size-4" /> },
];

const WORKSPACE_ITEMS: NavItemDef[] = [
	{
		path: "/settings/workspace",
		label: "Общие настройки",
		icon: <Settings className="size-4" />,
		module: "workspaceSettings",
	},
	{
		path: "/settings/tariffs",
		label: "Тарифы",
		icon: <CreditCard className="size-4" />,
		module: "workspaceSettings",
	},
	{ path: "/settings/companies", label: "Компании", icon: <Building2 className="size-4" />, module: "companies" },
	{ path: "/settings/employees", label: "Сотрудники", icon: <Users className="size-4" />, module: "employees" },
	{ path: "/settings/emails", label: "Почты", icon: <Mail className="size-4" />, module: "emails" },
];

function NavItem({ path, label, icon, isActive }: NavItemDef & { isActive: boolean }) {
	const navigate = useNavigate();

	return (
		<button
			type="button"
			className={cn(
				"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
				isActive ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-foreground hover:bg-muted",
			)}
			onClick={() => navigate(path)}
		>
			<span className="shrink-0 text-muted-foreground" aria-hidden="true">
				{icon}
			</span>
			<span className="flex-1 text-left">{label}</span>
		</button>
	);
}

function NavSection({ title, items, currentPath }: { title: string; items: NavItemDef[]; currentPath: string }) {
	if (items.length === 0) return null;
	return (
		<div className="mb-3">
			<div className="px-2 pb-1 text-xs font-medium text-muted-foreground">{title}</div>
			<div className="space-y-0.5">
				{items.map((item) => (
					<NavItem key={item.path} {...item} isActive={currentPath === item.path} />
				))}
			</div>
		</div>
	);
}

function LogoutItem() {
	const logout = useLogout();
	return (
		<button
			type="button"
			className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
			onClick={() => logout.mutate()}
			disabled={logout.isPending}
		>
			<span className="shrink-0" aria-hidden="true">
				<LogOut className="size-4" />
			</span>
			<span className="flex-1 text-left">Выйти</span>
		</button>
	);
}

export function SettingsSidebar() {
	const location = useLocation();
	const { data: me } = useMe();
	const workspaceItems = WORKSPACE_ITEMS.filter((item) => canViewNavItem(me, item));

	return (
		<aside
			className="hidden w-52 shrink-0 flex-col border-r border-border bg-background md:flex"
			data-testid="settings-sidebar"
		>
			<nav className="flex-1 overflow-y-auto p-2" aria-label="Настройки">
				<NavSection title="Аккаунт" items={ACCOUNT_ITEMS} currentPath={location.pathname} />
				<NavSection title="Рабочее пространство" items={workspaceItems} currentPath={location.pathname} />
			</nav>
			<div className="p-2">
				<LogoutItem />
			</div>
		</aside>
	);
}
