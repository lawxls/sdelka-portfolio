import { Plus, Search } from "lucide-react";
import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { CompaniesTable } from "@/components/companies-table";
import { CompanyCreationSheet } from "@/components/company-creation-sheet";
import { CompanyDrawer, type CompanyTab, parseCompanyTab } from "@/components/company-drawer";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CreateCompanyPayload } from "@/data/api-client";
import { ApiError } from "@/data/api-error";
import type { CompanySortField, CompanySortState, CompanySummary } from "@/data/types";
import { useCompanies } from "@/data/use-companies";
import { useCreateCompany, useDeleteCompany } from "@/data/use-company-detail";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useMountEffect } from "@/hooks/use-mount-effect";

const SORT_FIELDS = new Set<string>(["name", "employeeCount", "procurementItemCount"]);

function parseSort(params: URLSearchParams): CompanySortState | null {
	const field = params.get("sort");
	const dir = params.get("dir");
	if (!field || !SORT_FIELDS.has(field) || (dir !== "asc" && dir !== "desc")) return null;
	return { field: field as CompanySortField, direction: dir };
}

export function CompaniesPage() {
	const [searchParams, setSearchParams] = useSearchParams();

	const search = searchParams.get("q") ?? "";
	const sort = parseSort(searchParams);
	const companyId = searchParams.get("company");
	const activeTab = parseCompanyTab(searchParams.get("tab"));

	const { companies, hasNextPage, loadMore, isLoading, isFetchingNextPage, error, refetch } = useCompanies({
		search,
		sort,
	});

	const isMobile = useIsMobile();
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const latestQueryRef = useRef(search);
	useMountEffect(() => () => clearTimeout(debounceRef.current));

	const [companyToDelete, setCompanyToDelete] = useState<CompanySummary | null>(null);
	const deleteCompany = useDeleteCompany();

	const [creationOpen, setCreationOpen] = useState(false);
	const createCompanyMutation = useCreateCompany();

	function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value;
		latestQueryRef.current = value;
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					if (value) next.set("q", value);
					else next.delete("q");
					return next;
				},
				{ replace: true },
			);
		}, 300);
	}

	function handleSort(field: CompanySortField) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			const currentField = next.get("sort");
			const currentDir = next.get("dir");
			if (currentField === field) {
				if (currentDir === "asc") {
					next.set("dir", "desc");
				} else {
					next.delete("sort");
					next.delete("dir");
				}
			} else {
				next.set("sort", field);
				next.set("dir", "asc");
			}
			return next;
		});
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
				if (tab === "general") next.delete("tab");
				else next.set("tab", tab);
				return next;
			},
			{ replace: true },
		);
	}

	function handleViewEmployees(company: CompanySummary) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("company", company.id);
				next.set("tab", "employees");
				return next;
			},
			{ replace: true },
		);
	}

	function handleConfirmDelete() {
		if (!companyToDelete) return;
		const id = companyToDelete.id;
		deleteCompany.mutate(id, {
			onSuccess: () => {
				if (companyId === id) handleDrawerClose();
				setCompanyToDelete(null);
			},
			onError: (err) => {
				setCompanyToDelete(null);
				if (err instanceof ApiError && err.status === 409) {
					toast.error("Невозможно удалить компанию с активными закупками");
				} else {
					toast.error("Не удалось удалить компанию");
				}
			},
		});
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

	return (
		<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-md border-b border-border bg-background px-lg py-sm">
				<h1 className="text-lg tracking-tight whitespace-nowrap">Компании</h1>
				<div className="flex flex-1 items-center justify-end gap-2">
					<div className="relative hidden md:block">
						<Search
							className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden="true"
						/>
						<Input
							type="search"
							placeholder="Поиск по названию…"
							defaultValue={latestQueryRef.current}
							onChange={handleSearchInput}
							className="w-48 pl-8 lg:w-64"
							spellCheck={false}
							autoComplete="off"
						/>
					</div>
					<Button
						type="button"
						size="sm"
						className="bg-status-highlight hover:bg-status-highlight/80"
						onClick={() => setCreationOpen(true)}
					>
						<Plus data-icon="inline-start" aria-hidden="true" />
						<span className="hidden sm:inline">Добавить компанию</span>
						<span className="sm:hidden">Добавить</span>
					</Button>
				</div>
			</header>

			<main className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/50">
				<CompaniesTable
					companies={companies}
					sort={sort}
					hasNextPage={hasNextPage}
					loadMore={loadMore}
					onSort={handleSort}
					onRowClick={handleRowClick}
					onViewEmployees={handleViewEmployees}
					onDelete={setCompanyToDelete}
					isLoading={isLoading}
					isFetchingNextPage={isFetchingNextPage}
					error={error}
					onRetry={() => refetch()}
					isMobile={isMobile}
				/>
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

			<AlertDialog open={companyToDelete !== null} onOpenChange={(open) => !open && setCompanyToDelete(null)}>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить компанию?</AlertDialogTitle>
						<AlertDialogDescription>
							Компания «{companyToDelete?.name}» будет удалена. Это действие нельзя отменить.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Отмена</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
							Удалить
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
