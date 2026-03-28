import {
	BarChart3,
	Building2,
	ChevronDown,
	ChevronUp,
	ListTodo,
	LoaderCircle,
	Pencil,
	Plus,
	ShoppingCart,
	Star,
	Trash2,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type {
	CreateAddressData,
	CreateEmployeeData,
	UpdateCompanyData,
	UpdateEmployeeData,
	UpdatePermissionsData,
} from "@/data/api-client";
import type {
	Address,
	AddressType,
	Company,
	Employee,
	EmployeePermissions,
	EmployeeRole,
	PermissionLevel,
} from "@/data/types";
import { ADDRESS_TYPE_LABELS } from "@/data/types";
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
				{activeTab === "employees" && <EmployeesTab company={company} companyId={companyId} />}
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

// --- Employees Tab ---

const ROLE_LABELS: Record<EmployeeRole, string> = { admin: "Администратор", user: "Пользователь" };
const ROLES: EmployeeRole[] = ["admin", "user"];

const PERMISSION_MODULES: {
	key: keyof Omit<EmployeePermissions, "id" | "employeeId">;
	label: string;
	icon: ReactNode;
}[] = [
	{ key: "analytics", label: "Аналитика", icon: <BarChart3 className="size-4" aria-hidden="true" /> },
	{ key: "procurement", label: "Закупки", icon: <ShoppingCart className="size-4" aria-hidden="true" /> },
	{ key: "companies", label: "Компании", icon: <Building2 className="size-4" aria-hidden="true" /> },
	{ key: "tasks", label: "Задачи", icon: <ListTodo className="size-4" aria-hidden="true" /> },
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

function EmployeesTab({ company, companyId }: { company: Company; companyId: string }) {
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);

	const createMutation = useCreateEmployee(companyId);
	const updateMutation = useUpdateEmployee(companyId);
	const deleteMutation = useDeleteEmployee(companyId);
	const permsMutation = useUpdateEmployeePermissions(companyId);

	const responsibleCount = company.employees.filter((e) => e.isResponsible).length;

	function handleCreate(form: EmployeeFormState) {
		createMutation.mutate(form as CreateEmployeeData, {
			onSuccess: () => setShowAddForm(false),
		});
	}

	function handleUpdate(
		employeeId: string,
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

	function handleDelete(employeeId: string) {
		deleteMutation.mutate(employeeId);
	}

	function handlePermissionChange(employeeId: string, module: keyof UpdatePermissionsData, level: PermissionLevel) {
		permsMutation.mutate({ employeeId, data: { [module]: level } });
	}

	function handleResponsibleChange(employeeId: string) {
		updateMutation.mutate({ employeeId, data: { isResponsible: true } });
	}

	return (
		<div className="flex flex-col gap-3 py-4" data-testid="tab-content-employees">
			{company.employees.map((emp) => (
				<EmployeeCard
					key={emp.id}
					employee={emp}
					isExpanded={expandedId === emp.id}
					canDelete={!(emp.isResponsible && responsibleCount <= 1) && company.employees.length > 1}
					canUnsetResponsible={responsibleCount > 1 || !emp.isResponsible}
					onToggle={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
					onSave={(form) => handleUpdate(emp.id, emp, form)}
					onDelete={() => handleDelete(emp.id)}
					onPermissionChange={(mod, level) => handlePermissionChange(emp.id, mod, level)}
					onResponsibleChange={() => handleResponsibleChange(emp.id)}
				/>
			))}

			{showAddForm ? (
				<EmployeeForm
					testId="employee-add-form"
					initial={EMPTY_EMPLOYEE_FORM}
					onSave={handleCreate}
					onCancel={() => setShowAddForm(false)}
					isPending={createMutation.isPending}
					showResponsible={false}
				/>
			) : (
				<Button type="button" variant="outline" className="w-full" onClick={() => setShowAddForm(true)}>
					<Plus className="size-4" aria-hidden="true" />
					Добавить сотрудника
				</Button>
			)}
		</div>
	);
}

function EmployeeCard({
	employee,
	isExpanded,
	canDelete,
	canUnsetResponsible,
	onToggle,
	onSave,
	onDelete,
	onPermissionChange,
	onResponsibleChange,
}: {
	employee: Employee & { permissions: EmployeePermissions };
	isExpanded: boolean;
	canDelete: boolean;
	canUnsetResponsible: boolean;
	onToggle: () => void;
	onSave: (form: EmployeeFormState) => void;
	onDelete: () => void;
	onPermissionChange: (module: keyof UpdatePermissionsData, level: PermissionLevel) => void;
	onResponsibleChange: () => void;
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
						{employee.isResponsible && (
							<Star className="size-3.5 fill-yellow-400 text-yellow-400" aria-label="Ответственный" />
						)}
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
						canUnsetResponsible={canUnsetResponsible}
						onSave={onSave}
						onDelete={onDelete}
						onPermissionChange={onPermissionChange}
						onResponsibleChange={onResponsibleChange}
					/>
				</div>
			)}
		</div>
	);
}

function EmployeeExpandedContent({
	employee,
	canDelete,
	canUnsetResponsible,
	onSave,
	onDelete,
	onPermissionChange,
	onResponsibleChange,
}: {
	employee: Employee & { permissions: EmployeePermissions };
	canDelete: boolean;
	canUnsetResponsible: boolean;
	onSave: (form: EmployeeFormState) => void;
	onDelete: () => void;
	onPermissionChange: (module: keyof UpdatePermissionsData, level: PermissionLevel) => void;
	onResponsibleChange: () => void;
}) {
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

	return (
		<div className="flex flex-col gap-4">
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
					<Select value={form.role} onValueChange={(v) => update("role", v)}>
						<SelectTrigger aria-label="Роль">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ROLES.map((r) => (
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
						checked={employee.isResponsible}
						disabled={employee.isResponsible && !canUnsetResponsible}
						onCheckedChange={() => {
							if (!employee.isResponsible) onResponsibleChange();
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
				<Button type="button" size="sm" disabled={!canSave} onClick={() => onSave(form)}>
					Сохранить
				</Button>
			</div>

			<Separator />

			<div className="flex flex-col gap-2">
				<h4 className="text-xs font-medium text-muted-foreground">Права доступа</h4>
				<PermissionsMatrix permissions={employee.permissions} onChange={onPermissionChange} />
			</div>
		</div>
	);
}

function PermissionsMatrix({
	permissions,
	onChange,
}: {
	permissions: EmployeePermissions;
	onChange: (module: keyof UpdatePermissionsData, level: PermissionLevel) => void;
}) {
	return (
		<div className="flex flex-col gap-2" data-testid="permissions-matrix">
			{PERMISSION_MODULES.map((mod) => (
				<div key={mod.key} className="flex items-center gap-3" data-testid={`perm-row-${mod.key}`}>
					<div className="flex items-center gap-1.5 w-28 shrink-0">
						{mod.icon}
						<span className="text-xs">{mod.label}</span>
					</div>
					<PermissionSegments
						value={permissions[mod.key]}
						onChange={(level) => onChange(mod.key, level)}
						moduleKey={mod.key}
					/>
				</div>
			))}
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
		<div className="flex rounded-md border border-border text-xs">
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
	initial,
	onSave,
	onCancel,
	isPending,
	showResponsible,
}: {
	testId?: string;
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
						{ROLES.map((r) => (
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
