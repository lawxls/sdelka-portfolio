import { AlertCircle, BadgeCheck, Globe, LoaderCircle, Mail, MapPin, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SupplierIdentity } from "@/data/domains/suppliers";
import { INN_INDIVIDUAL_LEN, isValidInnLength, useSupplierIdentity } from "@/data/use-suppliers";
import { digitsOnly } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CurrentSupplierDraft } from "./use-create-procurement-inquiry-form";

interface CurrentSupplierDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initial?: CurrentSupplierDraft;
	onSave: (supplier: CurrentSupplierDraft) => void;
}

function identityFromInitial(initial: CurrentSupplierDraft | undefined): SupplierIdentity | null {
	if (!initial || initial.companyName.trim() === "") return null;
	return {
		companyName: initial.companyName,
		website: initial.website,
		address: initial.address,
		email: initial.email,
	};
}

function FieldLabel({
	htmlFor,
	required,
	disabled,
	children,
}: {
	htmlFor?: string;
	required?: boolean;
	disabled?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className={cn("flex items-center gap-0.5", disabled && "opacity-60")}>
			{htmlFor ? (
				<label htmlFor={htmlFor} className="text-sm font-medium">
					{children}
				</label>
			) : (
				<span className="text-sm font-medium">{children}</span>
			)}
			{required && (
				<span className="text-destructive" aria-hidden="true">
					*
				</span>
			)}
		</div>
	);
}

function DetailRow({
	icon: Icon,
	label,
	value,
	href,
}: {
	icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	label: string;
	value: string;
	href?: string;
}) {
	const isEmpty = value.trim() === "";
	const content = isEmpty ? (
		<span className="text-muted-foreground">—</span>
	) : href ? (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="text-foreground underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-hidden break-all"
		>
			{value}
		</a>
	) : (
		<span className="text-foreground break-words">{value}</span>
	);
	return (
		<li className="flex items-start gap-2 text-sm leading-snug">
			<Icon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
			<span className="sr-only">{label}: </span>
			{content}
		</li>
	);
}

