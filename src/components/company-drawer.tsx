import type { LucideIcon } from "lucide-react";
import {
	Building2,
	ChevronDown,
	ChevronUp,
	Layers,
	LayoutDashboard,
	ListTodo,
	LoaderCircle,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ViewField } from "@/components/view-field";
import type {
	CreateAddressData,
	CreateEmployeeData,
	UpdateCompanyData,
	UpdateEmployeeData,
	UpdatePermissionsData,
} from "@/data/companies-mock-data";
import type {
	Address,
	AddressType,
	Company,
	Employee,
	EmployeePermissions,
	EmployeeRole,
	PermissionLevel,
} from "@/data/types";
import { ADDRESS_TYPE_LABELS, ADDRESS_TYPES, ASSIGNABLE_ROLES, PRIVILEGED_ROLES, ROLE_LABELS } from "@/data/types";
import {
	useCompanyDetail,
	useCreateAddress,
	useCreateEmployee,
	useDeleteAddress,
	useDeleteEmployee,
	useUpdateAddress,
	useUpdateCompany,
	useUpdateEmployee,
	useUpdateEmployeePermissions,
} from "@/data/use-company-detail";
import { useMe } from "@/data/use-me";

export type CompanyTab = "general" | "addresses" | "employees";

const TABS: { key: CompanyTab; label: string }[] = [
	{ key: "employees", label: "Сотрудники" },
	{ key: "addresses", label: "Адреса" },
	{ key: "general", label: "Информация" },
];

const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

export function parseCompanyTab(param: string | null): CompanyTab {
	if (param && VALID_TABS.has(param)) return param as CompanyTab;
	return "employees";
}

interface CompanyDrawerProps {
	companyId: string | null;
	activeTab: CompanyTab;
	initialAddEmployee?: boolean;
	onClose: () => void;
	onTabChange: (tab: CompanyTab) => void;
}

export function CompanyDrawer({ companyId, activeTab, initialAddEmployee, onClose, onTabChange }: CompanyDrawerProps) {
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
					<CompanyDrawerContent
						key={companyId}
						companyId={companyId}
						activeTab={activeTab}
						initialAddEmployee={initialAddEmployee}
						onTabChange={onTabChange}
					/>
				)}
			</SheetContent>
		</Sheet>
	);
}

