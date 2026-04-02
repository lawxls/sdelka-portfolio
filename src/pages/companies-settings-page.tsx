import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { CompanyCreationSheet } from "@/components/company-creation-sheet";
import { CompanyDrawer, type CompanyTab, parseCompanyTab } from "@/components/company-drawer";
import { useSettingsOutletContext } from "@/components/settings-layout";
import type { CreateCompanyPayload } from "@/data/api-client";
import type { CompanySummary } from "@/data/types";
import { useCompanies } from "@/data/use-companies";
import { useCreateCompany } from "@/data/use-company-detail";

export function CompaniesSettingsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const { companiesCreateOpen: creationOpen, setCompaniesCreateOpen: setCreationOpen } = useSettingsOutletContext();

	const companyId = searchParams.get("company");
	const activeTab = parseCompanyTab(searchParams.get("tab"));

	const { companies, hasNextPage, loadMore, isFetchingNextPage } = useCompanies({ search: "", sort: null });

	if (hasNextPage && !isFetchingNextPage) {
		loadMore();
	}
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

	return (
		<>
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
		</>
	);
}
