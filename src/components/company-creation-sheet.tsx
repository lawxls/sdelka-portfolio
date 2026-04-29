import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { CreateCompanyPayload } from "@/data/domains/companies";
import { cn } from "@/lib/utils";

interface AddressFormState {
	key: string;
	name: string;
	address: string;
	phone: string;
}

interface CompanyFormState {
	name: string;
	website: string;
	description: string;
	additionalComments: string;
}

const EMPTY_COMPANY: CompanyFormState = {
	name: "",
	website: "",
	description: "",
	additionalComments: "",
};

function makeEmptyAddress(): AddressFormState {
	return { key: crypto.randomUUID(), name: "", address: "", phone: "" };
}

interface CompanyCreationSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: CreateCompanyPayload) => void;
	isPending: boolean;
}

export function CompanyCreationSheet({ open, onOpenChange, onSubmit, isPending }: CompanyCreationSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				showCloseButton={false}
				className="flex flex-col gap-0 max-md:!w-full max-md:!max-w-full max-md:!inset-0 max-md:!rounded-none"
			>
				{open && <CreationForm onSubmit={onSubmit} onCancel={() => onOpenChange(false)} isPending={isPending} />}
			</SheetContent>
		</Sheet>
	);
}

function CreationForm({
	onSubmit,
	onCancel,
	isPending,
}: {
	onSubmit: (data: CreateCompanyPayload) => void;
	onCancel: () => void;
	isPending: boolean;
}) {
	const [company, setCompany] = useState<CompanyFormState>(EMPTY_COMPANY);
	const [addresses, setAddresses] = useState<AddressFormState[]>(() => [makeEmptyAddress()]);
	const [validatedKeys, setValidatedKeys] = useState<Set<string>>(() => new Set());

	const canSubmit =
		company.name.trim() !== "" && addresses.some((a) => a.name.trim() !== "" && a.address.trim() !== "");

	function handleSubmit() {
		const validAddresses = addresses.filter((a) => a.name.trim() !== "" && a.address.trim() !== "");
		if (validAddresses.length === 0) return;

		onSubmit({
			name: company.name.trim(),
			website: company.website || undefined,
			description: company.description || undefined,
			additionalComments: company.additionalComments || undefined,
			address: {
				name: validAddresses[0].name,
				address: validAddresses[0].address,
				phone: validAddresses[0].phone,
			},
		});
	}

	function updateCompany(field: keyof CompanyFormState, value: string) {
		setCompany((prev) => ({ ...prev, [field]: value }));
	}

	function updateAddress(key: string, field: keyof Omit<AddressFormState, "key">, value: string) {
		setAddresses((prev) => prev.map((a) => (a.key === key ? { ...a, [field]: value } : a)));
	}

	function addAddress() {
		const invalid = addresses.filter((a) => a.name.trim() === "" || a.address.trim() === "");
		if (invalid.length > 0) {
			setValidatedKeys((prev) => {
				const next = new Set(prev);
				for (const a of invalid) next.add(a.key);
				return next;
			});
			return;
		}
		setAddresses((prev) => [...prev, makeEmptyAddress()]);
	}

	function removeAddress(key: string) {
		setAddresses((prev) => prev.filter((a) => a.key !== key));
	}

	return (
		<>
			<SheetHeader className="border-b pb-4">
				<SheetTitle>Новая компания</SheetTitle>
				<SheetDescription className="sr-only">Создание новой компании</SheetDescription>
			</SheetHeader>

			<div className="flex-1 overflow-y-auto px-4" data-testid="creation-form">
				<div className="flex flex-col gap-6 py-4">
					<section className="flex flex-col gap-3">
						<h3 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Основная информация
						</h3>
						<FieldRow label="Название *">
							<Input
								value={company.name}
								onChange={(e) => updateCompany("name", e.target.value)}
								aria-label="Название компании"
								placeholder="ООО «Ромашка»"
								spellCheck={false}
								autoComplete="off"
								autoFocus
							/>
						</FieldRow>
						<FieldRow label="Сайт">
							<Input
								value={company.website}
								onChange={(e) => updateCompany("website", e.target.value)}
								aria-label="Сайт"
								placeholder="example.ru"
								spellCheck={false}
								autoComplete="off"
							/>
						</FieldRow>
						<FieldRow label="Описание">
							<Textarea
								value={company.description}
								onChange={(e) => updateCompany("description", e.target.value)}
								aria-label="Описание"
								placeholder="Оптовый поставщик мебели для офисов"
								rows={2}
							/>
						</FieldRow>
						<FieldRow label="Дополнительные комментарии для агента">
							<Textarea
								value={company.additionalComments}
								onChange={(e) => updateCompany("additionalComments", e.target.value)}
								aria-label="Дополнительные комментарии для агента"
								placeholder="Работаем по предоплате, доставка только по будням"
								rows={2}
							/>
						</FieldRow>
					</section>

					<section className="flex flex-col gap-3">
						<h3 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Адреса компании
						</h3>
						{addresses.map((addr, i) => (
							<div key={addr.key} data-testid={`address-row-${i}`} className="rounded-lg border border-border p-3">
								<div className="mb-2 flex items-center justify-between">
									<span className="text-sm font-medium text-muted-foreground">Адрес {i + 1}</span>
									{addresses.length > 1 && (
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											onClick={() => removeAddress(addr.key)}
											aria-label="Удалить адрес"
										>
											<Trash2 aria-hidden="true" />
										</Button>
									)}
								</div>
								<div className="flex flex-col gap-2">
									{(() => {
										const showErrors = validatedKeys.has(addr.key);
										const nameError = showErrors && addr.name.trim() === "";
										const addrError = showErrors && addr.address.trim() === "";
										return (
											<>
												<Input
													className={cn(nameError && "border-destructive")}
													placeholder="Название *"
													value={addr.name}
													onChange={(e) => updateAddress(addr.key, "name", e.target.value)}
													aria-label="Название адреса"
													aria-invalid={nameError || undefined}
													spellCheck={false}
													autoComplete="off"
												/>
												<Input
													className={cn(addrError && "border-destructive")}
													placeholder="Адрес *"
													value={addr.address}
													onChange={(e) => updateAddress(addr.key, "address", e.target.value)}
													aria-label="Адрес"
													aria-invalid={addrError || undefined}
													spellCheck={false}
													autoComplete="off"
												/>
											</>
										);
									})()}
									<PhoneInput
										value={addr.phone}
										onChange={(v) => updateAddress(addr.key, "phone", v)}
										aria-label="Телефон контактного лица"
										placeholder="Телефон контактного лица"
									/>
								</div>
							</div>
						))}

						<Button type="button" variant="outline" size="sm" className="self-start" onClick={addAddress}>
							<Plus aria-hidden="true" />
							Добавить адрес
						</Button>
					</section>
				</div>
			</div>

			<SheetFooter className="sticky bottom-0 flex-row justify-between border-t bg-background">
				<Button type="button" variant="ghost" onClick={onCancel}>
					Отмена
				</Button>
				<Button type="button" disabled={!canSubmit || isPending} onClick={handleSubmit}>
					{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
					Создать компанию
				</Button>
			</SheetFooter>
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
