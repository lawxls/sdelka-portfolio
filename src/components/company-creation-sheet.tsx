import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { CreateCompanyPayload } from "@/data/api-client";
import type { AddressType, EmployeeRole } from "@/data/types";
import { ADDRESS_TYPE_LABELS, ADDRESS_TYPES, ROLE_LABELS, ROLES } from "@/data/types";

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

const EMPTY_ADDRESS: AddressFormState = {
	name: "",
	type: "office",
	postalCode: "",
	address: "",
	city: "",
	region: "",
	contactPerson: "",
	phone: "",
};

const EMPTY_EMPLOYEE: EmployeeFormState = {
	firstName: "",
	lastName: "",
	patronymic: "",
	position: "",
	role: "user",
	phone: "",
	email: "",
	isResponsible: true,
};

interface CompanyCreationSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: CreateCompanyPayload) => void;
	isPending: boolean;
}

export function CompanyCreationSheet({ open, onOpenChange, onSubmit, isPending }: CompanyCreationSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="flex flex-col max-md:!w-full max-md:!max-w-full max-md:!inset-0 max-md:!rounded-none">
				{open && <CreationForm onSubmit={onSubmit} isPending={isPending} />}
			</SheetContent>
		</Sheet>
	);
}

function CreationForm({ onSubmit, isPending }: { onSubmit: (data: CreateCompanyPayload) => void; isPending: boolean }) {
	const [name, setName] = useState("");
	const [address, setAddress] = useState<AddressFormState>(EMPTY_ADDRESS);
	const [employee, setEmployee] = useState<EmployeeFormState>(EMPTY_EMPLOYEE);

	const canSubmit =
		name.trim() !== "" &&
		address.name.trim() !== "" &&
		employee.firstName.trim() !== "" &&
		employee.lastName.trim() !== "";

	function handleSubmit() {
		onSubmit({
			name: name.trim(),
			address: {
				name: address.name,
				type: address.type,
				postalCode: address.postalCode,
				address: address.address,
				city: address.city,
				region: address.region,
				contactPerson: address.contactPerson,
				phone: address.phone,
			},
			employee: {
				firstName: employee.firstName,
				lastName: employee.lastName,
				patronymic: employee.patronymic,
				position: employee.position,
				role: employee.role,
				phone: employee.phone,
				email: employee.email,
				isResponsible: true,
			},
		});
	}

	return (
		<>
			<SheetHeader>
				<SheetTitle>Новая компания</SheetTitle>
				<SheetDescription className="sr-only">Создание новой компании</SheetDescription>
			</SheetHeader>

			<div className="flex-1 overflow-y-auto px-4" data-testid="creation-form">
				<div className="flex flex-col gap-4 py-4">
					<div className="flex flex-col gap-3">
						<h3 className="text-sm font-medium text-muted-foreground">Компания</h3>
						<FieldRow label="Название">
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								aria-label="Название компании"
								spellCheck={false}
								autoComplete="off"
							/>
						</FieldRow>
					</div>

					<Separator />

					<div className="flex flex-col gap-3">
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-medium text-muted-foreground">Адрес</h3>
							<Badge variant="secondary" className="text-[10px]">
								Обязательно
							</Badge>
						</div>
						<AddressFields form={address} onChange={setAddress} />
					</div>

					<Separator />

					<div className="flex flex-col gap-3">
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-medium text-muted-foreground">Ответственный сотрудник</h3>
							<Badge variant="secondary" className="text-[10px]">
								Обязательно
							</Badge>
						</div>
						<EmployeeFields form={employee} onChange={setEmployee} />
					</div>
				</div>
			</div>

			<div className="sticky bottom-0 flex justify-end border-t border-border bg-popover px-4 py-3">
				<Button type="button" disabled={!canSubmit || isPending} onClick={handleSubmit}>
					{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
					Создать компанию
				</Button>
			</div>
		</>
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

function AddressFields({ form, onChange }: { form: AddressFormState; onChange: (f: AddressFormState) => void }) {
	function update(field: keyof AddressFormState, value: string) {
		onChange({ ...form, [field]: value });
	}

	return (
		<>
			<FieldRow label="Название">
				<Input
					value={form.name}
					onChange={(e) => update("name", e.target.value)}
					aria-label="Название адреса"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Тип">
				<Select value={form.type} onValueChange={(v) => update("type", v)}>
					<SelectTrigger aria-label="Тип адреса">
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
					aria-label="Телефон адреса"
					spellCheck={false}
					autoComplete="off"
					inputMode="tel"
				/>
			</FieldRow>
		</>
	);
}

function EmployeeFields({ form, onChange }: { form: EmployeeFormState; onChange: (f: EmployeeFormState) => void }) {
	function update(field: keyof EmployeeFormState, value: string | boolean) {
		onChange({ ...form, [field]: value });
	}

	return (
		<>
			<FieldRow label="Фамилия">
				<Input
					value={form.lastName}
					onChange={(e) => update("lastName", e.target.value)}
					aria-label="Фамилия сотрудника"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Имя">
				<Input
					value={form.firstName}
					onChange={(e) => update("firstName", e.target.value)}
					aria-label="Имя сотрудника"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Отчество">
				<Input
					value={form.patronymic}
					onChange={(e) => update("patronymic", e.target.value)}
					aria-label="Отчество сотрудника"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Должность">
				<Input
					value={form.position}
					onChange={(e) => update("position", e.target.value)}
					aria-label="Должность сотрудника"
					spellCheck={false}
					autoComplete="off"
				/>
			</FieldRow>
			<FieldRow label="Роль">
				<Select value={form.role} onValueChange={(v) => update("role", v)}>
					<SelectTrigger aria-label="Роль сотрудника">
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
					aria-label="Телефон сотрудника"
					spellCheck={false}
					autoComplete="off"
					inputMode="tel"
				/>
			</FieldRow>
			<FieldRow label="Электронная почта">
				<Input
					value={form.email}
					onChange={(e) => update("email", e.target.value)}
					aria-label="Электронная почта сотрудника"
					spellCheck={false}
					autoComplete="off"
					inputMode="email"
				/>
			</FieldRow>
			<div className="flex items-center gap-2">
				<Checkbox id="creation-responsible" checked={form.isResponsible} disabled aria-label="Ответственный" />
				<label htmlFor="creation-responsible" className="text-sm text-muted-foreground">
					Ответственный (первый сотрудник всегда ответственный)
				</label>
			</div>
		</>
	);
}
