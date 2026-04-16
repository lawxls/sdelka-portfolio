import { Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { Outlet, useLocation, useOutletContext } from "react-router";
import { PageToolbar } from "@/components/page-toolbar";
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

	const BREADCRUMBS: Record<string, [parent: string, current: string]> = {
		"/settings/profile": ["Пользователь", "Профиль"],
		"/settings/workspace": ["Рабочее пространство", "Общие настройки"],
		"/settings/companies": ["Рабочее пространство", "Компании"],
		"/settings/employees": ["Рабочее пространство", "Сотрудники"],
	};

	function renderBreadcrumb() {
		const crumb = BREADCRUMBS[location.pathname];
		if (!crumb) return null;
		return (
			<nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="breadcrumb">
				<span>{crumb[0]}</span>
				<span aria-hidden="true">/</span>
				<span className="text-foreground">{crumb[1]}</span>
			</nav>
		);
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
			<PageToolbar left={renderBreadcrumb()} right={renderHeaderAction()} />
			<div className="flex min-h-0 flex-1">
				<SettingsSidebar open={open} onOpenChange={setOpen} />
				<div className="flex min-w-0 flex-1 flex-col overflow-auto">
					<Outlet context={outletContext} />
				</div>
			</div>
		</div>
	);
}
