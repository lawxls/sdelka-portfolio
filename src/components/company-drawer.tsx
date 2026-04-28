import { ChevronDown, LoaderCircle, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CardGrid, FieldCard, DetailSection as Section, ValueText } from "@/components/detail-section";
import { InviteEmployeesDrawer } from "@/components/invite-employees-drawer";
import { PermissionsMatrix } from "@/components/permissions-matrix";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { CheckboxBadge } from "@/components/ui/checkbox-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
	Address,
	Company,
	CreateAddressData,
	Employee,
	EmployeePermissions,
	EmployeeRole,
	PermissionLevel,
	PermissionModuleKey,
	UpdateCompanyData,
	UpdateEmployeeData,
	UpdatePermissionsData,
} from "@/data/domains/companies";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/data/types";
import {
	useCompanyDetail,
	useCreateAddress,
	useDeleteAddress,
	useDeleteEmployee,
	useUpdateAddress,
	useUpdateCompany,
	useUpdateEmployee,
	useUpdateEmployeePermissions,
} from "@/data/use-company-detail";
import { useMe } from "@/data/use-me";
import { formatFullName, formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

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
				<SheetTitle data-testid="drawer-title" className="text-balance">
					{company.name}
				</SheetTitle>
				<SheetDescription className="sr-only">Детали компании</SheetDescription>
			</SheetHeader>

			<div className="flex gap-0 overflow-x-auto border-b border-border px-4" role="tablist">
				{TABS.map((tab) => {
					const counts: Record<CompanyTab, number | null> = {
						employees: company.employees.length,
						addresses: company.addresses.length,
						general: null,
					};
					const count = counts[tab.key];
					const isActive = activeTab === tab.key;
					return (
						<button
							key={tab.key}
							type="button"
							role="tab"
							aria-selected={isActive}
							className={cn(
								"inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors",
								"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
								isActive ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground",
							)}
							onClick={() => onTabChange(tab.key)}
							data-testid={`tab-${tab.key}`}
						>
							{tab.label}
							{count != null && count > 0 && (
								<span
									className={cn(
										"inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs tabular-nums",
										isActive ? "text-foreground" : "text-muted-foreground",
									)}
									aria-hidden="true"
								>
									{count}
								</span>
							)}
						</button>
					);
				})}
			</div>

			<div className="flex-1 overflow-y-auto px-4 py-4">
				{activeTab === "general" && <GeneralTab key={companyId} company={company} companyId={companyId} />}
				{activeTab === "addresses" && <AddressesTab company={company} companyId={companyId} />}
				{activeTab === "employees" && (
					<EmployeesTab company={company} companyId={companyId} initialAddEmployee={initialAddEmployee} />
				)}
			</div>
		</>
	);
}

type InfoFormState = { name: string; website: string; description: string };
type CommentsFormState = { additionalComments: string };
type GeneralSection = "info" | "comments" | null;

