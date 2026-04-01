import { Plus } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { CompanyCreationSheet } from "@/components/company-creation-sheet";
import { CompanyDrawer, type CompanyTab, parseCompanyTab } from "@/components/company-drawer";
import { Button } from "@/components/ui/button";
import type { CreateCompanyPayload } from "@/data/api-client";
import type { CompanySummary } from "@/data/types";
import { useCompanies } from "@/data/use-companies";
import { useCreateCompany } from "@/data/use-company-detail";

export function CompaniesSettingsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [creationOpen, setCreationOpen] = useState(false);

	const companyId = searchParams.get("company");
	const activeTab = parseCompanyTab(searchParams.get("tab"));

	const { companies } = useCompanies({ search: "", sort: null });
	const createCompanyMutation = useCreateCompany();

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
				if (tab === "general") next.delete("tab");
				else next.set("tab", tab);
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

	return (
		<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-md border-b border-border bg-background px-lg py-sm">
				<h1 className="text-lg tracking-tight whitespace-nowrap">Компании</h1>
				<Button
					type="button"
					size="sm"
					className="bg-status-highlight hover:bg-status-highlight/80"
					onClick={() => setCreationOpen(true)}
				>
					<Plus data-icon="inline-start" aria-hidden="true" />
					<span>Добавить компанию</span>
				</Button>
			</header>

			<main className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/50 overflow-auto">
				<table className="w-full text-sm">
					<thead className="sticky top-0 z-10 bg-background border-b border-border">
						<tr className="text-left text-muted-foreground">
							<th className="px-lg py-sm font-medium">Название компании</th>
							<th className="px-lg py-sm font-medium tabular-nums">Адреса</th>
							<th className="px-lg py-sm font-medium tabular-nums">Сотрудники</th>
							<th className="px-lg py-sm font-medium tabular-nums">Закупки</th>
						</tr>
					</thead>
					<tbody>
						{companies.map((company) => (
							<tr
								key={company.id}
								className="border-b border-border bg-background hover:bg-muted/50 cursor-pointer transition-colors"
								onClick={() => handleRowClick(company)}
							>
								<td className="px-lg py-sm">{company.name}</td>
								<td className="px-lg py-sm tabular-nums text-muted-foreground">{company.addresses.length}</td>
								<td className="px-lg py-sm tabular-nums text-muted-foreground">{company.employeeCount}</td>
								<td className="px-lg py-sm tabular-nums text-muted-foreground">{company.procurementItemCount}</td>
							</tr>
						))}
					</tbody>
				</table>
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
		</div>
	);
}
