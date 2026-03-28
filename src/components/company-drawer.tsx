import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { UpdateCompanyData } from "@/data/api-client";
import type { Company } from "@/data/types";
import { useCompanyDetail, useUpdateCompany } from "@/data/use-company-detail";

export type CompanyTab = "general" | "addresses" | "employees";

const TABS: { key: CompanyTab; label: string }[] = [
	{ key: "general", label: "Общее" },
	{ key: "addresses", label: "Адреса" },
	{ key: "employees", label: "Сотрудники" },
];

const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

export function parseCompanyTab(param: string | null): CompanyTab {
	if (param && VALID_TABS.has(param)) return param as CompanyTab;
	return "general";
}

interface CompanyDrawerProps {
	companyId: string | null;
	activeTab: CompanyTab;
	onClose: () => void;
	onTabChange: (tab: CompanyTab) => void;
}

export function CompanyDrawer({ companyId, activeTab, onClose, onTabChange }: CompanyDrawerProps) {
	const open = companyId != null;

	return (
		<Sheet
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) onClose();
			}}
		>
			<SheetContent className="flex flex-col max-md:!w-full max-md:!max-w-full max-md:!inset-0 max-md:!rounded-none">
				{companyId && (
					<CompanyDrawerContent key={companyId} companyId={companyId} activeTab={activeTab} onTabChange={onTabChange} />
				)}
			</SheetContent>
		</Sheet>
	);
}

function CompanyDrawerContent({
	companyId,
	activeTab,
	onTabChange,
}: {
	companyId: string;
	activeTab: CompanyTab;
	onTabChange: (tab: CompanyTab) => void;
}) {
	const { data: company, isLoading, error } = useCompanyDetail(companyId);

	if (isLoading) {
		return (
			<div className="flex flex-1 items-center justify-center" data-testid="drawer-loading">
				<LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-label="Загрузка…" />
			</div>
		);
	}

	if (error || !company) {
		return (
			<div
				className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground"
				data-testid="drawer-error"
			>
				<p className="text-sm">Не удалось загрузить компанию</p>
			</div>
		);
	}

	return (
		<>
			<SheetHeader>
				<SheetTitle data-testid="drawer-title">{company.name}</SheetTitle>
				<SheetDescription className="sr-only">Детали компании</SheetDescription>
			</SheetHeader>

			<div className="flex gap-0 border-b border-border px-4" role="tablist">
				{TABS.map((tab) => (
					<button
						key={tab.key}
						type="button"
						role="tab"
						aria-selected={activeTab === tab.key}
						className={`px-3 py-2 text-sm font-medium transition-colors ${
							activeTab === tab.key
								? "border-b-2 border-primary text-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
						onClick={() => onTabChange(tab.key)}
						data-testid={`tab-${tab.key}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div className="flex-1 overflow-y-auto px-4">
				{activeTab === "general" && <GeneralTab key={companyId} company={company} companyId={companyId} />}
				{activeTab === "addresses" && (
					<div data-testid="tab-content-addresses" className="flex items-center justify-center py-8">
						<p className="text-sm text-muted-foreground">Адреса (в разработке)</p>
					</div>
				)}
				{activeTab === "employees" && (
					<div data-testid="tab-content-employees" className="flex items-center justify-center py-8">
						<p className="text-sm text-muted-foreground">Сотрудники (в разработке)</p>
					</div>
				)}
			</div>
		</>
	);
}

type FormKey =
	| "name"
	| "industry"
	| "website"
	| "description"
	| "preferredPayment"
	| "preferredDelivery"
	| "additionalComments";
const FORM_KEYS: FormKey[] = [
	"name",
	"industry",
	"website",
	"description",
	"preferredPayment",
	"preferredDelivery",
	"additionalComments",
];

function GeneralTab({ company, companyId }: { company: Company; companyId: string }) {
	const [form, setForm] = useState<Record<FormKey, string>>(() => ({
		name: company.name,
		industry: company.industry,
		website: company.website,
		description: company.description,
		preferredPayment: company.preferredPayment,
		preferredDelivery: company.preferredDelivery,
		additionalComments: company.additionalComments,
	}));

	const updateMutation = useUpdateCompany(companyId);

	const isDirty = FORM_KEYS.some((k) => form[k] !== company[k]);
	const canSave = isDirty && form.name.trim() !== "";

	function update(field: FormKey, value: string) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	function handleSave() {
		const data: UpdateCompanyData = {};
		for (const key of FORM_KEYS) {
			if (form[key] !== company[key]) {
				data[key] = form[key];
			}
		}
		updateMutation.mutate(data);
	}

	return (
		<div className="flex flex-col gap-4 py-4" data-testid="tab-content-general">
			<div className="flex flex-col gap-3">
				<h3 className="text-sm font-medium text-muted-foreground">Основная информация</h3>
				<FieldRow label="Название">
					<Input
						value={form.name}
						onChange={(e) => update("name", e.target.value)}
						aria-label="Название"
						spellCheck={false}
						autoComplete="off"
					/>
				</FieldRow>
				<FieldRow label="Отрасль">
					<Input
						value={form.industry}
						onChange={(e) => update("industry", e.target.value)}
						aria-label="Отрасль"
						spellCheck={false}
						autoComplete="off"
					/>
				</FieldRow>
				<FieldRow label="Сайт">
					<Input
						value={form.website}
						onChange={(e) => update("website", e.target.value)}
						aria-label="Сайт"
						spellCheck={false}
						autoComplete="off"
					/>
				</FieldRow>
				<FieldRow label="Описание">
					<Textarea
						value={form.description}
						onChange={(e) => update("description", e.target.value)}
						aria-label="Описание"
						rows={3}
					/>
				</FieldRow>
			</div>

			<Separator />

			<div className="flex flex-col gap-3">
				<h3 className="text-sm font-medium text-muted-foreground">Комментарии агента</h3>
				<FieldRow label="Предпочтительная оплата">
					<Input
						value={form.preferredPayment}
						onChange={(e) => update("preferredPayment", e.target.value)}
						aria-label="Предпочтительная оплата"
						spellCheck={false}
						autoComplete="off"
					/>
				</FieldRow>
				<FieldRow label="Предпочтительная доставка">
					<Input
						value={form.preferredDelivery}
						onChange={(e) => update("preferredDelivery", e.target.value)}
						aria-label="Предпочтительная доставка"
						spellCheck={false}
						autoComplete="off"
					/>
				</FieldRow>
				<FieldRow label="Дополнительные комментарии">
					<Textarea
						value={form.additionalComments}
						onChange={(e) => update("additionalComments", e.target.value)}
						aria-label="Дополнительные комментарии"
						rows={3}
					/>
				</FieldRow>
			</div>

			<div className="sticky bottom-0 flex justify-end border-t border-border bg-popover py-3">
				<Button type="button" disabled={!canSave || updateMutation.isPending} onClick={handleSave}>
					{updateMutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
					Сохранить
				</Button>
			</div>
		</div>
	);
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-xs text-muted-foreground">{label}</span>
			{children}
		</div>
	);
}
