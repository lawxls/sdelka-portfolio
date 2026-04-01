import type { LucideIcon } from "lucide-react";
import { Building2, Layers, LayoutDashboard, ListTodo, LoaderCircle, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ViewField } from "@/components/view-field";
import type { EmployeePermissions, PermissionLevel } from "@/data/types";
import { PRIVILEGED_ROLES, ROLE_LABELS } from "@/data/types";
import { useUpdateWorkspaceEmployeePermissions } from "@/data/use-workspace";
import type { WorkspaceEmployee } from "@/data/workspace-types";
import { formatEmployeeFullName } from "@/lib/format";
import { cn } from "@/lib/utils";

type EmployeeTab = "info" | "permissions";

const TABS: { key: EmployeeTab; label: string }[] = [
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

const PERM_COLOR: Record<PermissionLevel, string> = {
	edit: "text-green-600 dark:text-green-400",
	view: "text-yellow-600 dark:text-yellow-400",
	none: "text-red-500/60 dark:text-red-400/60",
};

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
					className={cn(
						"border-r border-border px-2 py-1 transition-colors first:rounded-l-md last:rounded-r-md last:border-r-0",
						value === lvl.value ? "bg-primary text-primary-foreground" : "hover:bg-muted",
					)}
					onClick={() => onChange(lvl.value)}
					data-testid={`perm-${moduleKey}-${lvl.value}`}
				>
					{lvl.label}
				</button>
			))}
		</div>
	);
}

function PermissionsMatrix({
	permissions,
	employeeId,
	readOnly = false,
}: {
	permissions: EmployeePermissions;
	employeeId: number;
	readOnly?: boolean;
}) {
	const [editing, setEditing] = useState(false);
	const [localPerms, setLocalPerms] = useState<EmployeePermissions>(permissions);
	const updateMutation = useUpdateWorkspaceEmployeePermissions(employeeId);

	function handleChange(module: keyof Omit<EmployeePermissions, "id" | "employeeId">, level: PermissionLevel) {
		setLocalPerms((prev) => ({ ...prev, [module]: level }));
	}

	function handleDone() {
		const changed: Partial<EmployeePermissions> = {};
		for (const mod of PERMISSION_MODULES) {
			if (localPerms[mod.key] !== permissions[mod.key]) {
				changed[mod.key] = localPerms[mod.key];
			}
		}
		if (Object.keys(changed).length > 0) {
			updateMutation.mutate(changed);
		}
		setEditing(false);
	}

	if (!editing) {
		return (
			<div className="flex items-center gap-2" data-testid="permissions-matrix">
				{PERMISSION_MODULES.map((mod) => {
					const level = localPerms[mod.key];
					return (
						<Tooltip key={mod.key}>
							<TooltipTrigger asChild>
								<div className="p-1.5 rounded-md bg-muted/50" data-testid={`perm-row-${mod.key}`}>
									<mod.Icon className={`size-5 ${PERM_COLOR[level]}`} aria-hidden="true" />
								</div>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="text-xs">
								{mod.label}: {PERMISSION_LEVELS.find((l) => l.value === level)?.label}
							</TooltipContent>
						</Tooltip>
					);
				})}
				{!readOnly && (
					<button
						type="button"
						className="inline-flex items-center justify-center size-6 rounded text-muted-foreground/60 hover:text-foreground transition-colors ml-0.5"
						onClick={() => setEditing(true)}
						aria-label="Редактировать права доступа"
					>
						<Pencil className="size-3" aria-hidden="true" />
					</button>
				)}
			</div>
		);
	}

	return (
		<div
			className="inline-flex flex-col gap-3 rounded-lg border border-border p-3 self-start"
			data-testid="permissions-matrix"
		>
			{PERMISSION_MODULES.map((mod) => {
				const level = localPerms[mod.key];
				return (
					<div key={mod.key} className="flex flex-col gap-1.5" data-testid={`perm-row-${mod.key}`}>
						<div className="flex items-center gap-1.5">
							<mod.Icon className={`size-4 ${PERM_COLOR[level]}`} aria-hidden="true" />
							<span className="text-xs font-medium">{mod.label}</span>
						</div>
						<PermissionSegments value={level} onChange={(l) => handleChange(mod.key, l)} moduleKey={mod.key} />
					</div>
				);
			})}
			<div className="flex justify-end gap-2">
				{updateMutation.isPending && (
					<LoaderCircle className="size-4 animate-spin text-muted-foreground self-center" aria-label="Сохранение…" />
				)}
				<Button type="button" variant="outline" size="sm" onClick={handleDone}>
					Готово
				</Button>
			</div>
		</div>
	);
}

interface EmployeeDetailDrawerProps {
	employee: WorkspaceEmployee | null;
	onClose: () => void;
}

export function EmployeeDetailDrawer({ employee, onClose }: EmployeeDetailDrawerProps) {
	const [activeTab, setActiveTab] = useState<EmployeeTab>("info");

	return (
		<Sheet
			open={employee !== null}
			onOpenChange={(next) => {
				if (!next) onClose();
			}}
		>
			<SheetContent
				className="flex flex-col max-md:!w-full max-md:!max-w-full max-md:!inset-0 max-md:!rounded-none"
				data-testid="employee-detail-drawer"
			>
				{employee && (
					<>
						<SheetHeader>
							<SheetTitle>{formatEmployeeFullName(employee)}</SheetTitle>
							<SheetDescription className="sr-only">Детали сотрудника</SheetDescription>
						</SheetHeader>

						<div className="flex gap-0 overflow-x-auto border-b border-border px-4" role="tablist">
							{TABS.map((tab) => (
								<button
									key={tab.key}
									type="button"
									role="tab"
									aria-selected={activeTab === tab.key}
									className={cn(
										"shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors",
										activeTab === tab.key
											? "border-b-2 border-primary text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
									onClick={() => setActiveTab(tab.key)}
									data-testid={`emp-tab-${tab.key}`}
								>
									{tab.label}
								</button>
							))}
						</div>

						<div className="flex-1 overflow-y-auto px-4 py-4">
							{activeTab === "info" && (
								<div className="grid grid-cols-2 gap-x-4 gap-y-3">
									<ViewField label="Фамилия" value={employee.lastName} />
									<ViewField label="Имя" value={employee.firstName} />
									<ViewField label="Отчество" value={employee.patronymic || "—"} />
									<ViewField label="Должность" value={employee.position} />
									<ViewField label="Электронная почта" value={employee.email} />
									<ViewField label="Телефон" value={employee.phone} />
									<ViewField label="Роль" value={ROLE_LABELS[employee.role]} />
									<div className="col-span-2">
										<ViewField label="Компании" value={employee.companies.map((c) => c.name).join(", ") || "—"} />
									</div>
								</div>
							)}

							{activeTab === "permissions" && (
								<div className="flex flex-col gap-3">
									<Separator />
									<div className="flex flex-col gap-2">
										<h4 className="text-xs font-medium text-muted-foreground">Права доступа</h4>
										<PermissionsMatrix
											permissions={employee.permissions}
											employeeId={employee.id}
											readOnly={PRIVILEGED_ROLES.has(employee.role)}
										/>
									</div>
								</div>
							)}
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}