function GeneralTab({ company, companyId }: { company: Company; companyId: string }) {
	const [editing, setEditing] = useState<GeneralSection>(null);
	const [info, setInfo] = useState<InfoFormState>({
		name: company.name,
		website: company.website,
		description: company.description,
	});
	const [comments, setComments] = useState<CommentsFormState>({ additionalComments: company.additionalComments });

	const updateMutation = useUpdateCompany(companyId);

	function handleEditInfo() {
		setInfo({ name: company.name, website: company.website, description: company.description });
		setEditing("info");
	}

	function handleEditComments() {
		setComments({ additionalComments: company.additionalComments });
		setEditing("comments");
	}

	function infoDirty(): boolean {
		return info.name !== company.name || info.website !== company.website || info.description !== company.description;
	}

	function commentsDirty(): boolean {
		return comments.additionalComments !== company.additionalComments;
	}

	function handleSaveInfo() {
		const data: UpdateCompanyData = {};
		if (info.name !== company.name) data.name = info.name;
		if (info.website !== company.website) data.website = info.website;
		if (info.description !== company.description) data.description = info.description;
		if (Object.keys(data).length === 0) {
			setEditing(null);
			return;
		}
		updateMutation.mutate(data, { onSuccess: () => setEditing(null) });
	}

	function handleSaveComments() {
		const data: UpdateCompanyData = {};
		if (comments.additionalComments !== company.additionalComments) {
			data.additionalComments = comments.additionalComments;
		}
		if (Object.keys(data).length === 0) {
			setEditing(null);
			return;
		}
		updateMutation.mutate(data, { onSuccess: () => setEditing(null) });
	}

	const isEditingInfo = editing === "info";
	const isEditingComments = editing === "comments";

	return (
		<div data-testid="tab-content-general" className="flex flex-col gap-6">
			<Section
				title="Основная информация"
				editLabel="Редактировать основную информацию"
				editing={isEditingInfo}
				onEdit={handleEditInfo}
				onCancel={() => setEditing(null)}
				onSave={handleSaveInfo}
				saveDisabled={!infoDirty() || info.name.trim() === "" || updateMutation.isPending}
				isPending={updateMutation.isPending}
			>
				<CardGrid>
					<FieldCard label="Название" span="full">
						{isEditingInfo ? (
							<Input
								aria-label="Название"
								value={info.name}
								onChange={(e) => setInfo((p) => ({ ...p, name: e.target.value }))}
								spellCheck={false}
								autoComplete="off"
							/>
						) : (
							<ValueText value={company.name} />
						)}
					</FieldCard>

					<FieldCard label="Сайт" span="full">
						{isEditingInfo ? (
							<Input
								aria-label="Сайт"
								value={info.website}
								onChange={(e) => setInfo((p) => ({ ...p, website: e.target.value }))}
								spellCheck={false}
								autoComplete="off"
							/>
						) : (
							<ValueText value={company.website} />
						)}
					</FieldCard>

					<FieldCard label="Описание" span="full">
						{isEditingInfo ? (
							<Textarea
								aria-label="Описание"
								value={info.description}
								onChange={(e) => setInfo((p) => ({ ...p, description: e.target.value }))}
								autoComplete="off"
							/>
						) : (
							<ValueText value={company.description} />
						)}
					</FieldCard>
				</CardGrid>
			</Section>

			<Section
				title="Дополнительная информация для агента"
				editLabel="Редактировать дополнительную информацию"
				editing={isEditingComments}
				onEdit={handleEditComments}
				onCancel={() => setEditing(null)}
				onSave={handleSaveComments}
				saveDisabled={!commentsDirty() || updateMutation.isPending}
				isPending={updateMutation.isPending}
			>
				<CardGrid>
					<FieldCard label="Дополнительные комментарии" span="full">
						{isEditingComments ? (
							<Textarea
								aria-label="Дополнительные комментарии"
								value={comments.additionalComments}
								onChange={(e) => setComments({ additionalComments: e.target.value })}
								autoComplete="off"
							/>
						) : (
							<ValueText value={company.additionalComments} />
						)}
					</FieldCard>
				</CardGrid>
			</Section>
		</div>
	);
}

interface AddressFormState {
	name: string;
	address: string;
	phone: string;
	isMain: boolean;
}

const EMPTY_ADDRESS_FORM: AddressFormState = { name: "", address: "", phone: "", isMain: false };

