import { ArrowLeft, Building2, Layers, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CompanySummary } from "@/data/types";
import { cn } from "@/lib/utils";
import { DESKTOP_QUERY, FolderSidebar, type FolderSidebarProps } from "./folder-sidebar";

interface ProcurementSidebarProps extends FolderSidebarProps {
	companies: CompanySummary[];
	companiesLoading: boolean;
	selectedCompany: string | undefined;
	isMultiCompany: boolean;
	onCompanySelect: (companyId: string | undefined) => void;
}

function navItemClassName(active: boolean) {
	return cn(
		"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
		active
			? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
			: "text-sidebar-foreground hover:bg-sidebar-accent/50",
	);
}

function CompanyNavigator({
	companies,
	isLoading,
	allActive,
	onSelectAll,
	onSelectCompany,
}: {
	companies: CompanySummary[];
	isLoading: boolean;
	allActive: boolean;
	onSelectAll: () => void;
	onSelectCompany: (id: string) => void;
}) {
	return (
		<div data-testid="company-navigator">
			<div className="space-y-0.5">
				<button type="button" className={navItemClassName(allActive)} onClick={onSelectAll}>
					<Layers className="size-4 shrink-0" aria-hidden="true" />
					<span className="flex-1 text-left">Все закупки</span>
					<span className="tabular-nums text-xs text-muted-foreground">
						{companies.reduce((sum, c) => sum + c.procurementItemCount, 0)}
					</span>
				</button>
			</div>

			<div className="my-2 border-t border-sidebar-border" />

			{isLoading ? (
				<div className="space-y-1 px-2" data-testid="company-skeletons">
					{["sk-1", "sk-2", "sk-3"].map((id) => (
						<div key={id} className="flex items-center gap-2 py-1.5">
							<Skeleton className="size-4 rounded" />
							<Skeleton className="h-4 flex-1" />
						</div>
					))}
				</div>
			) : (
				<div className="space-y-0.5">
					{companies.map((company) => (
						<button
							key={company.id}
							type="button"
							className={navItemClassName(false)}
							onClick={() => onSelectCompany(company.id)}
						>
							<Building2 className="size-4 shrink-0" aria-hidden="true" />
							<span className="flex-1 truncate text-left">{company.name}</span>
							<span className="tabular-nums text-xs text-muted-foreground">{company.procurementItemCount}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}

export function ProcurementSidebar({
	companies,
	companiesLoading,
	selectedCompany,
	isMultiCompany,
	onCompanySelect,
	...folderSidebarProps
}: ProcurementSidebarProps) {
	const { open, onOpenChange } = folderSidebarProps;

	// While companies loading, show folder sidebar (avoids flash)
	if (companiesLoading) {
		return <FolderSidebar {...folderSidebarProps} />;
	}

	// Single company → always show folder sidebar
	if (!isMultiCompany) {
		return <FolderSidebar {...folderSidebarProps} />;
	}

	// Multi-company with selection → folder sidebar + back button
	if (selectedCompany) {
		const companyName = companies.find((c) => c.id === selectedCompany)?.name;
		return (
			<FolderSidebar
				{...folderSidebarProps}
				title={companyName}
				headerSlot={
					<Button
						variant="ghost"
						size="sm"
						className="w-full justify-start gap-2 text-muted-foreground"
						onClick={() => onCompanySelect(undefined)}
						data-testid="company-back-button"
					>
						<ArrowLeft className="size-4" />
						Все компании
					</Button>
				}
			/>
		);
	}

	// Multi-company no selection → company navigator
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
		if (window.matchMedia(DESKTOP_QUERY).matches) {
			localStorage.setItem("sidebar-open", String(next));
		}
		onOpenChange(next);
	}

	const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;

	const content = (
		<aside className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground" data-testid="sidebar">
			<div className="flex shrink-0 items-center justify-between border-b border-sidebar-border px-3 py-2">
				<h2 className="text-sm font-semibold">Компании</h2>
				<Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Закрыть боковую панель">
					<ArrowLeft className="size-4" />
				</Button>
			</div>
			<nav className="flex-1 overflow-y-auto p-2" aria-label="Компании">
				<CompanyNavigator
					companies={companies}
					isLoading={companiesLoading}
					allActive={!selectedCompany}
					onSelectAll={() => onCompanySelect(undefined)}
					onSelectCompany={onCompanySelect}
				/>
			</nav>
		</aside>
	);

	if (isDesktop) {
		return <div className="w-52 shrink-0 border-r border-sidebar-border">{content}</div>;
	}

	return (
		<div className="fixed inset-0 z-40" data-testid="sidebar-overlay">
			<div className="absolute inset-0 bg-black/50" onClick={toggle} aria-hidden="true" />
			<div className="relative z-10 h-full w-64 shadow-lg">{content}</div>
		</div>
	);
}
