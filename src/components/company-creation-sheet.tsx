import { AlertCircle, Building2, LoaderCircle, Mail, MapPin, Plus, RotateCw, Trash2, User } from "lucide-react";
import { useState } from "react";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyLookup, CreateCompanyPayload } from "@/data/domains/companies";
import { isValidCompanyInnLength, useCompanyLookupByInn } from "@/data/use-company-detail";
import { SURFACE_TINT } from "@/lib/class-presets";
import { digitsOnly } from "@/lib/format";
import { cn } from "@/lib/utils";

const INN_MAX_LEN = 12;
const LEGAL_ADDRESS_LABEL = "Юридический адрес";

interface AddressFormState {
	key: string;
	name: string;
	address: string;
	phone: string;
	/** Legal-address card (seeded from DaData). No phone field; pinned at index 0
	 * so it's marked `isMain` on submit. Editable like any other card. */
	legal: boolean;
}

function makeLegalAddress(address: string): AddressFormState {
	return { key: crypto.randomUUID(), name: LEGAL_ADDRESS_LABEL, address, phone: "", legal: true };
}

function makeAdditionalAddress(): AddressFormState {
	return { key: crypto.randomUUID(), name: "", address: "", phone: "", legal: false };
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
	const [inn, setInn] = useState("");
	const lookup = useCompanyLookupByInn(inn);
	const innValidLength = isValidCompanyInnLength(inn);
	const isFetching = innValidLength && lookup.isFetching;
	const matched = !isFetching && lookup.data != null ? lookup.data : null;
	const isMiss = innValidLength && lookup.isFetched && lookup.data === null && !lookup.isError;
	const isError = innValidLength && lookup.isError;
	const isDuplicate = matched != null && matched.existing != null;
	const showMatchedForm = matched != null && !isDuplicate;

	function handleInnChange(next: string) {
		setInn(digitsOnly(next).slice(0, INN_MAX_LEN));
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
						<SectionHeader>Основная информация</SectionHeader>
						<FieldRow label="ИНН *" htmlFor="creation-inn">
							<Input
								id="creation-inn"
								value={inn}
								onChange={(e) => handleInnChange(e.target.value)}
								aria-label="ИНН"
								placeholder="7707083893"
								inputMode="numeric"
								maxLength={INN_MAX_LEN}
								spellCheck={false}
								autoComplete="off"
								autoFocus
								className="tabular-nums"
							/>
						</FieldRow>

						<IdentityCard
							innValidLength={innValidLength}
							isFetching={isFetching}
							matched={matched}
							isMiss={isMiss}
							isError={isError}
							onRetry={() => lookup.refetch()}
						/>
					</section>

					{showMatchedForm && matched && (
						// Keyed on the matched INN so changing the INN (which throws away
						// the lookup) remounts the form with a fresh legal-address card —
						// no useEffect needed to sync DaData → form state.
						<MatchedForm key={matched.inn} matched={matched} onSubmitAttempt={onSubmit} />
					)}
				</div>
			</div>

			<SheetFooter className={cn("sticky bottom-0 flex-row justify-between border-t", SURFACE_TINT)}>
				<Button type="button" variant="ghost" onClick={onCancel}>
					Отмена
				</Button>
				{/* Submit is type=submit + form="company-creation-form" so the
				    MatchedForm's onSubmit fires. When no lookup match exists,
				    no form to associate with — render as inert button. */}
				<Button type="submit" form="company-creation-form" disabled={!showMatchedForm || isPending}>
					{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
					Создать компанию
				</Button>
			</SheetFooter>
		</>
	);
}

function MatchedForm({
	matched,
	onSubmitAttempt,
}: {
	matched: CompanyLookup;
	onSubmitAttempt: (payload: CreateCompanyPayload) => void;
}) {
	const [website, setWebsite] = useState("");
	const [additionalComments, setAdditionalComments] = useState("");
	const [addresses, setAddresses] = useState<AddressFormState[]>(() => [makeLegalAddress(matched.address)]);
	const [submitAttempted, setSubmitAttempted] = useState(false);

	const hasValidAddress = addresses.some((a) => a.address.trim() !== "");
	const addressErrorByKey = new Map(addresses.map((a) => [a.key, a.address.trim() === ""]));

	function updateAddress(key: string, field: "name" | "address" | "phone", value: string) {
		setAddresses((prev) => prev.map((a) => (a.key === key ? { ...a, [field]: value } : a)));
	}

	function addAdditionalAddress() {
		setAddresses((prev) => [...prev, makeAdditionalAddress()]);
	}

	function removeAddress(key: string) {
		setAddresses((prev) => prev.filter((a) => a.key !== key));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitAttempted(true);
		if (!hasValidAddress) return;
		const payloadAddresses = addresses
			.filter((a) => a.address.trim() !== "")
			.map((a, i) => ({
				name: a.name.trim(),
				address: a.address.trim(),
				phone: a.phone.trim(),
				isMain: i === 0,
			}));
		onSubmitAttempt({
			name: matched.shortName || matched.fullName,
			shortName: matched.shortName,
			inn: matched.inn,
			kpp: matched.kpp,
			ogrn: matched.ogrn,
			directorName: matched.directorName,
			website: website.trim(),
			additionalComments: additionalComments.trim() || undefined,
			addresses: payloadAddresses,
		});
	}

	return (
		<form id="company-creation-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
			<section className="flex flex-col gap-3">
				<SectionHeader>Дополнительно</SectionHeader>
				<FieldRow label="Сайт" htmlFor="creation-website">
					<Input
						id="creation-website"
						value={website}
						onChange={(e) => setWebsite(e.target.value)}
						aria-label="Сайт"
						placeholder="example.ru"
						spellCheck={false}
						autoComplete="url"
						inputMode="url"
					/>
				</FieldRow>
				<FieldRow label="Дополнительные комментарии для агента" htmlFor="creation-comments">
					<Textarea
						id="creation-comments"
						value={additionalComments}
						onChange={(e) => setAdditionalComments(e.target.value)}
						aria-label="Дополнительные комментарии для агента"
						placeholder="Работаем по предоплате, доставка только по будням"
						rows={2}
					/>
				</FieldRow>
			</section>

			<section className="flex flex-col gap-3">
				<SectionHeader>Адреса компании</SectionHeader>
				{addresses.map((addr, i) => {
					const showAddrError = submitAttempted && (addressErrorByKey.get(addr.key) ?? false);
					return (
						<AddressCard
							key={addr.key}
							index={i}
							addr={addr}
							showError={showAddrError}
							canRemove={!addr.legal && addresses.length > 1}
							onChange={(field, value) => updateAddress(addr.key, field, value)}
							onRemove={() => removeAddress(addr.key)}
						/>
					);
				})}
				<Button type="button" variant="outline" size="sm" className="self-start" onClick={addAdditionalAddress}>
					<Plus aria-hidden="true" />
					Добавить адрес
				</Button>
				{submitAttempted && !hasValidAddress && (
					<p role="alert" className="text-sm text-destructive">
						Укажите хотя&nbsp;бы один адрес.
					</p>
				)}
			</section>
		</form>
	);
}

function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<h3 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
			{children}
		</h3>
	);
}

