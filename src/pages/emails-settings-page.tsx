import { Archive, Plus, Power, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AddEmailSheet } from "@/components/add-email-sheet";
import { includesCI } from "@/components/global-search-matcher";
import { useSettingsOutletContext } from "@/components/settings-layout";
import { SettingsTableToolbar } from "@/components/settings-table-toolbar";
import { TableEmptyState } from "@/components/table-empty-state";
import { ToolbarFilterPopover } from "@/components/toolbar-filter-popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	type AddEmailPayload,
	EMAIL_TYPE_LABELS,
	type EmailStatus,
	type EmailType,
	type WorkspaceEmail,
} from "@/data/emails-mock-data";
import { useAddEmail, useDeleteEmails, useDisableEmails, useEmails } from "@/data/use-emails";
import { formatInteger, formatRussianPlural } from "@/lib/format";
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
	const [search, setSearch] = useState("");
	const [searchExpanded, setSearchExpanded] = useState(false);
	const [archiveActive, setArchiveActive] = useState(false);
	const [statusFilter, setStatusFilter] = useState<EmailStatus | null>(null);
	const [typeFilter, setTypeFilter] = useState<EmailType | null>(null);

	const visibleEmails = useMemo(() => {
		if (archiveActive) return [];
		const needle = search.toLowerCase();
		return emails.filter(
			(e) =>
				(!needle || includesCI(e.email, needle)) &&
				(statusFilter == null || e.status === statusFilter) &&
				(typeFilter == null || e.type === typeFilter),
		);
	}, [emails, search, archiveActive, statusFilter, typeFilter]);

	const allSelected = visibleEmails.length > 0 && visibleEmails.every((e) => selected.has(e.id));
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
		if (allSelected) {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const e of visibleEmails) next.delete(e.id);
				return next;
			});
		} else {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const e of visibleEmails) next.add(e.id);
				return next;
			});
		}
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

	function handleArchive() {
		const count = selected.size;
		clearSelection();
		toast.success(`Архивировано ${formatRussianPlural(count, ["почта", "почты", "почт"])}`);
	}

	function handleAdd(payload: AddEmailPayload) {
		addMutation.mutate(payload, {
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
				<SettingsTableToolbar
					totalCount={emails.length}
					totalForms={["почта", "почты", "почт"]}
					primaryAction={
						<Button
							type="button"
							size="sm"
							className="btn-cta rounded-full border-0"
							onClick={() => setEmailsCreateOpen(true)}
						>
							<Plus data-icon="inline-start" aria-hidden="true" />
							<span>Добавить почту</span>
						</Button>
					}
					search={{
						value: search,
						onChange: setSearch,
						expanded: searchExpanded,
						onExpandedChange: setSearchExpanded,
						ariaLabel: "Поиск почт",
						placeholder: "Адрес почты…",
					}}
					filter={
						<ToolbarFilterPopover
							ariaLabel="Фильтр почт"
							tooltip="Фильтры"
							sections={[
								{
									title: "Статус",
									options: (["active", "disabled"] as const).map((v) => ({
										value: v,
										label: v === "active" ? "Активна" : "Отключена",
										isActive: statusFilter === v,
										onSelect: () => setStatusFilter(statusFilter === v ? null : v),
									})),
								},
								{
									title: "Тип",
									options: (["service", "corporate"] as const).map((v) => ({
										value: v,
										label: EMAIL_TYPE_LABELS[v],
										isActive: typeFilter === v,
										onSelect: () => setTypeFilter(typeFilter === v ? null : v),
									})),
								},
							]}
						/>
					}
					archiveActive={archiveActive}
					onToggleArchive={() => setArchiveActive((v) => !v)}
					selectedCount={selected.size}
					onClearSelection={clearSelection}
					bulkForms={["почта", "почты", "почт"]}
					bulkActions={[
						{
							label: "Отключить",
							icon: <Power data-icon="inline-start" className="size-3.5" aria-hidden="true" />,
							onClick: handleDisable,
							disabled: Boolean(disableDisabledReason),
							disabledReason: disableDisabledReason,
						},
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
						},
					]}
				/>
				{archiveActive ? (
					<TableEmptyState message="В архиве пусто" />
				) : (
					<table className="w-full text-sm">
						<thead className="sticky top-0 z-10 bg-background border-b border-border">
							<tr className="text-muted-foreground">
								<th className="w-10 px-lg py-sm text-left">
									<Checkbox
										checked={allSelected}
										onCheckedChange={toggleAll}
										aria-label="Выбрать все почты"
										disabled={visibleEmails.length === 0}
									/>
								</th>
								<th className="px-lg py-sm font-medium text-left">Почта</th>
								<th className="px-lg py-sm font-medium text-right">Тип</th>
								<th className="px-lg py-sm font-medium text-right">Статус</th>
								<th className="px-lg py-sm font-medium tabular-nums text-right">Писем отправлено</th>
							</tr>
						</thead>
						<tbody>
							{visibleEmails.map((email) => {
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
										<td className="px-lg py-sm text-right text-muted-foreground">{EMAIL_TYPE_LABELS[email.type]}</td>
										<td className="px-lg py-sm text-right">
											<StatusLabel status={email.status} />
										</td>
										<td className="px-lg py-sm tabular-nums text-right text-muted-foreground">
											{formatInteger(email.sentCount)}
										</td>
									</tr>
								);
							})}
							{!isLoading && visibleEmails.length === 0 && (
								<tr>
									<td colSpan={5} className="px-lg py-10 text-center text-muted-foreground">
										{search ? "Ничего не нашли" : "Пока нет добавленных почт"}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				)}
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
