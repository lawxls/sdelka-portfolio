import { Archive, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { CompanyCreationSheet } from "@/components/company-creation-sheet";
import { CompanyDrawer, type CompanyTab, parseCompanyTab } from "@/components/company-drawer";
import { includesCI } from "@/components/global-search-matcher";
import { useSettingsOutletContext } from "@/components/settings-layout";
import { SettingsTableToolbar } from "@/components/settings-table-toolbar";
import { TableEmptyState } from "@/components/table-empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { CompanySummary, CreateCompanyPayload } from "@/data/domains/companies";
import { useCompanies } from "@/data/use-companies";
import { useCreateCompany, useDeleteCompany } from "@/data/use-company-detail";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatRussianPlural } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CompaniesSettingsPage() {
	const isMobile = useIsMobile();
	const [searchParams, setSearchParams] = useSearchParams();
	const { companiesCreateOpen: creationOpen, setCompaniesCreateOpen: setCreationOpen } = useSettingsOutletContext();

	const companyId = searchParams.get("company");
	const activeTab = parseCompanyTab(searchParams.get("tab"));

	const { companies, hasNextPage, loadMore, isFetchingNextPage } = useCompanies({ search: "", sort: null });

	if (hasNextPage && !isFetchingNextPage) {
		loadMore();
	}
	const createCompanyMutation = useCreateCompany();
	const deleteCompanyMutation = useDeleteCompany();

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [search, setSearch] = useState("");
	const [searchExpanded, setSearchExpanded] = useState(false);
	const [archiveActive, setArchiveActive] = useState(false);

	const visibleCompanies = useMemo(() => {
		if (archiveActive) return [];
		const needle = search.toLowerCase();
		return companies.filter((c) => !needle || includesCI(c.name, needle));
	}, [companies, search, archiveActive]);

	const allSelected = visibleCompanies.length > 0 && visibleCompanies.every((c) => selected.has(c.id));

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
				for (const c of visibleCompanies) next.delete(c.id);
				return next;
			});
		} else {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const c of visibleCompanies) next.add(c.id);
				return next;
			});
		}
	}

	function clearSelection() {
		setSelected(new Set());
	}

	function handleRowClick(company: CompanySummary) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("company", company.id);
				next.delete("tab");
				return next;
			},
			{ replace: true },
		);
	}

	function handleDrawerClose() {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete("company");
				next.delete("tab");
				return next;
			},
			{ replace: true },
		);
	}

	function handleTabChange(tab: CompanyTab) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("tab", tab);
				return next;
			},
			{ replace: true },
		);
	}

	function handleCreateCompany(data: CreateCompanyPayload) {
		createCompanyMutation.mutate(data, {
			onSuccess: () => setCreationOpen(false),
			onError: () => toast.error("Не удалось создать компанию"),
		});
	}

	const deleteDisabledReason =
		companies.length > 0 && selected.size >= companies.length ? "Нельзя удалить единственную компанию" : undefined;

	async function handleDelete() {
		const ids = Array.from(selected);
		if (ids.length === 0) return;
		try {
			await Promise.all(ids.map((id) => deleteCompanyMutation.mutateAsync(id)));
			clearSelection();
			toast.success(ids.length === 1 ? "Компания удалена" : "Компании удалены");
		} catch {
			toast.error("Не удалось удалить");
		}
	}

	function handleArchive() {
		const count = selected.size;
		clearSelection();
		toast.success(`Архивировано ${formatRussianPlural(count, ["компания", "компании", "компаний"])}`);
	}

	return (
		<>
			<main className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/50 overflow-auto">
				<SettingsTableToolbar
					totalCount={companies.length}
					totalForms={["компания", "компании", "компаний"]}
					primaryAction={
						<Button
							type="button"
							size="sm"
							className="btn-cta rounded-full border-0"
							onClick={() => setCreationOpen(true)}
						>
							<Plus data-icon="inline-start" aria-hidden="true" />
							<span>Добавить компанию</span>
						</Button>
					}
					search={{
						value: search,
						onChange: setSearch,
						expanded: searchExpanded,
						onExpandedChange: setSearchExpanded,
						ariaLabel: "Поиск компаний",
						placeholder: "Название компании…",
					}}
					archiveActive={archiveActive}
					onToggleArchive={() => setArchiveActive((v) => !v)}
					selectedCount={selected.size}
					onClearSelection={clearSelection}
					bulkForms={["компания", "компании", "компаний"]}
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
						{visibleCompanies.map((company) => {
							const isSelected = selected.has(company.id);
							return (
								<article
									key={company.id}
									data-testid={`company-card-${company.id}`}
									className={cn(
										"flex items-start gap-2 rounded-lg border bg-background p-3 touch-manipulation transition-[background-color,border-color,scale] duration-150 ease-out has-[button:active]:scale-[0.99] motion-reduce:has-[button:active]:scale-100",
										isSelected ? "border-primary/60 bg-accent/40" : "hover:bg-muted/50 has-[button:active]:bg-muted/50",
									)}
								>
									<div className="pt-0.5">
										<Checkbox
											checked={isSelected}
											onCheckedChange={() => toggleRow(company.id)}
											aria-label={`Выбрать ${company.name}`}
										/>
									</div>
									<button type="button" onClick={() => handleRowClick(company)} className="flex-1 min-w-0 text-left">
										<div className="truncate font-medium">{company.name}</div>
										<dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
											<dt className="text-xs text-muted-foreground">Адреса</dt>
											<dd className="tabular-nums">{company.addresses.length}</dd>
											<dt className="text-xs text-muted-foreground">Сотрудники</dt>
											<dd className="tabular-nums">{company.employeeCount}</dd>
											<dt className="text-xs text-muted-foreground">Закупки</dt>
											<dd className="tabular-nums">{company.procurementItemCount}</dd>
										</dl>
									</button>
								</article>
							);
						})}
						{visibleCompanies.length === 0 && <TableEmptyState message="Ничего не нашли" />}
					</div>
				) : (
					<table className="w-full text-sm">
						<thead className="sticky top-0 z-10 bg-background border-b border-border">
							<tr className="text-left text-muted-foreground">
								<th className="w-10 px-lg py-sm">
									<Checkbox
										checked={allSelected}
										onCheckedChange={toggleAll}
										aria-label="Выбрать все компании"
										disabled={visibleCompanies.length === 0}
									/>
								</th>
								<th className="px-lg py-sm font-medium">Название компании</th>
								<th className="px-lg py-sm font-medium tabular-nums">Адреса</th>
								<th className="px-lg py-sm font-medium tabular-nums">Сотрудники</th>
								<th className="px-lg py-sm font-medium tabular-nums">Закупки</th>
							</tr>
						</thead>
						<tbody>
							{visibleCompanies.map((company) => {
								const isSelected = selected.has(company.id);
								return (
									<tr
										key={company.id}
										className={cn(
											"border-b border-border cursor-pointer transition-colors",
											isSelected ? "bg-accent/40" : "bg-background hover:bg-muted/50",
										)}
										onClick={() => handleRowClick(company)}
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
												onCheckedChange={() => toggleRow(company.id)}
												aria-label={`Выбрать ${company.name}`}
											/>
										</td>
										<td className="px-lg py-sm font-medium">{company.name}</td>
										<td className="px-lg py-sm tabular-nums text-muted-foreground">{company.addresses.length}</td>
										<td className="px-lg py-sm tabular-nums text-muted-foreground">{company.employeeCount}</td>
										<td className="px-lg py-sm tabular-nums text-muted-foreground">{company.procurementItemCount}</td>
									</tr>
								);
							})}
							{visibleCompanies.length === 0 && (
								<tr>
									<td colSpan={5} className="px-lg py-10 text-center text-muted-foreground">
										Ничего не нашли
									</td>
								</tr>
							)}
						</tbody>
					</table>
				)}
			</main>

			<CompanyDrawer
				companyId={companyId}
				activeTab={activeTab}
				onClose={handleDrawerClose}
				onTabChange={handleTabChange}
			/>

			<CompanyCreationSheet
				open={creationOpen}
				onOpenChange={(open) => {
					setCreationOpen(open);
					if (!open) createCompanyMutation.reset();
				}}
				onSubmit={handleCreateCompany}
				isPending={createCompanyMutation.isPending}
			/>
		</>
	);
}
