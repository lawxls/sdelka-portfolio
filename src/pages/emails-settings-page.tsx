import { Archive, ArchiveRestore, Power, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AddEmailSheet } from "@/components/add-email-sheet";
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
import {
	useAddEmails,
	useArchiveEmails,
	useDeleteEmails,
	useDisableEmails,
	useEmails,
	useUnarchiveEmails,
} from "@/data/use-emails";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useModuleGuard } from "@/hooks/use-module-guard";
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
	const isMobile = useIsMobile();
	const { emailsCreateOpen, setEmailsCreateOpen } = useSettingsOutletContext();
	const { guard } = useModuleGuard("emails");

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [search, setSearch] = useState("");
	const [searchExpanded, setSearchExpanded] = useState(false);
	const [archiveActive, setArchiveActive] = useState(false);
	const [statusFilter, setStatusFilter] = useState<EmailStatus | null>(null);
	const [typeFilter, setTypeFilter] = useState<EmailType | null>(null);

	const { emails, isLoading } = useEmails({
		archived: archiveActive,
		q: search || undefined,
		status: statusFilter ?? undefined,
		type: typeFilter ?? undefined,
	});
	const addMutation = useAddEmails();
	const deleteMutation = useDeleteEmails();
	const archiveMutation = useArchiveEmails();
	const unarchiveMutation = useUnarchiveEmails();
	const disableMutation = useDisableEmails();

	const allSelected = emails.length > 0 && emails.every((e) => selected.has(e.id));
	const someSelected = selected.size > 0;

	const emailFilterSections = useMemo(
		() => [
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
		],
		[statusFilter, typeFilter],
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
				for (const e of emails) next.delete(e.id);
				return next;
			});
		} else {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const e of emails) next.add(e.id);
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
		const ids = Array.from(selected);
		if (ids.length === 0) return;
		archiveMutation.mutate(ids, {
			onSuccess: () => {
				clearSelection();
				toast.success(`Архивировано ${formatRussianPlural(ids.length, ["почта", "почты", "почт"])}`);
			},
			onError: () => toast.error("Не удалось архивировать"),
		});
	}

	function handleUnarchive() {
		const ids = Array.from(selected);
		if (ids.length === 0) return;
		unarchiveMutation.mutate(ids, {
			onSuccess: () => {
				clearSelection();
				toast.success(`Разархивировано ${formatRussianPlural(ids.length, ["почта", "почты", "почт"])}`);
			},
			onError: () => toast.error("Не удалось разархивировать"),
		});
	}

	function handleAdd(payloads: AddEmailPayload[]) {
		addMutation.mutate(payloads, {
			onSuccess: (created) => {
				setEmailsCreateOpen(false);
				toast.success(
					created.length === 1
						? "Почта добавлена"
						: `Добавлено ${formatRussianPlural(created.length, ["почта", "почты", "почт"])}`,
				);
			},
			onError: () => toast.error("Не удалось добавить"),
		});
	}

	const disableDisabledReason =
		someSelected && !Array.from(selected).some((id) => emails.find((e) => e.id === id)?.status === "active")
			? "Выбранные почты уже отключены"
			: undefined;

	const emptyMessage = search ? "Ничего не нашли" : archiveActive ? "В архиве пусто" : "Пока нет добавленных почт";

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
							className="btn-cta ml-2 rounded-full border-0"
							onClick={guard(() => setEmailsCreateOpen(true))}
						>
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
					filter={<ToolbarFilterPopover ariaLabel="Фильтр почт" tooltip="Фильтры" sections={emailFilterSections} />}
					mobileMore={
						<ToolbarFilterPopover
							ariaLabel="Фильтр почт"
							tooltip="Фильтры"
							triggerVariant="row"
							sections={emailFilterSections}
						/>
					}
					archiveActive={archiveActive}
					onToggleArchive={() => {
						clearSelection();
						setArchiveActive((v) => !v);
					}}
					selectedCount={selected.size}
					onClearSelection={clearSelection}
					bulkForms={["почта", "почты", "почт"]}
					bulkActions={
						archiveActive
							? [
									{
										label: "Разархивировать",
										icon: <ArchiveRestore data-icon="inline-start" className="size-3.5" aria-hidden="true" />,
										onClick: guard(handleUnarchive),
									},
									{
										label: "Удалить",
										icon: <Trash2 data-icon="inline-start" className="size-3.5" aria-hidden="true" />,
										onClick: guard(handleDelete),
										variant: "destructive",
									},
								]
							: [
									{
										label: "Отключить",
										icon: <Power data-icon="inline-start" className="size-3.5" aria-hidden="true" />,
										onClick: guard(handleDisable),
										disabled: Boolean(disableDisabledReason),
										disabledReason: disableDisabledReason,
									},
									{
										label: "Архивировать",
										icon: <Archive data-icon="inline-start" className="size-3.5" aria-hidden="true" />,
										onClick: guard(handleArchive),
									},
									{
										label: "Удалить",
										icon: <Trash2 data-icon="inline-start" className="size-3.5" aria-hidden="true" />,
										onClick: guard(handleDelete),
										variant: "destructive",
									},
								]
					}
				/>
				{isMobile ? (
					<div className="flex flex-col gap-3 p-4">
						{emails.map((email, index) => {
							const isSelected = selected.has(email.id);
							return (
								<article
									key={email.id}
									data-testid={`email-card-${email.id}`}
									className={cn(
										"rounded-lg border bg-background p-4 touch-manipulation transition-[background-color,border-color,scale] duration-150 ease-out",
										isSelected ? "border-primary/60 bg-accent/40" : "hover:bg-muted/50",
										email.status === "disabled" && !isSelected && "opacity-70",
									)}
								>
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<Checkbox
												checked={isSelected}
												onCheckedChange={() => toggleRow(email.id)}
												aria-label={`Выбрать ${email.email}`}
											/>
											<span className="text-xs text-muted-foreground tabular-nums">{index + 1}</span>
										</div>
										<span className="text-xs text-muted-foreground">{EMAIL_TYPE_LABELS[email.type]}</span>
									</div>
									<div className="mt-2 truncate font-medium text-sm">{email.email}</div>
									<dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
										<div>
											<dt className="text-xs text-muted-foreground">Статус</dt>
											<dd>
												<StatusLabel status={email.status} />
											</dd>
										</div>
										<div>
											<dt className="text-xs text-muted-foreground">Отправлено</dt>
											<dd className="tabular-nums">{formatInteger(email.sentCount)}</dd>
										</div>
									</dl>
								</article>
							);
						})}
						{!isLoading && emails.length === 0 && <TableEmptyState message={emptyMessage} />}
					</div>
				) : (
					<table className="w-full text-sm">
						<thead className="sticky top-0 z-10 bg-background border-b border-border">
							<tr className="text-muted-foreground">
								<th className="w-10 px-lg py-sm text-left">
									<Checkbox
										checked={allSelected}
										onCheckedChange={toggleAll}
										aria-label="Выбрать все почты"
										disabled={emails.length === 0}
									/>
								</th>
								<th className="px-lg py-sm font-medium text-left">Почта</th>
								<th className="px-lg py-sm font-medium text-right">Тип</th>
								<th className="px-lg py-sm font-medium text-right">Статус</th>
								<th className="px-lg py-sm font-medium tabular-nums text-right">Писем отправлено</th>
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
							{!isLoading && emails.length === 0 && (
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

			<AddEmailSheet
				open={emailsCreateOpen}
				onOpenChange={setEmailsCreateOpen}
				onSubmit={handleAdd}
				isPending={addMutation.isPending}
			/>
		</>
	);
}
