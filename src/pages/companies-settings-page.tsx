import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { CompaniesTable } from "@/components/companies-table";
import { CompanyCreationSheet } from "@/components/company-creation-sheet";
import { CompanyDrawer, type CompanyTab, parseCompanyTab } from "@/components/company-drawer";
import { Button } from "@/components/ui/button";
import type { CreateCompanyPayload } from "@/data/api-client";
import type { CompanySummary } from "@/data/types";
import { useCompanies } from "@/data/use-companies";
import { useCreateCompany } from "@/data/use-company-detail";

export function CompaniesSettingsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();

	const companyId = searchParams.get("company");
	const activeTab = parseCompanyTab(searchParams.get("tab"));

	const { companies, isLoading, error, refetch } = useCompanies({ search: "", sort: null });

	const [creationOpen, setCreationOpen] = useState(false);
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
			onSuccess: () => {
				setCreationOpen(false);
			},
			onError: () => {
				toast.error("Не удалось создать компанию");
			},
		});
	}

	function handleViewProcurement(company: CompanySummary) {
		navigate(`/procurement?company=${company.id}`);
	}

	return (
		<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 py-2">
				<h1 className="text-lg font-semibold tracking-tight">Компании</h1>
				<Button size="sm" onClick={() => setCreationOpen(true)}>
					<Plus className="size-4" aria-hidden="true" />
					Добавить компанию
				</Button>
			</header>

			<div className="flex-1 overflow-auto">
				<CompaniesTable
					companies={companies}
					isLoading={isLoading}
					error={error}
					sort={null}
					hasNextPage={false}
					loadMore={() => {}}
					onSort={() => {}}
					onRowClick={handleRowClick}
					onViewProcurement={handleViewProcurement}
					onRetry={refetch}
				/>
			</div>

			<CompanyDrawer
				companyId={companyId}
				activeTab={activeTab}
				onClose={handleDrawerClose}
				onTabChange={handleTabChange}
			/>

			<CompanyCreationSheet
				open={creationOpen}
				onOpenChange={setCreationOpen}
				onSubmit={handleCreateCompany}
				isPending={createCompanyMutation.isPending}
			/>
		</div>
	);
}
