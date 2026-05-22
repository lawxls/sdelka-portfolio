import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { CardGrid, FieldCard, DetailSection as Section, ValueText } from "@/components/detail-section";
import { PermissionsMatrix } from "@/components/permissions-matrix";
import { PhoneInput } from "@/components/phone-input";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { UpdatePermissionsData, WorkspaceEmployeeDetail } from "@/data/domains/workspace-employees";
import { validateNames } from "@/data/name-validation";
import type { EmployeeRole, PermissionLevel, PermissionModuleKey } from "@/data/types";
import { ASSIGNABLE_ROLES, PERMISSION_MODULE_KEYS, ROLE_LABELS } from "@/data/types";
import { useMe } from "@/data/use-me";
import {
	useUpdateWorkspaceEmployee,
	useUpdateWorkspaceEmployeePermissions,
	useWorkspaceEmployeeDetail,
} from "@/data/use-workspace-employees";
import { formatFullName, formatPhone, formatRegistrationDate } from "@/lib/format";

type DrawerTab = "info" | "permissions";

const TABS: { key: DrawerTab; label: string }[] = [
	{ key: "info", label: "Информация" },
	{ key: "permissions", label: "Права доступа" },
];

export function EmployeeDetailDrawer() {
	const [searchParams, setSearchParams] = useSearchParams();
	const employeeId = searchParams.get("employee");
	const open = employeeId != null;

	function handleClose() {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete("employee");
				return next;
			},
			{ replace: true },
		);
	}

	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (!next) handleClose();
			}}
		>
			<SheetContent
				className="flex flex-col max-md:!w-full max-md:!max-w-full max-md:!inset-0 max-md:!rounded-none"
				closeButtonVariant="floating"
			>
				{employeeId != null && <EmployeeDetailContent key={employeeId} employeeId={employeeId} />}
			</SheetContent>
		</Sheet>
	);
}

