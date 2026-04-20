import { Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AddEmailSheet } from "@/components/add-email-sheet";
import { BulkActionsBar } from "@/components/bulk-actions-bar";
import { useSettingsOutletContext } from "@/components/settings-layout";
import { Checkbox } from "@/components/ui/checkbox";
import type { WorkspaceEmail } from "@/data/emails-mock-data";
import { useAddEmail, useDeleteEmails, useDisableEmails, useEmails } from "@/data/use-emails";
import { formatInteger } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatusLabel({ status }: { status: WorkspaceEmail["status"] }) {
	const isActive = status === "active";
	return (
		<span className={cn("inline-flex items-center gap-1.5", isActive ? "text-foreground" : "text-muted-foreground")}>
			<span
				aria-hidden="true"
				className={cn("size-1.5 rounded-full", isActive ? "bg-primary" : "bg-muted-foreground")}
			/>
			{isActive ? "Активна" : "Отключена"}
		</span>
	);
}

export function EmailsSettingsPage() {
	const { emailsCreateOpen, setEmailsCreateOpen } = useSettingsOutletContext();
	const { emails, isLoading } = useEmails();
	const addMutation = useAddEmail();
	const deleteMutation = useDeleteEmails();
	const disableMutation = useDisableEmails();

	const [selected, setSelected] = useState<Set<string>>(new Set());

	const allSelected = emails.length > 0 && selected.size === emails.length;
	const someSelected = selected.size > 0;

	function toggleRow(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleAll() {
		setSelected(allSelected ? new Set() : new Set(emails.map((e) => e.id)));
	}

	function clearSelection() {
		setSelected(new Set());
	}

	function handleDelete() {
		const ids = Array.from(selected);
		deleteMutation.mutate(ids, {
			onSuccess: () => {
				clearSelection();
				toast.success(ids.length === 1 ? "Почта удалена" : "Почты удалены");
			},
			onError: () => toast.error("Не удалось удалить"),
		});
	}

	function handleDisable() {
		const ids = Array.from(selected).filter((id) => emails.find((e) => e.id === id)?.status === "active");
		if (ids.length === 0) {
			clearSelection();
			return;
		}
		disableMutation.mutate(ids, {
			onSuccess: () => {
				clearSelection();
				toast.success(ids.length === 1 ? "Почта отключена" : "Почты отключены");
			},
			onError: () => toast.error("Не удалось отключить"),
		});
	}

	function handleAdd(email: string) {
		addMutation.mutate(email, {
			onSuccess: () => {
				setEmailsCreateOpen(false);
				toast.success("Почта добавлена");
			},
			onError: () => toast.error("Не удалось добавить"),
		});
	}

	const disableDisabledReason =
		someSelected && !Array.from(selected).some((id) => emails.find((e) => e.id === id)?.status === "active")
			? "Выбранные почты уже отключены"
			: undefined;

	return (
		<>
			<main className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/50 overflow-auto">
				<BulkActionsBar
					count={selected.size}
					onClear={clearSelection}
					forms={["почта", "почты", "почт"]}
					actions={[
						{
							label: "Отключить",
							icon: <Power data-icon="inline-start" className="size-3.5" aria-hidden="true" />,
							onClick: handleDisable,
							disabled: Boolean(disableDisabledReason),
							disabledReason: disableDisabledReason,
						},
						{
							label: "Удалить",
							icon: <Trash2 data-icon="inline-start" className="size-3.5" aria-hidden="true" />,
							onClick: handleDelete,
							variant: "destructive",
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
									aria-label="Выбрать все почты"
									disabled={emails.length === 0}
								/>
							</th>
							<th className="px-lg py-sm font-medium">Почта</th>
							<th className="px-lg py-sm font-medium">Статус</th>
							<th className="px-lg py-sm font-medium tabular-nums">Писем отправлено</th>
						</tr>
					</thead>
					<tbody>
						{emails.map((email) => {
							const isSelected = selected.has(email.id);
							return (
								<tr
									key={email.id}
									className={cn(
										"border-b border-border transition-colors",
										isSelected ? "bg-accent/40" : "bg-background hover:bg-muted/50",
										email.status === "disabled" && !isSelected && "opacity-70",
									)}
								>
									<td className="px-lg py-sm">
										<Checkbox
											checked={isSelected}
											onCheckedChange={() => toggleRow(email.id)}
											aria-label={`Выбрать ${email.email}`}
										/>
									</td>
									<td className="px-lg py-sm font-medium">{email.email}</td>
									<td className="px-lg py-sm">
										<StatusLabel status={email.status} />
									</td>
									<td className="px-lg py-sm tabular-nums text-muted-foreground">{formatInteger(email.sentCount)}</td>
								</tr>
							);
						})}
						{!isLoading && emails.length === 0 && (
							<tr>
								<td colSpan={4} className="px-lg py-10 text-center text-muted-foreground">
									Пока нет добавленных почт
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</main>

			<AddEmailSheet
				open={emailsCreateOpen}
				onOpenChange={setEmailsCreateOpen}
				onSubmit={handleAdd}
				isPending={addMutation.isPending}
			/>
		</>
	);
}
