import { Building2, CreditCard, Mail, Settings, User, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { cn } from "@/lib/utils";

interface NavItemDef {
	path: string;
	label: string;
	icon: React.ReactNode;
}

const USER_ITEMS: NavItemDef[] = [{ path: "/settings/profile", label: "Профиль", icon: <User className="size-4" /> }];

const WORKSPACE_ITEMS: NavItemDef[] = [
	{ path: "/settings/workspace", label: "Общие настройки", icon: <Settings className="size-4" /> },
	{ path: "/settings/companies", label: "Компании", icon: <Building2 className="size-4" /> },
	{ path: "/settings/employees", label: "Сотрудники", icon: <Users className="size-4" /> },
	{ path: "/settings/emails", label: "Почты", icon: <Mail className="size-4" /> },
];

const ACCOUNT_ITEMS: NavItemDef[] = [
	{ path: "/settings/tariffs", label: "Тарифы", icon: <CreditCard className="size-4" /> },
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

export function SettingsSidebar() {
	const location = useLocation();

	return (
		<aside
			className="hidden w-52 shrink-0 flex-col border-r border-border bg-background md:flex"
			data-testid="settings-sidebar"
		>
			<nav className="flex-1 overflow-y-auto p-2" aria-label="Настройки">
				<NavSection title="Пользователь" items={USER_ITEMS} currentPath={location.pathname} />
				<NavSection title="Рабочее пространство" items={WORKSPACE_ITEMS} currentPath={location.pathname} />
				<NavSection title="Аккаунт" items={ACCOUNT_ITEMS} currentPath={location.pathname} />
			</nav>
		</aside>
	);
}