function EmployeeDetailContent({ employeeId }: { employeeId: string }) {
	const [activeTab, setActiveTab] = useState<DrawerTab>("info");
	const { employee, isLoading, error } = useWorkspaceEmployeeDetail(employeeId);
	const updatePermsMutation = useUpdateWorkspaceEmployeePermissions();
	const { data: me } = useMe();
	const canEdit = me?.role === "admin";

	if (isLoading) {
		return (
			<div className="flex flex-1 items-center justify-center" data-testid="employee-drawer-loading">
				<LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-label="Загрузка…" />
			</div>
		);
	}

	if (error || !employee) {
		return (
			<div
				className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground"
				data-testid="employee-drawer-error"
			>
				<p className="text-sm">Не удалось загрузить сотрудника</p>
			</div>
		);
	}

	const fullName = formatFullName(employee.lastName, employee.firstName, employee.patronymic);

	function handlePermissionChange(module: PermissionModuleKey, level: PermissionLevel) {
		if (!canEdit) return;
		updatePermsMutation.mutate({ id: employeeId, data: { [module]: level } });
	}

	function handlePermissionSetAll(level: PermissionLevel) {
		if (!canEdit) return;
		const data = Object.fromEntries(PERMISSION_MODULE_KEYS.map((k) => [k, level])) as UpdatePermissionsData;
		updatePermsMutation.mutate({ id: employeeId, data });
	}

	return (
		<>
			<SheetHeader>
				<SheetTitle data-testid="employee-drawer-title">{fullName || "Без имени"}</SheetTitle>
				<SheetDescription className="sr-only">Детали сотрудника</SheetDescription>
			</SheetHeader>

			<div className="flex gap-0 overflow-x-auto border-b border-border px-4" role="tablist">
				{TABS.map((tab) => (
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
						onClick={() => setActiveTab(tab.key)}
						data-testid={`employee-tab-${tab.key}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div className="flex-1 overflow-y-auto px-4 py-4">
				{activeTab === "info" && <InfoTab employee={employee} canEdit={canEdit} />}
				{activeTab === "permissions" && (
					<div data-testid="employee-permissions-tab">
						<PermissionsMatrix
							permissions={employee.permissions}
							onChange={handlePermissionChange}
							onSetAll={handlePermissionSetAll}
							mode="edit"
						/>
					</div>
				)}
			</div>
		</>
	);
}

interface InfoFormState {
	firstName: string;
	lastName: string;
	patronymic: string;
	position: string;
	role: EmployeeRole;
	phone: string;
}

function InfoTab({ employee, canEdit }: { employee: WorkspaceEmployeeDetail; canEdit: boolean }) {
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState<InfoFormState>(() => formStateFor(employee));
	const updateMutation = useUpdateWorkspaceEmployee();

	const nameErrors = validateNames(form, { firstName: "firstName", lastName: "lastName", patronymic: "patronymic" });
	const hasNameError = nameErrors !== null;
	const firstNameError = nameErrors?.firstName;
	const lastNameError = nameErrors?.lastName;
	const patronymicError = nameErrors?.patronymic;

	function startEdit() {
		setForm(formStateFor(employee));
		setEditing(true);
	}

	function cancelEdit() {
		setEditing(false);
	}

	const dirty = (Object.keys(form) as (keyof InfoFormState)[]).some((k) => form[k] !== employee[k]);

	function handleSave() {
		if (!dirty) {
			setEditing(false);
			return;
		}
		if (hasNameError) return;
		const data: Partial<InfoFormState> = {};
		for (const key of Object.keys(form) as (keyof InfoFormState)[]) {
			if (form[key] !== employee[key]) (data as Record<string, unknown>)[key] = form[key];
		}
		updateMutation.mutate({ id: employee.id, data }, { onSuccess: () => setEditing(false) });
	}

	const companiesText = employee.companies.length > 0 ? employee.companies.map((c) => c.name).join(", ") : "";
	const registrationText = formatRegistrationDate(employee.registeredAt);

	return (
		<div data-testid="employee-info-tab">
			<Section
				title="Информация о сотруднике"
				editLabel={canEdit ? "Редактировать информацию" : undefined}
				editing={editing}
				onEdit={canEdit ? startEdit : undefined}
				onCancel={cancelEdit}
				onSave={handleSave}
				saveDisabled={!dirty || hasNameError || updateMutation.isPending}
				isPending={updateMutation.isPending}
			>
				<CardGrid>
					<FieldCard label="Фамилия">
						{editing ? (
							<>
								<Input
									aria-label="Фамилия"
									aria-invalid={Boolean(lastNameError) || undefined}
									value={form.lastName}
									onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
									autoComplete="family-name"
									spellCheck={false}
								/>
								{lastNameError && <p className="mt-1 text-xs text-destructive">{lastNameError}</p>}
							</>
						) : (
							<ValueText value={employee.lastName} />
						)}
					</FieldCard>
					<FieldCard label="Имя">
						{editing ? (
							<>
								<Input
									aria-label="Имя"
									aria-invalid={Boolean(firstNameError) || undefined}
									value={form.firstName}
									onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
									autoComplete="given-name"
									spellCheck={false}
								/>
								{firstNameError && <p className="mt-1 text-xs text-destructive">{firstNameError}</p>}
							</>
						) : (
							<ValueText value={employee.firstName} />
						)}
					</FieldCard>
					<FieldCard label="Отчество">
						{editing ? (
							<>
								<Input
									aria-label="Отчество"
									aria-invalid={Boolean(patronymicError) || undefined}
									value={form.patronymic}
									onChange={(e) => setForm((p) => ({ ...p, patronymic: e.target.value }))}
									autoComplete="off"
									spellCheck={false}
								/>
								{patronymicError && <p className="mt-1 text-xs text-destructive">{patronymicError}</p>}
							</>
						) : (
							<ValueText value={employee.patronymic} />
						)}
					</FieldCard>

					<FieldCard label="Должность" span="full">
						{editing ? (
							<Input
								aria-label="Должность"
								value={form.position}
								onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
								autoComplete="off"
								spellCheck={false}
							/>
						) : (
							<ValueText value={employee.position} />
						)}
					</FieldCard>

					<FieldCard label="Роль">
						{editing ? (
							<Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v as EmployeeRole }))}>
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
						) : (
							<ValueText value={ROLE_LABELS[employee.role]} />
						)}
					</FieldCard>
					<FieldCard label="Телефон" span="half">
						{editing ? (
							<PhoneInput
								value={form.phone}
								onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
								aria-label="Телефон"
							/>
						) : (
							<ValueText value={formatPhone(employee.phone)} />
						)}
					</FieldCard>

					<FieldCard label="Электронная почта" span="full">
						<ValueText value={employee.email} />
					</FieldCard>
					<FieldCard label="Компании" span="full">
						<ValueText value={companiesText} />
					</FieldCard>
					<FieldCard label="Дата регистрации">
						<ValueText value={registrationText} />
					</FieldCard>
				</CardGrid>
			</Section>
		</div>
	);
}

function formStateFor(employee: WorkspaceEmployeeDetail): InfoFormState {
	return {
		firstName: employee.firstName,
		lastName: employee.lastName,
		patronymic: employee.patronymic,
		position: employee.position,
		role: employee.role,
		phone: employee.phone,
	};
}
