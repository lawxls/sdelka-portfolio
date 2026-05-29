import { Archive, ArchiveRestore } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { EmployeeDetailDrawer } from "@/components/employee-detail-drawer";
import { InviteEmployeesDrawer } from "@/components/invite-employees-drawer";
import { useSettingsOutletContext } from "@/components/settings-layout";
import { SettingsTableToolbar } from "@/components/settings-table-toolbar";
import { TableEmptyState } from "@/components/table-empty-state";
import { ToolbarFilterPopover } from "@/components/toolbar-filter-popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { WorkspaceEmployee } from "@/data/domains/workspace-employees";
import type { EmployeeRole } from "@/data/types";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/data/types";
import {
	useDeleteWorkspaceEmployees,
	useUnarchiveWorkspaceEmployees,
	useWorkspaceEmployees,
} from "@/data/use-workspace-employees";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useModuleGuard } from "@/hooks/use-module-guard";
import { getAvatarColorForId } from "@/lib/avatar-colors";
import { formatFullName, formatRegistrationDate, formatRussianPlural, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function EmployeesSettingsPage() {
	const isMobile = useIsMobile();
	const [, setSearchParams] = useSearchParams();
	const { employeesInviteOpen: inviteOpen, setEmployeesInviteOpen: setInviteOpen } = useSettingsOutletContext();
	const { guard } = useModuleGuard("employees");

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [search, setSearch] = useState("");
	const [searchExpanded, setSearchExpanded] = useState(false);
	const [archiveActive, setArchiveActive] = useState(false);
	const [roleFilter, setRoleFilter] = useState<EmployeeRole | null>(null);

	const { employees } = useWorkspaceEmployees({
		q: search || undefined,
		role: roleFilter ?? undefined,
		archived: archiveActive,
	});

	const archiveMutation = useDeleteWorkspaceEmployees();
	const unarchiveMutation = useUnarchiveWorkspaceEmployees();

	const allSelected = employees.length > 0 && employees.every((e) => selected.has(e.id));

	const roleFilterSections = useMemo(
		() => [
			{
				title: "Роль",
				options: ASSIGNABLE_ROLES.map((r) => ({
					value: r,
					label: ROLE_LABELS[r],
					isActive: roleFilter === r,
					onSelect: () => setRoleFilter(roleFilter === r ? null : r),
				})),
			},
		],
		[roleFilter],
	);

	function toggleRow(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleAll() {
		if (allSelected) {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const e of employees) next.delete(e.id);
				return next;
			});
		} else {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const e of employees) next.add(e.id);
				return next;
			});
		}
	}

	function clearSelection() {
		setSelected(new Set());
	}

	function handleRowClick(employee: WorkspaceEmployee) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("employee", employee.id);
				return next;
			},
			{ replace: true },
		);
	}

	function handleArchive() {
		const ids = Array.from(selected);
		if (ids.length === 0) return;
		archiveMutation.mutate(ids, {
			onSuccess: (result) => {
				clearSelection();
				const archivedCount = result.archived.length;
				if (archivedCount > 0) {
					toast.success(
						archivedCount === 1
							? "Сотрудник архивирован"
							: `Архивировано ${formatRussianPlural(archivedCount, ["сотрудник", "сотрудника", "сотрудников"])}`,
					);
				}
				for (const failure of result.failed) {
					if (failure.code === "cannot_archive_owner") {
						toast.error("Нельзя архивировать владельца рабочего пространства");
					} else if (failure.code === "cannot_archive_admin") {
						toast.error("Сначала измените роль на «Пользователь»");
					}
				}
			},
			onError: () => toast.error("Не удалось архивировать"),
		});
	}

	function handleUnarchive() {
		const ids = Array.from(selected);
		if (ids.length === 0) return;
		unarchiveMutation.mutate(ids, {
			onSuccess: (result) => {
				clearSelection();
				const count = result.unarchived.length;
				if (count > 0) {
					toast.success(
						count === 1
							? "Сотрудник разархивирован"
							: `Разархивировано ${formatRussianPlural(count, ["сотрудник", "сотрудника", "сотрудников"])}`,
					);
				}
			},
			onError: () => toast.error("Не удалось разархивировать"),
		});
	}

	const emptyMessage = archiveActive ? "В архиве пусто" : "Никого не нашли";

	return (
		<>
			<main className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/50 overflow-auto">
				<SettingsTableToolbar
					totalCount={employees.length}
					totalForms={["сотрудник", "сотрудника", "сотрудников"]}
					primaryAction={
						<Button
							type="button"
							size="sm"
							className="btn-cta ml-2 rounded-full border-0"
							onClick={guard(() => setInviteOpen(true))}
						>
							<span>Добавить сотрудника</span>
						</Button>
					}
					search={{
						value: search,
						onChange: setSearch,
						expanded: searchExpanded,
						onExpandedChange: setSearchExpanded,
						ariaLabel: "Поиск сотрудников",
						placeholder: "Имя, почта, должность…",
					}}
					filter={
						<ToolbarFilterPopover
							ariaLabel="Фильтр по роли"
							tooltip="Фильтр по роли"
							rowLabel="Фильтр по роли"
							sections={roleFilterSections}
						/>
					}
					mobileMore={
						<ToolbarFilterPopover
							ariaLabel="Фильтр по роли"
							tooltip="Фильтр по роли"
							rowLabel="Фильтр по роли"
							triggerVariant="row"
							sections={roleFilterSections}
						/>
					}
					archiveActive={archiveActive}
					onToggleArchive={() => {
						clearSelection();
						setArchiveActive((v) => !v);
					}}
					selectedCount={selected.size}
					onClearSelection={clearSelection}
					bulkForms={["сотрудник", "сотрудника", "сотрудников"]}
					bulkActions={[
						archiveActive
							? {
									label: "Разархивировать",
									icon: <ArchiveRestore data-icon="inline-start" className="size-3.5" aria-hidden="true" />,
									onClick: guard(handleUnarchive),
								}
							: {
									label: "Архивировать",
									icon: <Archive data-icon="inline-start" className="size-3.5" aria-hidden="true" />,
									onClick: guard(handleArchive),
								},
					]}
				/>
				{isMobile ? (
					<div className="flex flex-col gap-3 p-4">
						{employees.map((employee, index) => {
							const isSelected = selected.has(employee.id);
							const fullName = formatFullName(employee.lastName, employee.firstName, employee.patronymic);
							const displayName = fullName || "Без имени";
							return (
								<article
									key={employee.id}
									data-testid={`employee-card-${employee.id}`}
									className={cn(
										"rounded-lg border bg-background p-4 touch-manipulation transition-[background-color,border-color,scale] duration-150 ease-out has-[button:active]:scale-[0.96] motion-reduce:has-[button:active]:scale-100",
										isSelected ? "border-primary/60 bg-accent/40" : "hover:bg-muted/50 has-[button:active]:bg-muted/50",
									)}
								>
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<Checkbox
												checked={isSelected}
												onCheckedChange={() => toggleRow(employee.id)}
												aria-label={`Выбрать ${displayName}`}
											/>
											<span className="text-xs text-muted-foreground tabular-nums">{index + 1}</span>
										</div>
									</div>
									<button
										type="button"
										onClick={() => handleRowClick(employee)}
										className="mt-2 flex w-full flex-col items-start text-left"
									>
										<div className="flex w-full items-center gap-3">
											<span
												aria-hidden="true"
												className={cn(
													"flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
													getAvatarColorForId(employee.id),
												)}
											>
												{getInitials(employee.firstName, employee.lastName)}
											</span>
											<div className="flex min-w-0 flex-1 flex-col leading-tight">
												<span className="truncate font-medium text-sm">{displayName}</span>
												{employee.position && (
													<span className="mt-0.5 truncate text-xs text-muted-foreground">{employee.position}</span>
												)}
											</div>
										</div>
										<dl className="mt-3 grid w-full grid-cols-2 gap-x-4 gap-y-2 text-sm">
											<div className="col-span-2 min-w-0">
												<dt className="text-xs text-muted-foreground">Почта</dt>
												<dd className="truncate">{employee.email}</dd>
											</div>
											<div>
												<dt className="text-xs text-muted-foreground">Роль</dt>
												<dd>{ROLE_LABELS[employee.role]}</dd>
											</div>
											<div>
												<dt className="text-xs text-muted-foreground">Регистрация</dt>
												<dd className="tabular-nums">{formatRegistrationDate(employee.registeredAt)}</dd>
											</div>
										</dl>
									</button>
								</article>
							);
						})}
						{employees.length === 0 && <TableEmptyState message={emptyMessage} />}
					</div>
				) : (
					<table className="w-full text-sm">
						<thead className="sticky top-0 z-10 bg-background border-b border-border">
							<tr className="text-left text-muted-foreground">
								<th className="w-10 px-lg py-sm">
									<Checkbox
										checked={allSelected}
										onCheckedChange={toggleAll}
										aria-label="Выбрать всех сотрудников"
										disabled={employees.length === 0}
									/>
								</th>
								<th className="px-lg py-sm font-medium">ФИО</th>
								<th className="px-lg py-sm font-medium">Почта</th>
								<th className="px-lg py-sm font-medium">Роль</th>
								<th className="px-lg py-sm font-medium tabular-nums text-right">Дата регистрации</th>
							</tr>
						</thead>
						<tbody>
							{employees.map((employee) => {
								const isSelected = selected.has(employee.id);
								const displayName =
									formatFullName(employee.lastName, employee.firstName, employee.patronymic) || "Без имени";
								return (
									<tr
										key={employee.id}
										className={cn(
											"border-b border-border cursor-pointer transition-colors",
											isSelected ? "bg-accent/40" : "bg-background hover:bg-muted/50",
										)}
										onClick={() => handleRowClick(employee)}
									>
										<td
											className="px-lg py-sm"
											onClick={(e) => {
												e.stopPropagation();
											}}
											onKeyDown={(e) => {
												if (e.key === " " || e.key === "Enter") e.stopPropagation();
											}}
										>
											<Checkbox
												checked={isSelected}
												onCheckedChange={() => toggleRow(employee.id)}
												aria-label={`Выбрать ${displayName}`}
											/>
										</td>
										<td className="px-lg py-sm">
											<div className="flex items-center gap-3">
												<span
													aria-hidden="true"
													className={cn(
														"flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
														getAvatarColorForId(employee.id),
													)}
												>
													{getInitials(employee.firstName, employee.lastName)}
												</span>
												<div className="flex min-w-0 flex-col leading-tight">
													<span className="truncate font-medium text-foreground">{displayName}</span>
													{employee.position && (
														<span className="mt-0.5 truncate text-xs text-muted-foreground">{employee.position}</span>
													)}
												</div>
											</div>
										</td>
										<td className="px-lg py-sm text-muted-foreground">{employee.email}</td>
										<td className="px-lg py-sm text-muted-foreground">{ROLE_LABELS[employee.role]}</td>
										<td className="px-lg py-sm tabular-nums text-muted-foreground text-right">
											{formatRegistrationDate(employee.registeredAt)}
										</td>
									</tr>
								);
							})}
							{employees.length === 0 && (
								<tr>
									<td colSpan={5} className="px-lg py-10 text-center text-muted-foreground">
										{emptyMessage}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				)}
			</main>

			<InviteEmployeesDrawer open={inviteOpen} onOpenChange={setInviteOpen} />
			<EmployeeDetailDrawer />
		</>
	);
}
