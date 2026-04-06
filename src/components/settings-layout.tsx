import { Menu, MoveLeft, Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation, useOutletContext } from "react-router";
import { Button } from "@/components/ui/button";
import { DESKTOP_QUERY } from "./folder-sidebar";
import { SettingsSidebar } from "./settings-sidebar";

type SettingsOutletContext = {
	companiesCreateOpen: boolean;
	setCompaniesCreateOpen: (v: boolean) => void;
	employeesInviteOpen: boolean;
	setEmployeesInviteOpen: (v: boolean) => void;
};

export function useSettingsOutletContext() {
	return (
		useOutletContext<SettingsOutletContext | undefined>() ?? {
			companiesCreateOpen: false,
			setCompaniesCreateOpen: () => {},
			employeesInviteOpen: false,
			setEmployeesInviteOpen: () => {},
		}
	);
}

export function SettingsLayout() {
	const [open, setOpen] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
	const [companiesCreateOpen, setCompaniesCreateOpen] = useState(false);
	const [employeesInviteOpen, setEmployeesInviteOpen] = useState(false);
	const location = useLocation();

	const outletContext: SettingsOutletContext = {
		companiesCreateOpen,
		setCompaniesCreateOpen,
		employeesInviteOpen,
		setEmployeesInviteOpen,
	};

	function renderBreadcrumb() {
		switch (location.pathname) {
			case "/settings/profile":
				return (
					<nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="breadcrumb">
						<span>Пользователь</span>
						<span aria-hidden="true">/</span>
						<span className="text-foreground">Профиль</span>
					</nav>
				);
			case "/settings/workspace":
				return (
					<nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="breadcrumb">
						<span>Рабочее пространство</span>
						<span aria-hidden="true">/</span>
						<span className="text-foreground">Общие настройки</span>
					</nav>
				);
			case "/settings/companies":
				return (
					<nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="breadcrumb">
						<span>Рабочее пространство</span>
						<span aria-hidden="true">/</span>
						<span className="text-foreground">Компании</span>
					</nav>
				);
			case "/settings/employees":
				return (
					<nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="breadcrumb">
						<span>Рабочее пространство</span>
						<span aria-hidden="true">/</span>
						<span className="text-foreground">Сотрудники</span>
					</nav>
				);
		}
	}

	function renderHeaderAction() {
		switch (location.pathname) {
			case "/settings/companies":
				return (
					<Button
						type="button"
						size="sm"
						className="bg-status-highlight hover:bg-status-highlight/80"
						onClick={() => setCompaniesCreateOpen(true)}
					>
						<Plus data-icon="inline-start" aria-hidden="true" />
						<span>Добавить компанию</span>
					</Button>
				);
			case "/settings/employees":
				return (
					<Button
						type="button"
						size="sm"
						className="bg-status-highlight hover:bg-status-highlight/80"
						onClick={() => setEmployeesInviteOpen(true)}
					>
						<UserPlus data-icon="inline-start" aria-hidden="true" />
						<span>Отправить приглашения</span>
					</Button>
				);
		}
	}

	return (
		<div
			className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground"
			data-testid="settings-layout"
		>
			<header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-md border-b border-border bg-background px-lg py-sm">
				<div className="flex items-center gap-sm">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Открыть меню настроек"
						onClick={() => setOpen(true)}
						className="shrink-0 md:hidden"
					>
						<Menu className="size-4" />
					</Button>
					<Button variant="ghost" size="icon-sm" aria-label="Назад" asChild>
						<Link to="/procurement">
							<MoveLeft className="size-4" />
						</Link>
					</Button>
					{renderBreadcrumb()}
				</div>
				{renderHeaderAction()}
			</header>
			<div className="flex min-h-0 flex-1">
				<SettingsSidebar open={open} onOpenChange={setOpen} />
				<div className="flex min-w-0 flex-1 flex-col overflow-auto">
					<Outlet context={outletContext} />
				</div>
			</div>
		</div>
	);
}
