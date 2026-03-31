import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { CreateCompanyPayload } from "@/data/api-client";
import type { AddressType } from "@/data/types";
import { ADDRESS_TYPE_LABELS, ADDRESS_TYPES } from "@/data/types";
import { cn } from "@/lib/utils";

interface AddressFormState {
	key: string;
	name: string;
	type: AddressType;
	postalCode: string;
	address: string;
	contactPerson: string;
	phone: string;
}

interface CompanyFormState {
	name: string;
	industry: string;
	website: string;
	description: string;
	preferredPayment: string;
	preferredDelivery: string;
	additionalComments: string;
}

const EMPTY_COMPANY: CompanyFormState = {
	name: "",
	industry: "",
	website: "",
	description: "",
	preferredPayment: "",
	preferredDelivery: "",
	additionalComments: "",
};

function makeEmptyAddress(): AddressFormState {
	return {
		key: crypto.randomUUID(),
		name: "",
		type: "office",
		postalCode: "",
		address: "",
		contactPerson: "",
		phone: "",
	};
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

	const canSubmit = company.name.trim() !== "" && addresses.some((a) => a.name.trim() !== "");

	function handleSubmit() {
		const validAddresses = addresses.filter((a) => a.name.trim() !== "");
		if (validAddresses.length === 0) return;

		onSubmit({
			name: company.name.trim(),
			industry: company.industry || undefined,
			website: company.website || undefined,
			description: company.description || undefined,
			preferredPayment: company.preferredPayment || undefined,
			preferredDelivery: company.preferredDelivery || undefined,
			additionalComments: company.additionalComments || undefined,
			address: {
				name: validAddresses[0].name,
				type: validAddresses[0].type,
				postalCode: validAddresses[0].postalCode,
				address: validAddresses[0].address,
				contactPerson: validAddresses[0].contactPerson,
				phone: validAddresses[0].phone,
			},
		});
	}

	function updateCompany(field: keyof CompanyFormState, value: string) {
		setCompany((prev) => ({ ...prev, [field]: value }));
	}

	const [validatedKeys, setValidatedKeys] = useState<Set<string>>(() => new Set());

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
								spellCheck={false}
								autoComplete="off"
								autoFocus
							/>
						</FieldRow>
						<FieldRow label="Отрасль">
							<Input
								value={company.industry}
								onChange={(e) => updateCompany("industry", e.target.value)}
								aria-label="Отрасль"
								spellCheck={false}
								autoComplete="off"
							/>
						</FieldRow>
						<FieldRow label="Сайт">
							<Input
								value={company.website}
								onChange={(e) => updateCompany("website", e.target.value)}
								aria-label="Сайт"
								spellCheck={false}
								autoComplete="off"
							/>
						</FieldRow>
						<FieldRow label="Описание">
							<Textarea
								value={company.description}
								onChange={(e) => updateCompany("description", e.target.value)}
								aria-label="Описание"
								rows={2}
							/>
						</FieldRow>
					</section>

					<section className="flex flex-col gap-3">
						<h3 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Дополнительная информация для агента
						</h3>
						<FieldRow label="Предпочтительная оплата">
							<Input
								value={company.preferredPayment}
								onChange={(e) => updateCompany("preferredPayment", e.target.value)}
								aria-label="Предпочтительная оплата"
								spellCheck={false}
								autoComplete="off"
							/>
						</FieldRow>
						<FieldRow label="Предпочтительная доставка">
							<Input
								value={company.preferredDelivery}
								onChange={(e) => updateCompany("preferredDelivery", e.target.value)}
								aria-label="Предпочтительная доставка"
								spellCheck={false}
								autoComplete="off"
							/>
						</FieldRow>
						<FieldRow label="Дополнительные комментарии">
							<Textarea
								value={company.additionalComments}
								onChange={(e) => updateCompany("additionalComments", e.target.value)}
								aria-label="Дополнительные комментарии"
								rows={2}
							/>
						</FieldRow>
					</section>

					{/* Address cards */}
					<div className="flex flex-col gap-3 mt-2">
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
												<div className="flex gap-2">
													<Input
														className={cn("flex-1", nameError && "border-destructive")}
														placeholder="Название *"
														value={addr.name}
														onChange={(e) => updateAddress(addr.key, "name", e.target.value)}
														aria-label="Название адреса"
														aria-invalid={nameError || undefined}
														spellCheck={false}
														autoComplete="off"
													/>
													<Select value={addr.type} onValueChange={(v) => updateAddress(addr.key, "type", v)}>
														<SelectTrigger aria-label="Тип адреса" className="w-36 shrink-0">
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
												</div>
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
									<Input
										placeholder="Индекс"
										value={addr.postalCode}
										onChange={(e) => updateAddress(addr.key, "postalCode", e.target.value)}
										aria-label="Индекс"
										spellCheck={false}
										autoComplete="off"
									/>
									<Input
										placeholder="Контактное лицо"
										value={addr.contactPerson}
										onChange={(e) => updateAddress(addr.key, "contactPerson", e.target.value)}
										aria-label="Контактное лицо"
										spellCheck={false}
										autoComplete="off"
									/>
									<Input
										placeholder="Телефон"
										value={addr.phone}
										onChange={(e) => updateAddress(addr.key, "phone", e.target.value)}
										aria-label="Телефон адреса"
										spellCheck={false}
										autoComplete="off"
										inputMode="tel"
									/>
								</div>
							</div>
						))}

						<Button type="button" variant="outline" size="sm" onClick={addAddress}>
							<Plus aria-hidden="true" />
							Добавить адрес
						</Button>
					</div>
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