export function CurrentSupplierDialog({ open, onOpenChange, initial, onSave }: CurrentSupplierDialogProps) {
	const editing = !!initial;
	const [innLocked, setInnLocked] = useState(editing);
	const [inn, setInn] = useState(initial?.inn ?? "");
	const [pricePerUnit, setPricePerUnit] = useState(initial?.pricePerUnit ?? "");
	const [deliveryCost, setDeliveryCost] = useState(initial?.deliveryCost ?? "");
	const [manualName, setManualName] = useState(initial?.companyName ?? "");
	const [manualWebsite, setManualWebsite] = useState(initial?.website ?? "");
	const [manualAddress, setManualAddress] = useState(initial?.address ?? "");
	const [manualEmail, setManualEmail] = useState(initial?.email ?? "");
	const [showErrors, setShowErrors] = useState(false);

	const lookupEnabled = !innLocked && isValidInnLength(inn);
	const lookup = useSupplierIdentity(inn, { enabled: lookupEnabled });

	const matchedIdentity = innLocked ? identityFromInitial(initial) : (lookup.data ?? null);

	const isFetching = lookupEnabled && lookup.isFetching;
	const isMiss = !innLocked && lookupEnabled && lookup.isFetched && lookup.data === null;
	const hasMatchedDisplay = matchedIdentity !== null;
	const innFilled = isValidInnLength(inn);

	function handleResetInn() {
		setInnLocked(false);
		setInn("");
		setManualName("");
		setManualWebsite("");
		setManualAddress("");
		setManualEmail("");
	}

	const priceValid = pricePerUnit.trim() !== "";
	const innValid = isValidInnLength(inn);
	const manualNameValid = !isMiss || manualName.trim() !== "";
	const canSave = innValid && priceValid && manualNameValid;

	function handleSave() {
		if (!canSave) {
			setShowErrors(true);
			return;
		}
		const identity = matchedIdentity ?? {
			companyName: manualName.trim(),
			website: manualWebsite.trim(),
			address: manualAddress.trim(),
			email: manualEmail.trim(),
		};
		onSave({
			inn: inn.trim(),
			companyName: identity.companyName,
			website: identity.website,
			address: identity.address,
			email: identity.email,
			pricePerUnit: pricePerUnit.trim(),
			deliveryCost: deliveryCost.trim(),
		});
	}

	const innErrorId = "current-supplier-inn-error";
	const priceErrorId = "current-supplier-price-error";
	const nameErrorId = "current-supplier-name-error";

	const showInnError = showErrors && !innValid;
	const showPriceError = showErrors && !priceValid;
	const showNameError = showErrors && isMiss && !manualNameValid;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[28rem]">
				<DialogHeader className="gap-1 pr-8">
					<DialogTitle className="text-balance">
						{editing ? "Текущий поставщик" : "Добавить текущего поставщика"}
					</DialogTitle>
					<DialogDescription className="text-pretty">
						Найдём компанию по&nbsp;ИНН и&nbsp;сохраним её данные.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<FieldLabel htmlFor="current-supplier-inn" required>
							ИНН
						</FieldLabel>
						<div className="flex items-stretch gap-2">
							<Input
								id="current-supplier-inn"
								value={inn}
								onChange={(e) => setInn(digitsOnly(e.target.value).slice(0, INN_INDIVIDUAL_LEN))}
								inputMode="numeric"
								autoComplete="off"
								spellCheck={false}
								disabled={innLocked}
								aria-required="true"
								aria-invalid={showInnError || undefined}
								aria-describedby={showInnError ? innErrorId : undefined}
								className={cn("tabular-nums", showInnError && "border-destructive")}
								placeholder="7703123456"
							/>
							{innLocked && (
								<Button
									type="button"
									variant="outline"
									onClick={handleResetInn}
									aria-label="Сбросить ИНН"
									className="shrink-0"
								>
									<RotateCcw aria-hidden="true" className="size-4" />
									Сбросить
								</Button>
							)}
						</div>
						{showInnError && (
							<p id={innErrorId} className="text-sm text-destructive">
								ИНН должен состоять из 10 или 12 цифр
							</p>
						)}
					</div>

					{isFetching && (
						<div
							role="status"
							aria-live="polite"
							className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground animate-in fade-in-0 duration-150 motion-reduce:animate-none"
						>
							<LoaderCircle
								aria-hidden="true"
								className="size-4 animate-spin text-primary motion-reduce:animate-none"
							/>
							<span>Ищем поставщика…</span>
						</div>
					)}

					{!isFetching && hasMatchedDisplay && matchedIdentity && (
						<section
							aria-label="Найденный поставщик"
							className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 shadow-xs animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none"
						>
							<div className="flex items-start gap-2">
								<BadgeCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
								<h3 className="text-base font-semibold leading-snug text-foreground text-balance break-words">
									{matchedIdentity.companyName || "Без названия"}
								</h3>
							</div>
							<ul className="flex flex-col gap-1.5">
								<DetailRow
									icon={Globe}
									label="Сайт"
									value={matchedIdentity.website}
									href={matchedIdentity.website ? matchedIdentity.website : undefined}
								/>
								<DetailRow
									icon={Mail}
									label="Email"
									value={matchedIdentity.email}
									href={matchedIdentity.email ? `mailto:${matchedIdentity.email}` : undefined}
								/>
								<DetailRow icon={MapPin} label="Адрес" value={matchedIdentity.address} />
							</ul>
						</section>
					)}

					{!isFetching && isMiss && (
						<div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none">
							<div
								role="note"
								className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
							>
								<AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
								<p className="text-pretty">Поставщик не&nbsp;найден. Введите данные вручную.</p>
							</div>

							<div className="flex flex-col gap-1.5">
								<FieldLabel htmlFor="current-supplier-name" required>
									Название
								</FieldLabel>
								<Input
									id="current-supplier-name"
									value={manualName}
									onChange={(e) => setManualName(e.target.value)}
									autoComplete="organization"
									spellCheck={false}
									aria-required="true"
									aria-invalid={showNameError || undefined}
									aria-describedby={showNameError ? nameErrorId : undefined}
									className={showNameError ? "border-destructive" : undefined}
									placeholder="ООО «Ромашка»"
								/>
								{showNameError && (
									<p id={nameErrorId} className="text-sm text-destructive">
										Укажите название компании
									</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<FieldLabel htmlFor="current-supplier-website">Сайт</FieldLabel>
								<Input
									id="current-supplier-website"
									value={manualWebsite}
									onChange={(e) => setManualWebsite(e.target.value)}
									autoComplete="url"
									spellCheck={false}
									placeholder="romashka.ru"
								/>
							</div>

							<div className="flex flex-col gap-1.5">
								<FieldLabel htmlFor="current-supplier-email">Email</FieldLabel>
								<Input
									id="current-supplier-email"
									type="email"
									value={manualEmail}
									onChange={(e) => setManualEmail(e.target.value)}
									autoComplete="email"
									spellCheck={false}
									placeholder="info@romashka.ru"
								/>
							</div>

							<div className="flex flex-col gap-1.5">
								<FieldLabel htmlFor="current-supplier-address">Адрес</FieldLabel>
								<Input
									id="current-supplier-address"
									value={manualAddress}
									onChange={(e) => setManualAddress(e.target.value)}
									autoComplete="street-address"
									spellCheck={false}
									placeholder="Москва, ул. Ленина, 1"
								/>
							</div>
						</div>
					)}

					<div className="flex flex-col gap-3 sm:flex-row sm:items-start">
						<div className="flex flex-1 min-w-0 flex-col gap-1.5">
							<FieldLabel htmlFor="current-supplier-price" required disabled={!innFilled}>
								Текущая цена без НДС
							</FieldLabel>
							<div className={cn("flex items-center gap-1.5", !innFilled && "opacity-60")}>
								<Input
									id="current-supplier-price"
									value={pricePerUnit}
									onChange={(e) => setPricePerUnit(e.target.value.replace(/[^\d.]/g, ""))}
									inputMode="decimal"
									autoComplete="off"
									placeholder="1250"
									disabled={!innFilled}
									aria-required="true"
									aria-invalid={showPriceError || undefined}
									aria-describedby={showPriceError ? priceErrorId : undefined}
									className={cn("flex-1 tabular-nums", showPriceError && "border-destructive")}
								/>
								<span className="text-sm text-muted-foreground">₽</span>
							</div>
							{showPriceError && (
								<p id={priceErrorId} className="text-sm text-destructive">
									Укажите цену
								</p>
							)}
						</div>

						<div className="flex flex-1 min-w-0 flex-col gap-1.5">
							<FieldLabel htmlFor="current-supplier-delivery" disabled={!innFilled}>
								Стоимость доставки
							</FieldLabel>
							<div className={cn("flex items-center gap-1.5", !innFilled && "opacity-60")}>
								<Input
									id="current-supplier-delivery"
									value={deliveryCost}
									onChange={(e) => setDeliveryCost(e.target.value.replace(/[^\d.]/g, ""))}
									inputMode="decimal"
									autoComplete="off"
									placeholder="300"
									disabled={!innFilled}
									className="flex-1 tabular-nums"
								/>
								<span className="text-sm text-muted-foreground">₽</span>
							</div>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button type="button" onClick={handleSave}>
						Сохранить
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
