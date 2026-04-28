import { Archive, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { EmployeeDetailDrawer } from "@/components/employee-detail-drawer";
import { includesCI } from "@/components/global-search-matcher";
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
import { useDeleteWorkspaceEmployees, useWorkspaceEmployees } from "@/data/use-workspace-employees";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { getAvatarColorForId } from "@/lib/avatar-colors";
import { formatFullName, formatRussianPlural, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short" });

function formatRegistrationDate(registeredAt: string | null | undefined): string {
	if (!registeredAt) return "Приглашение отправлено";
	return dateFormatter.format(new Date(registeredAt));
}

function matchesEmployee(employee: WorkspaceEmployee, needle: string): boolean {
	if (!needle) return true;
	return (
		includesCI(formatFullName(employee.lastName, employee.firstName, employee.patronymic), needle) ||
		includesCI(employee.email, needle) ||
		includesCI(employee.position, needle)
	);
}

export function EmployeesSettingsPage() {
	const isMobile = useIsMobile();
	const [, setSearchParams] = useSearchParams();
	const { employeesInviteOpen: inviteOpen, setEmployeesInviteOpen: setInviteOpen } = useSettingsOutletContext();
	const { employees } = useWorkspaceEmployees();
	const deleteMutation = useDeleteWorkspaceEmployees();

	const [selected, setSelected] = useState<Set<number>>(new Set());
	const [search, setSearch] = useState("");
	const [searchExpanded, setSearchExpanded] = useState(false);
	const [archiveActive, setArchiveActive] = useState(false);
	const [roleFilter, setRoleFilter] = useState<EmployeeRole | null>(null);

	const visibleEmployees = useMemo(() => {
		if (archiveActive) return [];
		const needle = search.toLowerCase();
		return employees.filter((e) => matchesEmployee(e, needle) && (roleFilter == null || e.role === roleFilter));
	}, [employees, search, archiveActive, roleFilter]);

	const allSelected = visibleEmployees.length > 0 && visibleEmployees.every((e) => selected.has(e.id));

	function toggleRow(id: number) {
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
				for (const e of visibleEmployees) next.delete(e.id);
				return next;
			});
		} else {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const e of visibleEmployees) next.add(e.id);
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
				next.set("employee", String(employee.id));
				return next;
			},
			{ replace: true },
		);
	}

	const selectedEmployees = employees.filter((e) => selected.has(e.id));
	const hasNonUserSelected = selectedEmployees.some((e) => e.role !== "user");
	const deleteDisabledReason = hasNonUserSelected
		? "Можно удалить только сотрудников с ролью «Пользователь»"
		: undefined;

	function handleDelete() {
		const ids = selectedEmployees.filter((e) => e.role === "user").map((e) => e.id);
		if (ids.length === 0) {
			clearSelection();
			return;
		}
		deleteMutation.mutate(ids, {
			onSuccess: () => {
				clearSelection();
				toast.success(ids.length === 1 ? "Сотрудник удалён" : "Сотрудники удалены");
			},
			onError: () => toast.error("Не удалось удалить"),
		});
	}

	function handleArchive() {
		const count = selected.size;
		clearSelection();
		toast.success(`Архивировано ${formatRussianPlural(count, ["сотрудник", "сотрудника", "сотрудников"])}`);
	}

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
							className="btn-cta rounded-full border-0"
							onClick={() => setInviteOpen(true)}
						>
							<UserPlus data-icon="inline-start" aria-hidden="true" />
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
							sections={[
								{
									title: "Роль",
									options: ASSIGNABLE_ROLES.map((r) => ({
										value: r,
										label: ROLE_LABELS[r],
										isActive: roleFilter === r,
										onSelect: () => setRoleFilter(roleFilter === r ? null : r),
									})),
								},
							]}
						/>
					}
					archiveActive={archiveActive}
					onToggleArchive={() => setArchiveActive((v) => !v)}
					selectedCount={selected.size}
					onClearSelection={clearSelection}
					bulkForms={["сотрудник", "сотрудника", "сотрудников"]}
					bulkActions={[
						{
							label: "Архивировать",
							icon: <Archive data-icon="inline-start" className="size-3.5" aria-hidden="true" />,
							onClick: handleArchive,
						},
						{
							label: "Удалить",
							icon: <Trash2 data-icon="inline-start" className="size-3.5" aria-hidden="true" />,
							onClick: handleDelete,
							variant: "destructive",
							disabled: Boolean(deleteDisabledReason),
							disabledReason: deleteDisabledReason,
						},
					]}
				/>
				{archiveActive ? (
					<TableEmptyState message="В архиве пусто" />
				) : isMobile ? (
					<div className="flex flex-col gap-2 p-3">
						{visibleEmployees.map((employee) => {
							const isSelected = selected.has(employee.id);
							const fullName = formatFullName(employee.lastName, employee.firstName, employee.patronymic);
							return (
								<article
									key={employee.id}
									data-testid={`employee-card-${employee.id}`}
									className={cn(
										"flex items-start gap-2 rounded-lg border bg-background p-3 touch-manipulation transition-[background-color,border-color,scale] duration-150 ease-out has-[button:active]:scale-[0.99] motion-reduce:has-[button:active]:scale-100",
										isSelected ? "border-primary/60 bg-accent/40" : "hover:bg-muted/50 has-[button:active]:bg-muted/50",
									)}
								>
									<div className="pt-0.5">
										<Checkbox
											checked={isSelected}
											onCheckedChange={() => toggleRow(employee.id)}
											aria-label={`Выбрать ${fullName}`}
										/>
									</div>
									<button type="button" onClick={() => handleRowClick(employee)} className="flex-1 min-w-0 text-left">
										<div className="truncate font-medium">{fullName || "Без имени"}</div>
										{employee.position && (
											<div className="mt-0.5 truncate text-xs text-muted-foreground">{employee.position}</div>
										)}
										<dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
											<dt className="text-xs text-muted-foreground">Почта</dt>
											<dd className="truncate">{employee.email}</dd>
											<dt className="text-xs text-muted-foreground">Роль</dt>
											<dd>{ROLE_LABELS[employee.role]}</dd>
											<dt className="text-xs text-muted-foreground">Регистрация</dt>
											<dd className="tabular-nums">{formatRegistrationDate(employee.registeredAt)}</dd>
										</dl>
									</button>
								</article>
							);
						})}
						{visibleEmployees.length === 0 && <TableEmptyState message="Никого не нашли" />}
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
										disabled={visibleEmployees.length === 0}
									/>
								</th>
								<th className="px-lg py-sm font-medium">ФИО</th>
								<th className="px-lg py-sm font-medium">Почта</th>
								<th className="px-lg py-sm font-medium">Роль</th>
								<th className="px-lg py-sm font-medium tabular-nums text-right">Дата регистрации</th>
							</tr>
						</thead>
						<tbody>
							{visibleEmployees.map((employee) => {
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
							{visibleEmployees.length === 0 && (
								<tr>
									<td colSpan={5} className="px-lg py-10 text-center text-muted-foreground">
										Никого не нашли
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