function FieldRow({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			{htmlFor ? (
				<label htmlFor={htmlFor} className="text-xs text-muted-foreground">
					{label}
				</label>
			) : (
				<span className="text-xs text-muted-foreground">{label}</span>
			)}
			{children}
		</div>
	);
}

function IdentityCard({
	innValidLength,
	isFetching,
	matched,
	isMiss,
	isError,
	onRetry,
}: {
	innValidLength: boolean;
	isFetching: boolean;
	matched: CompanyLookup | null;
	isMiss: boolean;
	isError: boolean;
	onRetry: () => void;
}) {
	if (isError) {
		return (
			<div
				data-testid="lookup-error"
				role="alert"
				className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3.5"
			>
				<div className="flex items-start gap-2">
					<AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
					<p className="text-sm text-foreground">Не&nbsp;удалось получить данные по&nbsp;ИНН. Попробуйте ещё раз.</p>
				</div>
				<Button type="button" variant="outline" size="sm" className="self-start" onClick={onRetry}>
					<RotateCw aria-hidden="true" className="size-4" />
					Повторить
				</Button>
			</div>
		);
	}

	if (matched?.existing) {
		return (
			<div
				data-testid="lookup-duplicate"
				role="alert"
				className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
			>
				<AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
				<p className="text-pretty">
					Компания с&nbsp;этим ИНН уже&nbsp;существует: <span className="font-medium">{matched.existing.name}</span>
				</p>
			</div>
		);
	}

	if (isFetching) {
		return (
			<div
				role="status"
				aria-live="polite"
				data-testid="lookup-loading"
				className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/40 p-3.5 animate-in fade-in-0 duration-150 motion-reduce:animate-none"
			>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<LoaderCircle aria-hidden="true" className="size-4 animate-spin text-primary motion-reduce:animate-none" />
					<span>Ищем компанию по&nbsp;ИНН…</span>
				</div>
				<IdentityPlaceholders />
			</div>
		);
	}

	if (matched) {
		return (
			<section
				aria-label="Найденная компания"
				data-testid="lookup-matched"
				className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3.5 shadow-xs animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none"
			>
				<div className="flex items-start gap-2">
					<Building2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
					<h4 className="text-sm font-semibold leading-snug text-foreground text-balance break-words">
						{matched.shortName || matched.fullName || "Без названия"}
					</h4>
				</div>
				<ul className="flex flex-col gap-1.5">
					<IdentityRow icon={User} label="Генеральный директор" value={matched.directorName} />
					<IdentityRow icon={Mail} label="ОГРН" value={matched.ogrn} numeric />
					<IdentityRow icon={MapPin} label="КПП" value={matched.kpp} numeric />
				</ul>
			</section>
		);
	}

	if (isMiss) {
		return (
			<div
				data-testid="lookup-miss"
				role="note"
				className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
			>
				<AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
				<p className="text-pretty">Компания с&nbsp;этим ИНН не&nbsp;найдена.</p>
			</div>
		);
	}

	return (
		<div
			data-testid="lookup-empty"
			className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3.5"
		>
			<div className="flex items-start gap-2">
				<Building2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
				<h4 className="text-sm font-medium leading-snug text-foreground/80 text-balance">
					{innValidLength ? "Ищем компанию по ИНН…" : "Данные подставятся автоматически"}
				</h4>
			</div>
			<IdentityPlaceholders />
		</div>
	);
}

