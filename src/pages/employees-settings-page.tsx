import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { BulkActionsBar } from "@/components/bulk-actions-bar";
import { EmployeeDetailDrawer } from "@/components/employee-detail-drawer";
import { InviteEmployeesDrawer } from "@/components/invite-employees-drawer";
import { useSettingsOutletContext } from "@/components/settings-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { useDeleteWorkspaceEmployees, useWorkspaceEmployees } from "@/data/use-workspace-employees";
import type { WorkspaceEmployee } from "@/data/workspace-mock-data";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short" });

function formatRegistrationDate(registeredAt: string | null | undefined): string {
	if (!registeredAt) return "Приглашение отправлено";
	return dateFormatter.format(new Date(registeredAt));
}

function formatFullName(employee: WorkspaceEmployee): string {
	return [employee.lastName, employee.firstName, employee.patronymic].filter(Boolean).join(" ");
}

export function EmployeesSettingsPage() {
	const [, setSearchParams] = useSearchParams();
	const { employeesInviteOpen: inviteOpen, setEmployeesInviteOpen: setInviteOpen } = useSettingsOutletContext();
	const { employees } = useWorkspaceEmployees();
	const deleteMutation = useDeleteWorkspaceEmployees();

	const [selected, setSelected] = useState<Set<number>>(new Set());

	const allSelected = employees.length > 0 && selected.size === employees.length;

	function toggleRow(id: number) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleAll() {
		setSelected(allSelected ? new Set() : new Set(employees.map((e) => e.id)));
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

	return (
		<>
			<main className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/50 overflow-auto">
				<BulkActionsBar
					count={selected.size}
					onClear={clearSelection}
					forms={["сотрудник", "сотрудника", "сотрудников"]}
					actions={[
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
							<th className="px-lg py-sm font-medium">Компании</th>
							<th className="px-lg py-sm font-medium tabular-nums">Дата регистрации</th>
						</tr>
					</thead>
					<tbody>
						{employees.map((employee) => {
							const isSelected = selected.has(employee.id);
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
											aria-label={`Выбрать ${formatFullName(employee)}`}
										/>
									</td>
									<td className="px-lg py-sm">
										<div className="flex flex-col leading-tight">
											<span className="font-medium text-foreground">{formatFullName(employee)}</span>
											{employee.position && (
												<span className="mt-0.5 text-xs text-muted-foreground">{employee.position}</span>
											)}
										</div>
									</td>
									<td className="px-lg py-sm text-muted-foreground">{employee.email}</td>
									<td className="px-lg py-sm text-muted-foreground">
										{employee.companies.length > 0 ? employee.companies.map((c) => c.name).join(", ") : "\u2014"}
									</td>
									<td className="px-lg py-sm tabular-nums text-muted-foreground">
										{formatRegistrationDate(employee.registeredAt)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</main>

			<InviteEmployeesDrawer open={inviteOpen} onOpenChange={setInviteOpen} />
			<EmployeeDetailDrawer />
		</>
	);
}
