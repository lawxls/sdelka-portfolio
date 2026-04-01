import type { LucideIcon } from "lucide-react";
import { Building2, Layers, LayoutDashboard, ListTodo, LoaderCircle, Pencil } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UpdatePermissionsData, WorkspaceEmployeeDetail } from "@/data/api-client";
import type { EmployeePermissions, PermissionLevel } from "@/data/types";
import { useUpdateWorkspaceEmployeePermissions, useWorkspaceEmployeeDetail } from "@/data/use-workspace-employees";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short" });

type DrawerTab = "info" | "permissions";

const TABS: { key: DrawerTab; label: string }[] = [
	{ key: "info", label: "Информация" },
	{ key: "permissions", label: "Права доступа" },
];

const PERMISSION_MODULES: {
	key: keyof Omit<EmployeePermissions, "id" | "employeeId">;
	label: string;
	Icon: LucideIcon;
}[] = [
	{ key: "analytics", label: "Аналитика", Icon: LayoutDashboard },
	{ key: "procurement", label: "Закупки", Icon: Layers },
	{ key: "companies", label: "Компании", Icon: Building2 },
	{ key: "tasks", label: "Задачи", Icon: ListTodo },
];

const PERMISSION_LEVELS: { value: PermissionLevel; label: string }[] = [
	{ value: "none", label: "Нет доступа" },
	{ value: "view", label: "Просмотр" },
	{ value: "edit", label: "Редактирование" },
];

const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
	none: "Нет доступа",
	view: "Просмотр",
	edit: "Редактирование",
};

const PERM_COLOR: Record<PermissionLevel, string> = {
	edit: "text-green-600 dark:text-green-400",
	view: "text-yellow-600 dark:text-yellow-400",
	none: "text-red-500/60 dark:text-red-400/60",
};

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

	const fullName = [employee.lastName, employee.firstName, employee.patronymic].filter(Boolean).join(" ");

	function handlePermissionChange(module: keyof UpdatePermissionsData, level: PermissionLevel) {
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
					<PermissionsTab permissions={employee.permissions} onPermissionChange={handlePermissionChange} />
				)}
			</div>
		</>
	);
}

function InfoTab({ employee }: { employee: WorkspaceEmployeeDetail }) {
	return (
		<div className="flex flex-col gap-4" data-testid="employee-info-tab">
			<InfoRow
				label="ФИО"
				value={[employee.lastName, employee.firstName, employee.patronymic].filter(Boolean).join(" ")}
			/>
			<Separator />
			<InfoRow label="Должность" value={employee.position} />
			<Separator />
			<InfoRow label="Почта" value={employee.email} />
			<Separator />
			<InfoRow
				label="Компании"
				value={employee.companies.length > 0 ? employee.companies.map((c) => c.name).join(", ") : "\u2014"}
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

function PermissionsTab({
	permissions,
	onPermissionChange,
}: {
	permissions: EmployeePermissions;
	onPermissionChange: (module: keyof UpdatePermissionsData, level: PermissionLevel) => void;
}) {
	return (
		<div className="flex flex-col gap-2" data-testid="employee-permissions-tab">
			<h4 className="text-xs font-medium text-muted-foreground">Права доступа</h4>
			<PermissionsMatrix permissions={permissions} onChange={onPermissionChange} />
		</div>
	);
}

function PermissionsMatrix({
	permissions,
	onChange,
}: {
	permissions: EmployeePermissions;
	onChange: (module: keyof UpdatePermissionsData, level: PermissionLevel) => void;
}) {
	const [editing, setEditing] = useState(false);

	if (!editing) {
		return (
			<div className="flex items-center gap-2" data-testid="permissions-matrix">
				{PERMISSION_MODULES.map((mod) => {
					const level = permissions[mod.key];
					return (
						<Tooltip key={mod.key}>
							<TooltipTrigger asChild>
								<div className="rounded-md bg-muted/50 p-1.5" data-testid={`perm-row-${mod.key}`}>
									<mod.Icon className={`size-5 ${PERM_COLOR[level]}`} aria-hidden="true" />
								</div>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="text-xs">
								{mod.label}: {PERMISSION_LEVEL_LABELS[level]}
							</TooltipContent>
						</Tooltip>
					);
				})}
				<button
					type="button"
					className="ml-0.5 inline-flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:text-foreground"
					onClick={() => setEditing(true)}
					aria-label="Редактировать права доступа"
				>
					<Pencil className="size-3" aria-hidden="true" />
				</button>
			</div>
		);
	}

	return (
		<div
			className="inline-flex flex-col gap-3 self-start rounded-lg border border-border p-3"
			data-testid="permissions-matrix"
		>
			{PERMISSION_MODULES.map((mod) => {
				const level = permissions[mod.key];
				return (
					<div key={mod.key} className="flex flex-col gap-1.5" data-testid={`perm-row-${mod.key}`}>
						<div className="flex items-center gap-1.5">
							<mod.Icon className={`size-4 ${PERM_COLOR[level]}`} aria-hidden="true" />
							<span className="text-xs font-medium">{mod.label}</span>
						</div>
						<PermissionSegments value={level} onChange={(l) => onChange(mod.key, l)} moduleKey={mod.key} />
					</div>
				);
			})}
			<div className="flex justify-end">
				<Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
					Готово
				</Button>
			</div>
		</div>
	);
}

function PermissionSegments({
	value,
	onChange,
	moduleKey,
}: {
	value: PermissionLevel;
	onChange: (level: PermissionLevel) => void;
	moduleKey: string;
}) {
	return (
		<div className="inline-flex rounded-md border border-border text-xs">
			{PERMISSION_LEVELS.map((lvl) => (
				<button
					key={lvl.value}
					type="button"
					aria-pressed={value === lvl.value}
					className={`border-r border-border px-2 py-1 transition-colors first:rounded-l-md last:rounded-r-md last:border-r-0 ${
						value === lvl.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
					}`}
					onClick={() => onChange(lvl.value)}
					data-testid={`perm-${moduleKey}-${lvl.value}`}
				>
					{lvl.label}
				</button>
			))}
		</div>
	);
}
