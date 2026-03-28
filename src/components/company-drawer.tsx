import { LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { CreateAddressData, UpdateCompanyData } from "@/data/api-client";
import type { Address, AddressType, Company } from "@/data/types";
import { ADDRESS_TYPE_LABELS } from "@/data/types";
import {
	useCompanyDetail,
	useCreateAddress,
	useDeleteAddress,
	useUpdateAddress,
	useUpdateCompany,
} from "@/data/use-company-detail";

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
				{activeTab === "addresses" && <AddressesTab company={company} companyId={companyId} />}
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

// --- Addresses Tab ---

const ADDRESS_TYPES: AddressType[] = ["office", "warehouse", "production"];

const EMPTY_ADDRESS_FORM: AddressFormState = {
	name: "",
	type: "office",
	postalCode: "",
	address: "",
	city: "",
	region: "",
	contactPerson: "",
	phone: "",
};

interface AddressFormState {
	name: string;
	type: AddressType;
	postalCode: string;
	address: string;
	city: string;
	region: string;
	contactPerson: string;
	phone: string;
}

function AddressesTab({ company, companyId }: { company: Company; companyId: string }) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);
	const isLastAddress = company.addresses.length <= 1;

	const createMutation = useCreateAddress(companyId);
	const updateMutation = useUpdateAddress(companyId);
	const deleteMutation = useDeleteAddress(companyId);

	function handleCreate(data: AddressFormState) {
		createMutation.mutate(data as CreateAddressData, {
			onSuccess: () => setShowAddForm(false),
		});
	}

	function handleUpdate(addressId: string, original: Address, form: AddressFormState) {
		const changed: Record<string, string> = {};
		for (const key of Object.keys(form) as (keyof AddressFormState)[]) {
			if (form[key] !== original[key]) changed[key] = form[key];
		}
		if (Object.keys(changed).length === 0) {
			setEditingId(null);
			return;
		}
		updateMutation.mutate({ addressId, data: changed }, { onSuccess: () => setEditingId(null) });
	}

	function handleDelete(addressId: string) {
		deleteMutation.mutate(addressId);
	}

	return (
		<div className="flex flex-col gap-4 py-4" data-testid="tab-content-addresses">
			{company.addresses.map((addr) => (
				<AddressCard
					key={addr.id}
					address={addr}
					isEditing={editingId === addr.id}
					canDelete={!isLastAddress}
					onEdit={() => setEditingId(addr.id)}
					onCancel={() => setEditingId(null)}
					onSave={(form) => handleUpdate(addr.id, addr, form)}
					onDelete={() => handleDelete(addr.id)}
				/>
			))}

			{showAddForm ? (
				<AddressForm
					testId="address-add-form"
					initial={EMPTY_ADDRESS_FORM}
					onSave={handleCreate}
					onCancel={() => setShowAddForm(false)}
					isPending={createMutation.isPending}
				/>
			) : (
				<Button type="button" variant="outline" className="w-full" onClick={() => setShowAddForm(true)}>
					<Plus className="size-4" aria-hidden="true" />
					Добавить адрес
				</Button>
			)}
		</div>
	);
}

function AddressCard({
	address,
	isEditing,
	canDelete,
	onEdit,
	onCancel,
	onSave,
	onDelete,
}: {
	address: Address;
	isEditing: boolean;
	canDelete: boolean;
	onEdit: () => void;
	onCancel: () => void;
	onSave: (form: AddressFormState) => void;
	onDelete: () => void;
}) {
	if (isEditing) {
		return (
			<div data-testid={`address-${address.id}`} className="rounded-lg border border-border p-3">
				<AddressForm
					initial={{
						name: address.name,
						type: address.type,
						postalCode: address.postalCode,
						address: address.address,
						city: address.city,
						region: address.region,
						contactPerson: address.contactPerson,
						phone: address.phone,
					}}
					onSave={onSave}
					onCancel={onCancel}
					isPending={false}
				/>
			</div>
		);
	}

	return (
		<div data-testid={`address-${address.id}`} className="rounded-lg border border-border p-3">
			<div className="flex items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium">{address.name}</span>
						<Badge variant="secondary">{ADDRESS_TYPE_LABELS[address.type]}</Badge>
					</div>
					<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
						<ViewField label="Индекс" value={address.postalCode} />
						<ViewField label="Адрес" value={address.address} />
						<ViewField label="Населенный пункт" value={address.city} />
						<ViewField label="Регион" value={address.region} />
						<ViewField label="Контактное лицо" value={address.contactPerson} />
						<ViewField label="Телефон" value={address.phone} />
					</div>
				</div>
				<div className="flex gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-7"
						onClick={onEdit}
						aria-label="Редактировать"
					>
						<Pencil className="size-3.5" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-7 text-destructive hover:text-destructive"
						onClick={onDelete}
						disabled={!canDelete}
						aria-label="Удалить"
					>
						<Trash2 className="size-3.5" />
					</Button>
				</div>
			</div>
		</div>
	);
}

function ViewField({ label, value }: { label: string; value: string }) {
	if (!value) return null;
	return (
		<div>
			<span className="text-muted-foreground/70">{label}: </span>
			<span>{value}</span>
		</div>
	);
}

function AddressForm({
	testId,
	initial,
	onSave,
	onCancel,
	isPending,
}: {
	testId?: string;
	initial: AddressFormState;
	onSave: (form: AddressFormState) => void;
	onCancel: () => void;
	isPending: boolean;
}) {
	const [form, setForm] = useState<AddressFormState>(initial);

	function update(field: keyof AddressFormState, value: string) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	const canSave = form.name.trim() !== "";

	return (
		<div className="flex flex-col gap-3" data-testid={testId}>
			<FieldRow label="Название">
				<Input
					value={form.name}
					onChange={(e) => update("name", e.target.value)}
					aria-label="Название"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Тип">
				<Select value={form.type} onValueChange={(v) => update("type", v)}>
					<SelectTrigger aria-label="Тип">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ADDRESS_TYPES.map((t) => (
							<SelectItem key={t} value={t}>
								{ADDRESS_TYPE_LABELS[t]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FieldRow>
			<FieldRow label="Индекс">
				<Input
					value={form.postalCode}
					onChange={(e) => update("postalCode", e.target.value)}
					aria-label="Индекс"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Адрес">
				<Input
					value={form.address}
					onChange={(e) => update("address", e.target.value)}
					aria-label="Адрес"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Населенный пункт">
				<Input
					value={form.city}
					onChange={(e) => update("city", e.target.value)}
					aria-label="Населенный пункт"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Регион">
				<Input
					value={form.region}
					onChange={(e) => update("region", e.target.value)}
					aria-label="Регион"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Контактное лицо">
				<Input
					value={form.contactPerson}
					onChange={(e) => update("contactPerson", e.target.value)}
					aria-label="Контактное лицо"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Телефон">
				<Input
					value={form.phone}
					onChange={(e) => update("phone", e.target.value)}
					aria-label="Телефон"
					spellCheck={false}
					autoComplete="off"
					inputMode="tel"
				/>
			</FieldRow>
			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Отмена
				</Button>
				<Button type="button" disabled={!canSave || isPending} onClick={() => onSave(form)}>
					{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
					Сохранить
				</Button>
			</div>
		</div>
	);
}