function AddressesTab({ company, companyId }: { company: Company; companyId: string }) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);
	const isLastAddress = company.addresses.length <= 1;

	const createMutation = useCreateAddress(companyId);
	const updateMutation = useUpdateAddress(companyId);
	const deleteMutation = useDeleteAddress(companyId);

	function handleCreate(data: AddressFormState) {
		createMutation.mutate(data as CreateAddressData, { onSuccess: () => setShowAddForm(false) });
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
		deleteMutation.mutate(addressId, { onError: () => toast.error("Не удалось удалить адрес") });
	}

	return (
		<div className="flex flex-col gap-4" data-testid="tab-content-addresses">
			{showAddForm ? (
				<Section title="Добавить адрес">
					<AddressForm
						testId="address-add-form"
						initial={EMPTY_ADDRESS_FORM}
						onSave={handleCreate}
						onCancel={() => setShowAddForm(false)}
						isPending={createMutation.isPending}
					/>
				</Section>
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
			<div data-testid={`address-${address.id}`} className="rounded-2xl border border-border bg-card p-4">
				<AddressForm
					initial={{
						name: address.name,
						address: address.address,
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
		<article
			data-testid={`address-${address.id}`}
			className="group overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,box-shadow] duration-200 ease-out hover:border-foreground/20 hover:shadow-[0_1px_2px_rgba(0,0,0,0.03),0_4px_12px_-6px_rgba(0,0,0,0.05)]"
		>
			<div className="flex items-start justify-between gap-3 p-4">
				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 items-center gap-1.5">
						<span className="truncate text-base font-semibold leading-snug">{address.name}</span>
						{address.isMain && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Star
										aria-label="Основной адрес"
										data-testid={`address-main-icon-${address.id}`}
										className="size-3.5 shrink-0 fill-highlight-foreground text-highlight-foreground"
									/>
								</TooltipTrigger>
								<TooltipContent side="top" className="text-xs">
									Основной адрес
								</TooltipContent>
							</Tooltip>
						)}
					</div>
					<p className="mt-1 text-sm text-muted-foreground">{address.address}</p>
					{address.phone && (
						<p className="mt-1 text-xs tabular-nums text-muted-foreground">{formatPhone(address.phone)}</p>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-9"
						onClick={onEdit}
						aria-label="Редактировать"
					>
						<Pencil className="size-3.5" aria-hidden="true" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-9 text-destructive hover:text-destructive"
						onClick={onDelete}
						disabled={!canDelete}
						aria-label="Удалить"
					>
						<Trash2 className="size-3.5" aria-hidden="true" />
					</Button>
				</div>
			</div>
		</article>
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

	const canSave = form.name.trim() !== "" && form.address.trim() !== "";

	return (
		<div className="flex flex-col gap-3" data-testid={testId}>
			<FormFieldRow label="Название">
				<Input
					value={form.name}
					onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
					aria-label="Название"
					spellCheck={false}
					autoComplete="off"
					required
				/>
			</FormFieldRow>
			<FormFieldRow label="Адрес">
				<Input
					value={form.address}
					onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
					aria-label="Адрес"
					spellCheck={false}
					autoComplete="off"
					required
				/>
			</FormFieldRow>
			<FormFieldRow label="Телефон контактного лица">
				<PhoneInput
					value={form.phone}
					onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
					aria-label="Телефон контактного лица"
				/>
			</FormFieldRow>
			<CheckboxBadge
				id="address-is-main"
				checked={form.isMain}
				onChange={(c) => setForm((p) => ({ ...p, isMain: c }))}
				ariaLabel="Выбрать основным адресом"
			>
				Выбрать основным адресом
			</CheckboxBadge>
			<div className="flex justify-end gap-2 mt-1">
				<Button type="button" variant="outline" size="sm" onClick={onCancel}>
					Отмена
				</Button>
				<Button type="button" size="sm" disabled={!canSave || isPending} onClick={() => onSave(form)}>
					{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
					Сохранить
				</Button>
			</div>
		</div>
	);
}

function FormFieldRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-xs text-muted-foreground">{label}</span>
			{children}
		</div>
	);
}

interface EmployeeFormState {
	firstName: string;
	lastName: string;
	patronymic: string;
	position: string;
	role: EmployeeRole;
	phone: string;
}

const ADMIN_PERMISSIONS: UpdatePermissionsData = {
	procurement: "edit",
	tasks: "edit",
	companies: "edit",
	employees: "edit",
	emails: "edit",
};

function EmployeesTab({
	company,
	companyId,
	initialAddEmployee,
}: {
	company: Company;
	companyId: string;
	initialAddEmployee?: boolean;
}) {
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [inviteOpen, setInviteOpen] = useState(initialAddEmployee ?? false);

	const updateMutation = useUpdateEmployee(companyId);
	const deleteMutation = useDeleteEmployee(companyId);
	const permsMutation = useUpdateEmployeePermissions(companyId);
	const { data: me } = useMe();

	function handleSave(employeeId: number, original: Employee, form: EmployeeFormState) {
		const changed: UpdateEmployeeData = {};
		if (form.firstName !== original.firstName) changed.firstName = form.firstName;
		if (form.lastName !== original.lastName) changed.lastName = form.lastName;
		if (form.patronymic !== original.patronymic) changed.patronymic = form.patronymic;
		if (form.position !== original.position) changed.position = form.position;
		if (form.role !== original.role) changed.role = form.role;
		if (form.phone !== original.phone) changed.phone = form.phone;
		if (Object.keys(changed).length === 0) {
			setEditingId(null);
			return;
		}
		if (changed.role === "admin") {
			permsMutation.mutate({ employeeId, data: ADMIN_PERMISSIONS });
		}
		updateMutation.mutate({ employeeId, data: changed }, { onSuccess: () => setEditingId(null) });
	}

	function handleDelete(employeeId: number) {
		deleteMutation.mutate(employeeId, { onError: () => toast.error("Не удалось удалить сотрудника") });
	}

	function handlePermissionChange(employeeId: number, module: PermissionModuleKey, level: PermissionLevel) {
		permsMutation.mutate({ employeeId, data: { [module]: level } });
	}

	function handleEdit(employeeId: number) {
		setExpandedId(employeeId);
		setEditingId(employeeId);
	}

	function handleToggle(employeeId: number) {
		setExpandedId(expandedId === employeeId ? null : employeeId);
		if (editingId === employeeId) setEditingId(null);
	}

	const isUserRole = me?.role === "user";

	return (
		<div className="flex flex-col gap-3" data-testid="tab-content-employees">
			{company.employees.map((emp) => (
				<EmployeeCard
					key={emp.id}
					employee={emp}
					isExpanded={expandedId === emp.id}
					isEditing={editingId === emp.id}
					canDelete={company.employees.length > 1}
					canEdit={!isUserRole || emp.id === me?.id}
					onToggle={() => handleToggle(emp.id)}
					onEdit={() => handleEdit(emp.id)}
					onCancelEdit={() => setEditingId(null)}
					onSave={(form) => handleSave(emp.id, emp, form)}
					onDelete={() => handleDelete(emp.id)}
					onPermissionChange={(mod, level) => handlePermissionChange(emp.id, mod, level)}
				/>
			))}
			<Button type="button" variant="outline" className="w-full" onClick={() => setInviteOpen(true)}>
				<Plus className="size-4" aria-hidden="true" />
				Добавить сотрудника
			</Button>

			<InviteEmployeesDrawer open={inviteOpen} onOpenChange={setInviteOpen} lockedCompanyId={companyId} />
		</div>
	);
}

function EmployeeCard({
	employee,
	isExpanded,
	isEditing,
	canDelete,
	canEdit,
	onToggle,
	onEdit,
	onCancelEdit,
	onSave,
	onDelete,
	onPermissionChange,
}: {
	employee: Employee & { permissions: EmployeePermissions };
	isExpanded: boolean;
	isEditing: boolean;
	canDelete: boolean;
	canEdit: boolean;
	onToggle: () => void;
	onEdit: () => void;
	onCancelEdit: () => void;
	onSave: (form: EmployeeFormState) => void;
	onDelete: () => void;
	onPermissionChange: (module: PermissionModuleKey, level: PermissionLevel) => void;
}) {
	const fullName = formatFullName(employee.lastName, employee.firstName, employee.patronymic);
	const bodyId = `employee-card-body-${employee.id}`;

	return (
		<article
			data-testid={`employee-${employee.id}`}
			data-expanded={isExpanded ? "true" : "false"}
			data-editing={isEditing ? "true" : "false"}
			className={cn(
				"group overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] duration-200 ease-out",
				isExpanded
					? "border-foreground/30 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]"
					: "border-border hover:border-foreground/20 hover:shadow-[0_1px_2px_rgba(0,0,0,0.03),0_4px_12px_-6px_rgba(0,0,0,0.05)]",
			)}
		>
			<div className="flex items-start gap-2 px-5 pt-4 pb-3">
				<button
					type="button"
					data-testid={`employee-toggle-${employee.id}`}
					onClick={onToggle}
					aria-expanded={isExpanded}
					aria-controls={bodyId}
					className="-mx-2 flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-md px-2 py-0.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
				>
					<div className="min-w-0 flex-1">
						<div className="flex min-w-0 items-center gap-2">
							<span className="truncate text-base font-semibold leading-snug">{fullName}</span>
							<span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
								{ROLE_LABELS[employee.role]}
							</span>
						</div>
						<p className="mt-1 truncate text-sm text-muted-foreground">{employee.position}</p>
					</div>
				</button>
				<div className="flex shrink-0 items-center gap-0.5 pt-0.5">
					{canEdit && !isEditing && (
						<button
							type="button"
							onClick={onEdit}
							aria-label="Редактировать сотрудника"
							data-testid={`employee-edit-${employee.id}`}
							className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground/70 transition-[color,background-color,scale] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100"
						>
							<Pencil className="size-4" aria-hidden="true" />
						</button>
					)}
					<button
						type="button"
						onClick={onToggle}
						aria-label={isExpanded ? "Свернуть" : "Развернуть"}
						aria-expanded={isExpanded}
						aria-controls={bodyId}
						className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,scale] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100"
					>
						<ChevronDown
							className={cn(
								"size-4 transition-transform duration-200 ease-out motion-reduce:transition-none",
								isExpanded && "rotate-180",
							)}
							aria-hidden="true"
						/>
					</button>
				</div>
			</div>

			{isExpanded && (
				<div id={bodyId} className="border-t border-border/70 px-5 py-4">
					<EmployeeExpandedContent
						employee={employee}
						isEditing={isEditing}
						canDelete={canDelete}
						onCancelEdit={onCancelEdit}
						onSave={onSave}
						onDelete={onDelete}
						onPermissionChange={onPermissionChange}
					/>
				</div>
			)}
		</article>
	);
}

function EmployeeExpandedContent({
	employee,
	isEditing,
	canDelete,
	onCancelEdit,
	onSave,
	onDelete,
	onPermissionChange,
}: {
	employee: Employee & { permissions: EmployeePermissions };
	isEditing: boolean;
	canDelete: boolean;
	onCancelEdit: () => void;
	onSave: (form: EmployeeFormState) => void;
	onDelete: () => void;
	onPermissionChange: (module: PermissionModuleKey, level: PermissionLevel) => void;
}) {
	if (isEditing) {
		return (
			<EmployeeEditForm
				key={`edit-${employee.id}`}
				employee={employee}
				canDelete={canDelete}
				onCancel={onCancelEdit}
				onSave={onSave}
				onDelete={onDelete}
				onPermissionChange={onPermissionChange}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
				<EmployeeViewRow label="Электронная почта" value={employee.email} />
				<EmployeeViewRow label="Телефон" value={formatPhone(employee.phone)} numeric />
			</dl>

			<div className="flex flex-col gap-2 border-t border-border/70 pt-3">
				<h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Права доступа</h4>
				<PermissionsMatrix permissions={employee.permissions} onChange={onPermissionChange} mode="view" />
			</div>
		</div>
	);
}

function EmployeeEditForm({
	employee,
	canDelete,
	onCancel,
	onSave,
	onDelete,
	onPermissionChange,
}: {
	employee: Employee & { permissions: EmployeePermissions };
	canDelete: boolean;
	onCancel: () => void;
	onSave: (form: EmployeeFormState) => void;
	onDelete: () => void;
	onPermissionChange: (module: PermissionModuleKey, level: PermissionLevel) => void;
}) {
	const [form, setForm] = useState<EmployeeFormState>({
		firstName: employee.firstName,
		lastName: employee.lastName,
		patronymic: employee.patronymic,
		position: employee.position,
		role: employee.role,
		phone: employee.phone,
	});

	const isDirty = (Object.keys(form) as (keyof EmployeeFormState)[]).some((k) => form[k] !== employee[k]);
	const canSave = isDirty && form.firstName.trim() !== "" && form.lastName.trim() !== "" && form.position.trim() !== "";

	function update<K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]) {
		setForm((p) => ({ ...p, [key]: value }));
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<FormFieldRow label="Фамилия">
					<Input
						value={form.lastName}
						onChange={(e) => update("lastName", e.target.value)}
						aria-label="Фамилия"
						spellCheck={false}
						autoComplete="family-name"
						required
					/>
				</FormFieldRow>
				<FormFieldRow label="Имя">
					<Input
						value={form.firstName}
						onChange={(e) => update("firstName", e.target.value)}
						aria-label="Имя"
						spellCheck={false}
						autoComplete="given-name"
						required
					/>
				</FormFieldRow>
				<FormFieldRow label="Отчество">
					<Input
						value={form.patronymic}
						onChange={(e) => update("patronymic", e.target.value)}
						aria-label="Отчество"
						spellCheck={false}
						autoComplete="off"
					/>
				</FormFieldRow>
			</div>
			<FormFieldRow label="Должность">
				<Input
					value={form.position}
					onChange={(e) => update("position", e.target.value)}
					aria-label="Должность"
					spellCheck={false}
					autoComplete="off"
					required
				/>
			</FormFieldRow>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<FormFieldRow label="Роль">
					<Select value={form.role} onValueChange={(v) => update("role", v as EmployeeRole)}>
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
				</FormFieldRow>
				<FormFieldRow label="Телефон">
					<PhoneInput value={form.phone} onChange={(v) => update("phone", v)} aria-label="Телефон" />
				</FormFieldRow>
			</div>
			<FormFieldRow label="Электронная почта">
				<Input
					value={employee.email}
					readOnly
					aria-label="Электронная почта"
					className="bg-muted/40 text-muted-foreground"
					autoComplete="email"
				/>
			</FormFieldRow>

			<div className="flex flex-col gap-2 border-t border-border/70 pt-3">
				<h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Права доступа</h4>
				<PermissionsMatrix permissions={employee.permissions} onChange={onPermissionChange} mode="edit" />
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
					<Button type="button" variant="outline" size="sm" onClick={onCancel}>
						Отмена
					</Button>
					<Button type="button" size="sm" disabled={!canSave} onClick={() => onSave(form)}>
						Сохранить
					</Button>
				</div>
			</div>
		</div>
	);
}

function EmployeeViewRow({ label, value, numeric }: { label: string; value: string; numeric?: boolean }) {
	return (
		<div className="flex flex-col gap-0.5">
			<dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
			<dd className={cn("text-sm", numeric && "tabular-nums")}>
				{value || <span className="text-muted-foreground/50">—</span>}
			</dd>
		</div>
	);
}
