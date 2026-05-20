import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { CreateCompanyPayload } from "@/data/domains/companies";
import { cn } from "@/lib/utils";
import { SURFACE_TINT } from "./create-procurement-inquiry-drawer";

interface AddressFormState {
	key: string;
	name: string;
	address: string;
	phone: string;
}

interface CompanyFormState {
	name: string;
	inn: string;
	website: string;
	additionalComments: string;
}

const EMPTY_COMPANY: CompanyFormState = {
	name: "",
	inn: "",
	website: "",
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
	const [submitAttempted, setSubmitAttempted] = useState(false);

	const companyNameMissing = company.name.trim() === "";
	const addressMissingByKey = new Map(addresses.map((a) => [a.key, a.address.trim() === ""]));
	const hasValidAddress = addresses.some((a) => a.address.trim() !== "");

	const showCompanyNameError = submitAttempted && companyNameMissing;

	function handleSubmit() {
		setSubmitAttempted(true);
		if (companyNameMissing) return;
		if (!hasValidAddress) return;

		const primary = addresses.find((a) => a.address.trim() !== "") ?? addresses[0];
		onSubmit({
			name: company.name.trim(),
			inn: company.inn.trim() || undefined,
			website: company.website || undefined,
			additionalComments: company.additionalComments || undefined,
			address: {
				name: primary.name.trim(),
				address: primary.address.trim(),
				phone: primary.phone,
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
		setAddresses((prev) => [...prev, makeEmptyAddress()]);
	}

	function removeAddress(key: string) {
		setAddresses((prev) => prev.filter((a) => a.key !== key));
	}

	return (
		<>
			<SheetHeader className={cn("border-b pb-4", SURFACE_TINT)}>
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
								aria-invalid={showCompanyNameError || undefined}
								className={cn(showCompanyNameError && "border-destructive")}
							/>
						</FieldRow>
						<FieldRow label="ИНН">
							<Input
								value={company.inn}
								onChange={(e) => updateCompany("inn", e.target.value)}
								aria-label="ИНН"
								placeholder="7701234567"
								inputMode="numeric"
								maxLength={12}
								spellCheck={false}
								autoComplete="off"
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
						{addresses.map((addr, i) => {
							const showAddrError = submitAttempted && (addressMissingByKey.get(addr.key) ?? false);
							return (
								<div
									key={addr.key}
									data-testid={`address-row-${i}`}
									className={cn(
										"rounded-lg border border-border p-3",
										SURFACE_TINT,
										"[&_input]:bg-background dark:[&_input]:bg-input/30",
									)}
								>
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
										<Input
											className={cn(showAddrError && "border-destructive")}
											placeholder="Адрес *"
											value={addr.address}
											onChange={(e) => updateAddress(addr.key, "address", e.target.value)}
											aria-label="Адрес"
											aria-invalid={showAddrError || undefined}
											spellCheck={false}
											autoComplete="off"
										/>
										<Input
											placeholder="Название"
											value={addr.name}
											onChange={(e) => updateAddress(addr.key, "name", e.target.value)}
											aria-label="Название адреса"
											spellCheck={false}
											autoComplete="off"
										/>
										<PhoneInput
											value={addr.phone}
											onChange={(v) => updateAddress(addr.key, "phone", v)}
											aria-label="Телефон контактного лица"
											placeholder="Телефон контактного лица"
										/>
									</div>
								</div>
							);
						})}

						<Button type="button" variant="outline" size="sm" className="self-start" onClick={addAddress}>
							<Plus aria-hidden="true" />
							Добавить адрес
						</Button>
					</section>
				</div>
			</div>

			<SheetFooter className={cn("sticky bottom-0 flex-row justify-between border-t", SURFACE_TINT)}>
				<Button type="button" variant="ghost" onClick={onCancel}>
					Отмена
				</Button>
				<Button type="button" disabled={isPending} onClick={handleSubmit}>
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
