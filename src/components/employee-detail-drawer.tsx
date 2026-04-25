import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { PermissionsMatrix } from "@/components/permissions-matrix";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { PermissionLevel, PermissionModuleKey } from "@/data/types";
import { useUpdateWorkspaceEmployeePermissions, useWorkspaceEmployeeDetail } from "@/data/use-workspace-employees";
import type { WorkspaceEmployeeDetail } from "@/data/workspace-mock-data";
import { formatFullName } from "@/lib/format";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short" });

type DrawerTab = "info" | "permissions";

const TABS: { key: DrawerTab; label: string }[] = [
	{ key: "info", label: "Информация" },
	{ key: "permissions", label: "Права доступа" },
];

export function EmployeeDetailDrawer() {
	const [searchParams, setSearchParams] = useSearchParams();
	const employeeIdStr = searchParams.get("employee");
	const employeeId = employeeIdStr ? Number(employeeIdStr) : null;
	const open = employeeId != null;

	function handleClose() {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete("employee");
				return next;
			},
			{ replace: true },
		);
	}

	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (!next) handleClose();
			}}
		>
			<SheetContent className="flex flex-col max-md:!w-full max-md:!max-w-full max-md:!inset-0 max-md:!rounded-none">
				{employeeId != null && <EmployeeDetailContent key={employeeId} employeeId={employeeId} />}
			</SheetContent>
		</Sheet>
	);
}

function EmployeeDetailContent({ employeeId }: { employeeId: number }) {
	const [activeTab, setActiveTab] = useState<DrawerTab>("info");
	const { employee, isLoading, error } = useWorkspaceEmployeeDetail(employeeId);
	const updatePermsMutation = useUpdateWorkspaceEmployeePermissions();

	if (isLoading) {
		return (
			<div className="flex flex-1 items-center justify-center" data-testid="employee-drawer-loading">
				<LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-label="Загрузка…" />
			</div>
		);
	}

	if (error || !employee) {
		return (
			<div
				className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground"
				data-testid="employee-drawer-error"
			>
				<p className="text-sm">Не удалось загрузить сотрудника</p>
			</div>
		);
	}

	const fullName = formatFullName(employee.lastName, employee.firstName, employee.patronymic);

	function handlePermissionChange(module: PermissionModuleKey, level: PermissionLevel) {
		updatePermsMutation.mutate({ id: employeeId, data: { [module]: level } });
	}

	return (
		<>
			<SheetHeader>
				<SheetTitle data-testid="employee-drawer-title">{fullName}</SheetTitle>
				<SheetDescription className="sr-only">Детали сотрудника</SheetDescription>
			</SheetHeader>

			<div className="flex gap-0 overflow-x-auto border-b border-border px-4" role="tablist">
				{TABS.map((tab) => (
					<button
						key={tab.key}
						type="button"
						role="tab"
						aria-selected={activeTab === tab.key}
						className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors ${
							activeTab === tab.key
								? "border-b-2 border-primary text-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
						onClick={() => setActiveTab(tab.key)}
						data-testid={`employee-tab-${tab.key}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div className="flex-1 overflow-y-auto px-4 py-4">
				{activeTab === "info" && <InfoTab employee={employee} />}
				{activeTab === "permissions" && (
					<div className="flex flex-col gap-2" data-testid="employee-permissions-tab">
						<h4 className="text-xs font-medium text-muted-foreground">Права доступа</h4>
						<PermissionsMatrix permissions={employee.permissions} onChange={handlePermissionChange} />
					</div>
				)}
			</div>
		</>
	);
}

function InfoTab({ employee }: { employee: WorkspaceEmployeeDetail }) {
	return (
		<div className="flex flex-col gap-4" data-testid="employee-info-tab">
			<InfoRow label="ФИО" value={formatFullName(employee.lastName, employee.firstName, employee.patronymic)} />
			<Separator />
			<InfoRow label="Должность" value={employee.position} />
			<Separator />
			<InfoRow label="Почта" value={employee.email} />
			<Separator />
			<InfoRow
				label="Компании"
				value={employee.companies.length > 0 ? employee.companies.map((c) => c.name).join(", ") : "—"}
			/>
			<Separator />
			<InfoRow
				label="Дата регистрации"
				value={employee.registeredAt ? dateFormatter.format(new Date(employee.registeredAt)) : "Приглашение отправлено"}
			/>
		</div>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-xs text-muted-foreground">{label}</span>
			<span className="text-sm">{value}</span>
		</div>
	);
}
