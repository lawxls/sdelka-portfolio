import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { InviteEmployeesDrawer } from "@/components/invite-employees-drawer";
import { Button } from "@/components/ui/button";
import type { WorkspaceEmployee } from "@/data/api-client";
import { useWorkspaceEmployees } from "@/data/use-workspace-employees";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short" });

function formatRegistrationDate(registeredAt: string | null | undefined): string {
	if (!registeredAt) return "Приглашение отправлено";
	return dateFormatter.format(new Date(registeredAt));
}

function formatFullName(employee: WorkspaceEmployee): string {
	return `${employee.lastName} ${employee.firstName} ${employee.patronymic}`;
}

export function EmployeesSettingsPage() {
	const [, setSearchParams] = useSearchParams();
	const [inviteOpen, setInviteOpen] = useState(false);
	const { employees } = useWorkspaceEmployees();

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

	return (
		<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-md border-b border-border bg-background px-lg py-sm">
				<h1 className="text-lg tracking-tight whitespace-nowrap">Сотрудники</h1>
				<Button
					type="button"
					size="sm"
					className="bg-status-highlight hover:bg-status-highlight/80"
					onClick={() => setInviteOpen(true)}
				>
					<UserPlus data-icon="inline-start" aria-hidden="true" />
					<span>Отправить приглашения</span>
				</Button>
			</header>

			<main className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/50 overflow-auto">
				<table className="w-full text-sm">
					<thead className="sticky top-0 z-10 bg-background border-b border-border">
						<tr className="text-left text-muted-foreground">
							<th className="px-lg py-sm font-medium">ФИО</th>
							<th className="px-lg py-sm font-medium">Должность</th>
							<th className="px-lg py-sm font-medium">Почта</th>
							<th className="px-lg py-sm font-medium">Компании</th>
							<th className="px-lg py-sm font-medium tabular-nums">Дата регистрации</th>
						</tr>
					</thead>
					<tbody>
						{employees.map((employee) => (
							<tr
								key={employee.id}
								className="border-b border-border bg-background hover:bg-muted/50 cursor-pointer transition-colors"
								onClick={() => handleRowClick(employee)}
							>
								<td className="px-lg py-sm">{formatFullName(employee)}</td>
								<td className="px-lg py-sm text-muted-foreground">{employee.position}</td>
								<td className="px-lg py-sm text-muted-foreground">{employee.email}</td>
								<td className="px-lg py-sm text-muted-foreground">
									{employee.companies.length > 0 ? employee.companies.map((c) => c.name).join(", ") : "\u2014"}
								</td>
								<td className="px-lg py-sm tabular-nums text-muted-foreground">
									{formatRegistrationDate(employee.registeredAt)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</main>

			<InviteEmployeesDrawer open={inviteOpen} onOpenChange={setInviteOpen} />
		</div>
	);
}
