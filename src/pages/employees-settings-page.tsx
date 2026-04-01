import { Plus } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { EmployeeDetailDrawer } from "@/components/employee-detail-drawer";
import { InviteEmployeesDrawer } from "@/components/invite-employees-drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspaceEmployees } from "@/data/use-workspace";
import type { WorkspaceEmployee } from "@/data/workspace-types";
import { formatAssigneeName } from "@/lib/format";

const SKELETON_KEYS = ["sk-name", "sk-position", "sk-email", "sk-companies", "sk-date"] as const;

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
});

function formatRegisteredAt(registeredAt: string | null): string {
	if (registeredAt === null) return "Приглашение отправлено";
	return dateFormatter.format(new Date(registeredAt));
}

export function EmployeesSettingsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [inviteOpen, setInviteOpen] = useState(false);

	const { data, isLoading } = useWorkspaceEmployees();
	const employees = data?.employees ?? [];

	const employeeId = searchParams.get("employee");
	const activeEmployee = employeeId ? (employees.find((e) => String(e.id) === employeeId) ?? null) : null;

	function handleRowClick(emp: WorkspaceEmployee) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("employee", String(emp.id));
				return next;
			},
			{ replace: true },
		);
	}

	function handleDrawerClose() {
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
		<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 py-2">
				<h1 className="text-lg font-semibold tracking-tight">Сотрудники</h1>
				<Button size="sm" onClick={() => setInviteOpen(true)}>
					<Plus className="size-4" aria-hidden="true" />
					Отправить приглашения
				</Button>
			</header>

			<div className="flex-1 overflow-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>ФИО</TableHead>
							<TableHead>Должность</TableHead>
							<TableHead>Почта</TableHead>
							<TableHead>Компании</TableHead>
							<TableHead>Дата регистрации</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading
							? SKELETON_KEYS.map((key) => (
									<TableRow key={key}>
										{SKELETON_KEYS.map((col) => (
											<TableCell key={col}>
												<Skeleton className="h-4 w-full" />
											</TableCell>
										))}
									</TableRow>
								))
							: employees.map((emp) => (
									<TableRow
										key={emp.id}
										className="cursor-pointer hover:bg-muted/50"
										onClick={() => handleRowClick(emp)}
									>
										<TableCell className="font-medium">{formatAssigneeName(emp)}</TableCell>
										<TableCell>{emp.position}</TableCell>
										<TableCell>{emp.email}</TableCell>
										<TableCell>{emp.companies.map((c) => c.name).join(", ") || "—"}</TableCell>
										<TableCell>{formatRegisteredAt(emp.registeredAt)}</TableCell>
									</TableRow>
								))}
					</TableBody>
				</Table>
			</div>

			<EmployeeDetailDrawer employee={activeEmployee} onClose={handleDrawerClose} />

			<InviteEmployeesDrawer open={inviteOpen} onOpenChange={setInviteOpen} />
		</div>
	);
}
