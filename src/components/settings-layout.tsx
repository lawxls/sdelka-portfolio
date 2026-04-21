import { ArrowLeft, Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation, useOutletContext } from "react-router";
import { PageToolbar } from "@/components/page-toolbar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { SettingsSidebar } from "./settings-sidebar";

type SettingsOutletContext = {
	companiesCreateOpen: boolean;
	setCompaniesCreateOpen: (v: boolean) => void;
	employeesInviteOpen: boolean;
	setEmployeesInviteOpen: (v: boolean) => void;
	emailsCreateOpen: boolean;
	setEmailsCreateOpen: (v: boolean) => void;
};

export function useSettingsOutletContext() {
	return (
		useOutletContext<SettingsOutletContext | undefined>() ?? {
			companiesCreateOpen: false,
			setCompaniesCreateOpen: () => {},
			employeesInviteOpen: false,
			setEmployeesInviteOpen: () => {},
			emailsCreateOpen: false,
			setEmailsCreateOpen: () => {},
		}
	);
}

const BREADCRUMBS: Record<string, [parent: string, current: string]> = {
	"/settings/profile": ["Пользователь", "Профиль"],
	"/settings/workspace": ["Рабочее пространство", "Общие настройки"],
	"/settings/companies": ["Рабочее пространство", "Компании"],
	"/settings/employees": ["Рабочее пространство", "Сотрудники"],
	"/settings/emails": ["Рабочее пространство", "Почты"],
	"/settings/tariffs": ["Аккаунт", "Тарифы"],
};

export function SettingsLayout() {
	const [companiesCreateOpen, setCompaniesCreateOpen] = useState(false);
	const [employeesInviteOpen, setEmployeesInviteOpen] = useState(false);
	const [emailsCreateOpen, setEmailsCreateOpen] = useState(false);
	const location = useLocation();
	const isMobile = useIsMobile();

	const outletContext: SettingsOutletContext = {
		companiesCreateOpen,
		setCompaniesCreateOpen,
		employeesInviteOpen,
		setEmployeesInviteOpen,
		emailsCreateOpen,
		setEmailsCreateOpen,
	};

	function renderBreadcrumb() {
		const crumb = BREADCRUMBS[location.pathname];
		if (isMobile && crumb) {
			return (
				<nav className="flex items-center gap-1 text-sm leading-none" aria-label="breadcrumb">
					<Button
						type="button"
						asChild
						variant="ghost"
						size="icon-sm"
						aria-label="Назад к настройкам"
						className="relative after:absolute after:inset-[-4px] after:content-['']"
					>
						<Link to="/settings">
							<ArrowLeft aria-hidden="true" />
						</Link>
					</Button>
					<span className="font-semibold text-foreground">{crumb[1]}</span>
				</nav>
			);
		}
		return (
			<nav className="flex items-center gap-1 text-sm leading-none" aria-label="breadcrumb">
				<h1 className="font-semibold text-foreground">Настройки</h1>
				{crumb && (
					<>
						<span aria-hidden="true" className="text-border">
							/
						</span>
						<span className="text-muted-foreground">{crumb[0]}</span>
						<span aria-hidden="true" className="text-border">
							/
						</span>
						<span className="text-foreground">{crumb[1]}</span>
					</>
				)}
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
			case "/settings/emails":
				return (
					<Button
						type="button"
						size="sm"
						className="bg-status-highlight hover:bg-status-highlight/80"
						onClick={() => setEmailsCreateOpen(true)}
					>
						<Plus data-icon="inline-start" aria-hidden="true" />
						<span>Добавить почту</span>
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
				<SettingsSidebar />
				<div className="flex min-w-0 flex-1 flex-col overflow-auto">
					<Outlet context={outletContext} />
				</div>
			</div>
		</div>
	);
}