function IdentityPlaceholders() {
	return (
		<ul className="flex flex-col gap-1.5">
			<PlaceholderRow icon={Building2} hint="Наименование" />
			<PlaceholderRow icon={User} hint="Генеральный директор" />
			<PlaceholderRow icon={Mail} hint="ОГРН" />
			<PlaceholderRow icon={MapPin} hint="КПП" />
		</ul>
	);
}

function PlaceholderRow({
	icon: Icon,
	hint,
}: {
	icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	hint: string;
}) {
	return (
		<li className="flex items-start gap-2 text-sm leading-snug">
			<Icon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
			<span className="text-muted-foreground/70">{hint}</span>
		</li>
	);
}

function IdentityRow({
	icon: Icon,
	label,
	value,
	numeric,
}: {
	icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	label: string;
	value: string;
	numeric?: boolean;
}) {
	const empty = value.trim() === "";
	return (
		<li className="flex items-start gap-2 text-sm leading-snug">
			<Icon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
			<span className="sr-only">{label}: </span>
			{empty ? (
				<span className="text-muted-foreground">—</span>
			) : (
				<span className={cn("text-foreground break-words", numeric && "tabular-nums")}>{value}</span>
			)}
		</li>
	);
}

function AddressCard({
	index,
	addr,
	showError,
	canRemove,
	onChange,
	onRemove,
}: {
	index: number;
	addr: AddressFormState;
	showError: boolean;
	canRemove: boolean;
	onChange: (field: "name" | "address" | "phone", value: string) => void;
	onRemove: () => void;
}) {
	return (
		<div
			data-testid={`address-row-${index}`}
			className={cn(
				"rounded-lg border border-border p-3",
				SURFACE_TINT,
				"[&_input]:bg-background dark:[&_input]:bg-input/30",
			)}
		>
			<div className="mb-2 flex items-center justify-between">
				<span className="text-sm font-medium text-muted-foreground">
					{addr.legal ? LEGAL_ADDRESS_LABEL : `Адрес ${index + 1}`}
				</span>
				{canRemove && (
					<Button type="button" variant="ghost" size="icon-xs" onClick={onRemove} aria-label="Удалить адрес">
						<Trash2 aria-hidden="true" />
					</Button>
				)}
			</div>
			<div className="flex flex-col gap-2">
				<Input
					className={cn(showError && "border-destructive")}
					placeholder="Адрес *"
					value={addr.address}
					onChange={(e) => onChange("address", e.target.value)}
					aria-label="Адрес"
					aria-invalid={showError || undefined}
					spellCheck={false}
					autoComplete="off"
				/>
				<Input
					placeholder="Название"
					value={addr.name}
					onChange={(e) => onChange("name", e.target.value)}
					aria-label="Название адреса"
					spellCheck={false}
					autoComplete="off"
				/>
				{!addr.legal && (
					<PhoneInput
						value={addr.phone}
						onChange={(v) => onChange("phone", v)}
						aria-label="Телефон контактного лица"
						placeholder="Телефон контактного лица"
					/>
				)}
			</div>
		</div>
	);
}