function CompanyDrawerContent({
	companyId,
	activeTab,
	initialAddEmployee,
	onTabChange,
}: {
	companyId: string;
	activeTab: CompanyTab;
	initialAddEmployee?: boolean;
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

			<div className="flex gap-0 overflow-x-auto border-b border-border px-4" role="tablist">
				{TABS.map((tab) => {
					const count =
						tab.key === "employees" ? company.employees.length : tab.key === "addresses" ? company.addresses.length : 0;
					return (
						<button
							key={tab.key}
							type="button"
							role="tab"
							aria-selected={activeTab === tab.key}
							className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors ${
								activeTab === tab.key
									? "border-b-2 border-primary text-foreground"
									: "text-muted-foreground hover:text-foreground"
							}`}
							onClick={() => onTabChange(tab.key)}
							data-testid={`tab-${tab.key}`}
						>
							{tab.label}
							{count > 0 && <span className="ml-1.5 tabular-nums text-xs text-muted-foreground">({count})</span>}
						</button>
					);
				})}
			</div>

			<div className="flex-1 overflow-y-auto px-4">
				{activeTab === "general" && <GeneralTab key={companyId} company={company} companyId={companyId} />}
				{activeTab === "addresses" && <AddressesTab company={company} companyId={companyId} />}
				{activeTab === "employees" && (
					<EmployeesTab company={company} companyId={companyId} initialAddForm={initialAddEmployee} />
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
type GeneralSection = "info" | "comments";

const INFO_KEYS: FormKey[] = ["name", "industry", "website", "description"];
const COMMENTS_KEYS: FormKey[] = ["preferredPayment", "preferredDelivery", "additionalComments"];

function GeneralTab({ company, companyId }: { company: Company; companyId: string }) {
	const [editingSection, setEditingSection] = useState<GeneralSection | null>(null);
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

	function update(field: FormKey, value: string) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	function handleEdit(section: GeneralSection) {
		setForm({
			name: company.name,
			industry: company.industry,
			website: company.website,
			description: company.description,
			preferredPayment: company.preferredPayment,
			preferredDelivery: company.preferredDelivery,
			additionalComments: company.additionalComments,
		});
		setEditingSection(section);
	}

	function handleSave(keys: FormKey[]) {
		const data: UpdateCompanyData = {};
		for (const key of keys) {
			if (form[key] !== company[key]) {
				data[key] = form[key];
			}
		}
		if (Object.keys(data).length === 0) {
			setEditingSection(null);
			return;
		}
		updateMutation.mutate(data, { onSuccess: () => setEditingSection(null) });
	}

	function isDirty(keys: FormKey[]) {
		return keys.some((k) => form[k] !== company[k]);
	}

	return (
		<div className="flex flex-col gap-4 py-4" data-testid="tab-content-general">
			{editingSection === "info" ? (
				<div className="rounded-lg border border-border p-4">
					<h3 className="text-sm font-medium mb-3">Основная информация</h3>
					<div className="flex flex-col gap-3">
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
					<div className="flex justify-end gap-2 mt-4">
						<Button type="button" variant="outline" size="sm" onClick={() => setEditingSection(null)}>
							Отмена
						</Button>
						<Button
							type="button"
							size="sm"
							disabled={!isDirty(INFO_KEYS) || form.name.trim() === "" || updateMutation.isPending}
							onClick={() => handleSave(INFO_KEYS)}
						>
							{updateMutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
							Сохранить
						</Button>
					</div>
				</div>
			) : (
				<div className="relative rounded-lg border border-border p-4">
					<button
						type="button"
						className="absolute top-2 right-2 inline-flex items-center justify-center size-6 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
						onClick={() => handleEdit("info")}
						aria-label="Редактировать основную информацию"
					>
						<Pencil className="size-3" aria-hidden="true" />
					</button>
					<h3 className="text-sm font-medium mb-3">Основная информация</h3>
					<div className="grid grid-cols-2 gap-x-4 gap-y-3">
						<ViewField label="Название" value={company.name} />
						<ViewField label="Отрасль" value={company.industry} />
						<ViewField label="Сайт" value={company.website} />
					</div>
					<div className="mt-3">
						<ViewField label="Описание" value={company.description} />
					</div>
				</div>
			)}

			{editingSection === "comments" ? (
				<div className="rounded-lg border border-border p-4">
					<h3 className="text-sm font-medium mb-3">Дополнительная информация для агента</h3>
					<div className="flex flex-col gap-3">
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
					<div className="flex justify-end gap-2 mt-4">
						<Button type="button" variant="outline" size="sm" onClick={() => setEditingSection(null)}>
							Отмена
						</Button>
						<Button
							type="button"
							size="sm"
							disabled={!isDirty(COMMENTS_KEYS) || updateMutation.isPending}
							onClick={() => handleSave(COMMENTS_KEYS)}
						>
							{updateMutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
							Сохранить
						</Button>
					</div>
				</div>
			) : (
				<div className="relative rounded-lg border border-border p-4">
					<button
						type="button"
						className="absolute top-2 right-2 inline-flex items-center justify-center size-6 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
						onClick={() => handleEdit("comments")}
						aria-label="Редактировать дополнительную информацию"
					>
						<Pencil className="size-3" aria-hidden="true" />
					</button>
					<h3 className="text-sm font-medium mb-3">Дополнительная информация для агента</h3>
					<div className="grid grid-cols-2 gap-x-4 gap-y-3">
						<ViewField label="Предпочтительная оплата" value={company.preferredPayment} />
						<ViewField label="Предпочтительная доставка" value={company.preferredDelivery} />
					</div>
					<div className="mt-3">
						<ViewField label="Дополнительные комментарии" value={company.additionalComments} />
					</div>
				</div>
			)}
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

const EMPTY_ADDRESS_FORM: AddressFormState = {
	name: "",
	type: "office",
	postalCode: "",
	address: "",
	contactPerson: "",
	phone: "",
	isMain: false,
};

interface AddressFormState {
	name: string;
	type: AddressType;
	postalCode: string;
	address: string;
	contactPerson: string;
	phone: string;
	isMain: boolean;
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
		const changed: Record<string, string | boolean> = {};
		for (const key of Object.keys(form) as (keyof AddressFormState)[]) {
			if (form[key] !== original[key]) changed[key] = form[key] as string | boolean;
		}
		if (Object.keys(changed).length === 0) {
			setEditingId(null);
			return;
		}
		// If setting this address as main, unset the previous main first, then apply the update
		if (changed.isMain === true) {
			const prevMain = company.addresses.find((a) => a.isMain && a.id !== addressId);
			if (prevMain) {
				updateMutation.mutate(
					{ addressId: prevMain.id, data: { isMain: false } },
					{
						onSuccess: () =>
							updateMutation.mutate({ addressId, data: changed }, { onSuccess: () => setEditingId(null) }),
					},
				);
				return;
			}
		}
		updateMutation.mutate({ addressId, data: changed }, { onSuccess: () => setEditingId(null) });
	}

	function handleDelete(addressId: string) {
		deleteMutation.mutate(addressId, {
			onError: () => {
				toast.error("Не удалось удалить адрес");
			},
		});
	}

	return (
		<div className="flex flex-col gap-4 py-4" data-testid="tab-content-addresses">
			{showAddForm ? (
				<AddressForm
					testId="address-add-form"
					title="Добавить адрес"
					initial={EMPTY_ADDRESS_FORM}
					onSave={handleCreate}
					onCancel={() => setShowAddForm(false)}
					isPending={createMutation.isPending}
				/>
			) : (
				<>
					{company.addresses.map((addr) => (
						<AddressCard
							key={addr.id}
							address={addr}
							isEditing={editingId === addr.id}
							canDelete={!isLastAddress && !addr.isMain}
							onEdit={() => setEditingId(addr.id)}
							onCancel={() => setEditingId(null)}
							onSave={(form) => handleUpdate(addr.id, addr, form)}
							onDelete={() => handleDelete(addr.id)}
						/>
					))}
					<Button type="button" variant="outline" className="w-full" onClick={() => setShowAddForm(true)}>
						<Plus className="size-4" aria-hidden="true" />
						Добавить адрес
					</Button>
				</>
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
						contactPerson: address.contactPerson,
						phone: address.phone,
						isMain: address.isMain,
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
						{address.isMain && <Badge variant="outline">Основной</Badge>}
					</div>
					<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
						<ViewField label="Индекс" value={address.postalCode} />
						<ViewField label="Адрес" value={address.address} />
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

function AddressForm({
	testId,
	title,
	initial,
	onSave,
	onCancel,
	isPending,
}: {
	testId?: string;
	title?: string;
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
			{title && <h3 className="text-sm font-medium">{title}</h3>}
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
			{/* biome-ignore lint/a11y/noLabelWithoutControl: Radix Checkbox renders a button internally */}
			<label className="flex items-center gap-2">
				<Checkbox
					checked={form.isMain}
					onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isMain: checked === true }))}
					aria-label="Основной адрес"
				/>
				<span className="text-sm">Основной адрес</span>
			</label>
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

const PERMISSION_MODULES: {
	key: keyof Omit<EmployeePermissions, "id" | "employeeId">;
	label: string;
	Icon: LucideIcon;
}[] = [
	{ key: "analytics", label: "Аналитика", Icon: LayoutDashboard },
	{ key: "procurement", label: "Закупки", Icon: Layers },
	{ key: "companies", label: "Компании", Icon: Building2 },
	{ key: "tasks", label: "Задачи", Icon: ListTodo },
];

const PERMISSION_LEVELS: { value: PermissionLevel; label: string }[] = [
	{ value: "none", label: "Нет доступа" },
	{ value: "view", label: "Просмотр" },
	{ value: "edit", label: "Редактирование" },
];

interface EmployeeFormState {
	firstName: string;
	lastName: string;
	patronymic: string;
	position: string;
	role: EmployeeRole;
	phone: string;
	email: string;
	isResponsible: boolean;
}

const EMPTY_EMPLOYEE_FORM: EmployeeFormState = {
	firstName: "",
	lastName: "",
	patronymic: "",
	position: "",
	role: "user",
	phone: "",
	email: "",
	isResponsible: false,
};

function EmployeesTab({
	company,
	companyId,
	initialAddForm,
}: {
	company: Company;
	companyId: string;
	initialAddForm?: boolean;
}) {
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const [showAddForm, setShowAddForm] = useState(initialAddForm ?? false);

	const createMutation = useCreateEmployee(companyId);
	const updateMutation = useUpdateEmployee(companyId);
	const deleteMutation = useDeleteEmployee(companyId);
	const permsMutation = useUpdateEmployeePermissions(companyId);
	const { data: me } = useMe();

	function handleCreate(form: EmployeeFormState) {
		createMutation.mutate(form as CreateEmployeeData, {
			onSuccess: () => setShowAddForm(false),
			onError: () => {
				toast.error("Не удалось создать сотрудника");
			},
		});
	}

	function handleUpdate(
		employeeId: number,
		original: Employee & { permissions: EmployeePermissions },
		form: EmployeeFormState,
	) {
		const changed: Record<string, unknown> = {};
		for (const key of Object.keys(form) as (keyof EmployeeFormState)[]) {
			if (form[key] !== original[key]) changed[key] = form[key];
		}
		if (Object.keys(changed).length === 0) {
			setExpandedId(null);
			return;
		}
		// If role changed to admin, prefill all permissions to edit
		if (changed.role === "admin") {
			const permData: UpdatePermissionsData = {
				analytics: "edit",
				procurement: "edit",
				companies: "edit",
				tasks: "edit",
			};
			permsMutation.mutate({ employeeId, data: permData });
		}
		updateMutation.mutate(
			{ employeeId, data: changed as UpdateEmployeeData },
			{ onSuccess: () => setExpandedId(null) },
		);
	}

	function handleDelete(employeeId: number) {
		deleteMutation.mutate(employeeId, {
			onError: () => {
				toast.error("Не удалось удалить сотрудника");
			},
		});
	}

	function handlePermissionChange(employeeId: number, module: keyof UpdatePermissionsData, level: PermissionLevel) {
		permsMutation.mutate({ employeeId, data: { [module]: level } });
	}

	const isUserRole = me?.role === "user";

	return (
		<div className="flex flex-col gap-3 py-4" data-testid="tab-content-employees">
			{showAddForm ? (
				<EmployeeForm
					testId="employee-add-form"
					title="Добавить сотрудника"
					initial={EMPTY_EMPLOYEE_FORM}
					onSave={handleCreate}
					onCancel={() => setShowAddForm(false)}
					isPending={createMutation.isPending}
					showResponsible={false}
				/>
			) : (
				<>
					{company.employees.map((emp) => (
						<EmployeeCard
							key={emp.id}
							employee={emp}
							isExpanded={expandedId === emp.id}
							canDelete={company.employees.length > 1}
							canEdit={!isUserRole || emp.id === me?.id}
							onToggle={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
							onSave={(form) => handleUpdate(emp.id, emp, form)}
							onDelete={() => handleDelete(emp.id)}
							onPermissionChange={(mod, level) => handlePermissionChange(emp.id, mod, level)}
						/>
					))}
					<Button type="button" variant="outline" className="w-full" onClick={() => setShowAddForm(true)}>
						<Plus className="size-4" aria-hidden="true" />
						Добавить сотрудника
					</Button>
				</>
			)}
		</div>
	);
}

function EmployeeCard({
	employee,
	isExpanded,
	canDelete,
	canEdit,
	onToggle,
	onSave,
	onDelete,
	onPermissionChange,
}: {
	employee: Employee & { permissions: EmployeePermissions };
	isExpanded: boolean;
	canDelete: boolean;
	canEdit: boolean;
	onToggle: () => void;
	onSave: (form: EmployeeFormState) => void;
	onDelete: () => void;
	onPermissionChange: (module: keyof UpdatePermissionsData, level: PermissionLevel) => void;
}) {
	return (
		<div data-testid={`employee-${employee.id}`} className="rounded-lg border border-border">
			<button
				type="button"
				className="flex w-full items-center justify-between p-3 text-left"
				onClick={onToggle}
				data-testid={`employee-toggle-${employee.id}`}
			>
				<div className="flex flex-col gap-0.5">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium">
							{employee.lastName} {employee.firstName} {employee.patronymic}
						</span>
						{employee.isResponsible && <Badge variant="outline">Ответственный</Badge>}
					</div>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<span>{employee.position}</span>
						<Badge variant="secondary" className="text-[10px] px-1.5 py-0">
							{ROLE_LABELS[employee.role]}
						</Badge>
					</div>
				</div>
				{isExpanded ? (
					<ChevronUp className="size-4 text-muted-foreground" />
				) : (
					<ChevronDown className="size-4 text-muted-foreground" />
				)}
			</button>

			{isExpanded && (
				<div className="border-t border-border p-3">
					<EmployeeExpandedContent
						employee={employee}
						canDelete={canDelete}
						canEdit={canEdit}
						onSave={onSave}
						onDelete={onDelete}
						onPermissionChange={onPermissionChange}
					/>
				</div>
			)}
		</div>
	);
}

function EmployeeExpandedContent({
	employee,
	canDelete,
	canEdit,
	onSave,
	onDelete,
	onPermissionChange,
}: {
	employee: Employee & { permissions: EmployeePermissions };
	canDelete: boolean;
	canEdit: boolean;
	onSave: (form: EmployeeFormState) => void;
	onDelete: () => void;
	onPermissionChange: (module: keyof UpdatePermissionsData, level: PermissionLevel) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState<EmployeeFormState>({
		firstName: employee.firstName,
		lastName: employee.lastName,
		patronymic: employee.patronymic,
		position: employee.position,
		role: employee.role,
		phone: employee.phone,
		email: employee.email,
		isResponsible: employee.isResponsible,
	});

	const isDirty = (Object.keys(form) as (keyof EmployeeFormState)[]).some((k) => form[k] !== employee[k]);
	const canSave = isDirty && form.firstName.trim() !== "" && form.lastName.trim() !== "";

	function update(field: keyof EmployeeFormState, value: string | boolean) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	function handleEdit() {
		setForm({
			firstName: employee.firstName,
			lastName: employee.lastName,
			patronymic: employee.patronymic,
			position: employee.position,
			role: employee.role,
			phone: employee.phone,
			email: employee.email,
			isResponsible: employee.isResponsible,
		});
		setEditing(true);
	}

	return (
		<div className="flex flex-col gap-4">
			{editing ? (
				<>
					<div className="flex flex-col gap-3">
						<FieldRow label="Фамилия">
							<Input
								value={form.lastName}
								onChange={(e) => update("lastName", e.target.value)}
								aria-label="Фамилия"
								spellCheck={false}
								autoComplete="off"
							/>
						</FieldRow>
						<FieldRow label="Имя">
							<Input
								value={form.firstName}
								onChange={(e) => update("firstName", e.target.value)}
								aria-label="Имя"
								spellCheck={false}
								autoComplete="off"
							/>
						</FieldRow>
						<FieldRow label="Отчество">
							<Input
								value={form.patronymic}
								onChange={(e) => update("patronymic", e.target.value)}
								aria-label="Отчество"
								spellCheck={false}
								autoComplete="off"
							/>
						</FieldRow>
						<FieldRow label="Должность">
							<Input
								value={form.position}
								onChange={(e) => update("position", e.target.value)}
								aria-label="Должность"
								spellCheck={false}
								autoComplete="off"
							/>
						</FieldRow>
						<FieldRow label="Роль">
							<Select value={form.role} onValueChange={(v) => update("role", v)} disabled={employee.role === "owner"}>
								<SelectTrigger aria-label="Роль">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(employee.role === "owner" ? (["owner"] as const) : ASSIGNABLE_ROLES).map((r) => (
										<SelectItem key={r} value={r}>
											{ROLE_LABELS[r]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
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
						<FieldRow label="Электронная почта">
							<Input
								value={form.email}
								onChange={(e) => update("email", e.target.value)}
								aria-label="Электронная почта"
								spellCheck={false}
								autoComplete="off"
								inputMode="email"
							/>
						</FieldRow>
						<div className="flex items-center gap-2">
							<Checkbox
								id={`responsible-${employee.id}`}
								checked={form.isResponsible}
								disabled={form.isResponsible}
								onCheckedChange={() => {
									if (!form.isResponsible) {
										update("isResponsible", true);
									}
								}}
								aria-label="Ответственный"
							/>
							<label htmlFor={`responsible-${employee.id}`} className="text-sm">
								Ответственный
							</label>
						</div>
					</div>
					<div className="flex justify-between">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="text-destructive hover:text-destructive"
							onClick={onDelete}
							disabled={!canDelete}
							aria-label="Удалить сотрудника"
						>
							<Trash2 className="size-3.5" aria-hidden="true" />
							Удалить
						</Button>
						<div className="flex gap-2">
							<Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
								Отмена
							</Button>
							<Button type="button" size="sm" disabled={!canSave} onClick={() => onSave(form)}>
								Сохранить
							</Button>
						</div>
					</div>
				</>
			) : (
				<div className="relative">
					{canEdit && (
						<button
							type="button"
							className="absolute top-0 right-0 inline-flex items-center justify-center size-6 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
							onClick={handleEdit}
							aria-label="Редактировать сотрудника"
						>
							<Pencil className="size-3" aria-hidden="true" />
						</button>
					)}
					<div className="grid grid-cols-2 gap-x-4 gap-y-3 pr-8">
						<ViewField label="Телефон" value={employee.phone} />
						<ViewField label="Электронная почта" value={employee.email} />
						<ViewField label="Должность" value={employee.position} />
						<ViewField label="Роль" value={ROLE_LABELS[employee.role]} />
						<ViewField label="Ответственный" value={employee.isResponsible ? "Да" : "Нет"} />
					</div>
				</div>
			)}

			<Separator />

			<div className="flex flex-col gap-2">
				<h4 className="text-xs font-medium text-muted-foreground">Права доступа</h4>
				<PermissionsMatrix
					permissions={employee.permissions}
					onChange={onPermissionChange}
					readOnly={PRIVILEGED_ROLES.has(employee.role)}
				/>
			</div>
		</div>
	);
}

const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
	none: "Нет доступа",
	view: "Просмотр",
	edit: "Редактирование",
};

const PERM_COLOR: Record<PermissionLevel, string> = {
	edit: "text-green-600 dark:text-green-400",
	view: "text-yellow-600 dark:text-yellow-400",
	none: "text-red-500/60 dark:text-red-400/60",
};

function PermissionsMatrix({
	permissions,
	onChange,
	readOnly = false,
}: {
	permissions: EmployeePermissions;
	onChange: (module: keyof UpdatePermissionsData, level: PermissionLevel) => void;
	readOnly?: boolean;
}) {
	const [editing, setEditing] = useState(false);

	if (!editing) {
		return (
			<div className="flex items-center gap-2" data-testid="permissions-matrix">
				{PERMISSION_MODULES.map((mod) => {
					const level = permissions[mod.key];
					return (
						<Tooltip key={mod.key}>
							<TooltipTrigger asChild>
								<div className="p-1.5 rounded-md bg-muted/50" data-testid={`perm-row-${mod.key}`}>
									<mod.Icon className={`size-5 ${PERM_COLOR[level]}`} aria-hidden="true" />
								</div>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="text-xs">
								{mod.label}: {PERMISSION_LEVEL_LABELS[level]}
							</TooltipContent>
						</Tooltip>
					);
				})}
				{!readOnly && (
					<button
						type="button"
						className="inline-flex items-center justify-center size-6 rounded text-muted-foreground/60 hover:text-foreground transition-colors ml-0.5"
						onClick={() => setEditing(true)}
						aria-label="Редактировать права доступа"
					>
						<Pencil className="size-3" aria-hidden="true" />
					</button>
				)}
			</div>
		);
	}

	return (
		<div
			className="inline-flex flex-col gap-3 rounded-lg border border-border p-3 self-start"
			data-testid="permissions-matrix"
		>
			{PERMISSION_MODULES.map((mod) => {
				const level = permissions[mod.key];
				return (
					<div key={mod.key} className="flex flex-col gap-1.5" data-testid={`perm-row-${mod.key}`}>
						<div className="flex items-center gap-1.5">
							<mod.Icon className={`size-4 ${PERM_COLOR[level]}`} aria-hidden="true" />
							<span className="text-xs font-medium">{mod.label}</span>
						</div>
						<PermissionSegments value={level} onChange={(l) => onChange(mod.key, l)} moduleKey={mod.key} />
					</div>
				);
			})}
			<div className="flex justify-end">
				<Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
					Готово
				</Button>
			</div>
		</div>
	);
}

function PermissionSegments({
	value,
	onChange,
	moduleKey,
}: {
	value: PermissionLevel;
	onChange: (level: PermissionLevel) => void;
	moduleKey: string;
}) {
	return (
		<div className="inline-flex rounded-md border border-border text-xs">
			{PERMISSION_LEVELS.map((lvl) => (
				<button
					key={lvl.value}
					type="button"
					aria-pressed={value === lvl.value}
					className={`px-2 py-1 transition-colors first:rounded-l-md last:rounded-r-md border-r last:border-r-0 border-border ${
						value === lvl.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
					}`}
					onClick={() => onChange(lvl.value)}
					data-testid={`perm-${moduleKey}-${lvl.value}`}
				>
					{lvl.label}
				</button>
			))}
		</div>
	);
}

function EmployeeForm({
	testId,
	title,
	initial,
	onSave,
	onCancel,
	isPending,
	showResponsible,
}: {
	testId?: string;
	title?: string;
	initial: EmployeeFormState;
	onSave: (form: EmployeeFormState) => void;
	onCancel: () => void;
	isPending: boolean;
	showResponsible: boolean;
}) {
	const [form, setForm] = useState<EmployeeFormState>(initial);

	function update(field: keyof EmployeeFormState, value: string | boolean) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	const canSave = form.firstName.trim() !== "" && form.lastName.trim() !== "";

	return (
		<div className="flex flex-col gap-3 rounded-lg border border-border p-3" data-testid={testId}>
			{title && <h3 className="text-sm font-medium">{title}</h3>}
			<FieldRow label="Фамилия">
				<Input
					value={form.lastName}
					onChange={(e) => update("lastName", e.target.value)}
					aria-label="Фамилия"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Имя">
				<Input
					value={form.firstName}
					onChange={(e) => update("firstName", e.target.value)}
					aria-label="Имя"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Отчество">
				<Input
					value={form.patronymic}
					onChange={(e) => update("patronymic", e.target.value)}
					aria-label="Отчество"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Должность">
				<Input
					value={form.position}
					onChange={(e) => update("position", e.target.value)}
					aria-label="Должность"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Роль">
				<Select value={form.role} onValueChange={(v) => update("role", v)}>
					<SelectTrigger aria-label="Роль">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ASSIGNABLE_ROLES.map((r) => (
							<SelectItem key={r} value={r}>
								{ROLE_LABELS[r]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
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
			<FieldRow label="Электронная почта">
				<Input
					value={form.email}
					onChange={(e) => update("email", e.target.value)}
					aria-label="Электронная почта"
					spellCheck={false}
					autoComplete="off"
					inputMode="email"
				/>
			</FieldRow>
			{showResponsible && (
				<div className="flex items-center gap-2">
					<Checkbox
						id="new-employee-responsible"
						checked={form.isResponsible}
						onCheckedChange={(checked) => update("isResponsible", checked === true)}
						aria-label="Ответственный"
					/>
					<label htmlFor="new-employee-responsible" className="text-sm">
						Ответственный
					</label>
				</div>
			)}
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
