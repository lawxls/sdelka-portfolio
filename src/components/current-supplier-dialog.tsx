import { AlertCircle, LoaderCircle, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { FieldLabel } from "@/components/supplier-identity-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { PaymentType } from "@/data/types";
import { isValidCompanyInnLength, useCompanyLookupByInn } from "@/data/use-company-detail";
import { digitsOnly } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CurrentSupplierDraft } from "./use-create-procurement-inquiry-form";

const INN_MAX_LEN = 12;

interface CurrentSupplierDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initial?: CurrentSupplierDraft;
	onSave: (supplier: CurrentSupplierDraft) => void;
}

type Mode = "inn" | "manual";
const MODE_OPTIONS = ["inn", "manual"] as const satisfies readonly Mode[];
const MODE_LABELS: Record<Mode, string> = {
	inn: "По ИНН",
	manual: "Вручную",
};

const PAYMENT_OPTIONS = ["prepayment", "deferred"] as const satisfies readonly PaymentType[];
const PAYMENT_LABELS: Record<PaymentType, string> = {
	prepayment: "Предоплата",
	deferred: "Отсрочка",
};

type DeliveryMode = "included" | "paid";
const DELIVERY_OPTIONS = ["included", "paid"] as const;
const DELIVERY_LABELS: Record<DeliveryMode, string> = {
	included: "Включена",
	paid: "Платная",
};

function SectionHeader({ children }: { children: React.ReactNode }) {
	return <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

function initialMode(initial: CurrentSupplierDraft | undefined): Mode {
	if (!initial) return "inn";
	return initial.inn ? "inn" : "manual";
}

export function CurrentSupplierDialog({ open, onOpenChange, initial, onSave }: CurrentSupplierDialogProps) {
	const editing = !!initial;
	const [mode, setMode] = useState<Mode>(() => initialMode(initial));
	const [innLocked, setInnLocked] = useState(editing && !!initial?.inn);
	const [inn, setInn] = useState(initial?.inn ?? "");
	const [pricePerUnit, setPricePerUnit] = useState(initial?.pricePerUnit ?? "");
	const [paymentType, setPaymentType] = useState<PaymentType>(initial?.paymentType ?? "prepayment");
	const [deferralDays, setDeferralDays] = useState(initial?.deferralDays ?? "");
	const [prepaymentPercent, setPrepaymentPercent] = useState(initial?.prepaymentPercent ?? "");
	const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(
		initial?.deliveryIncluded === false ? "paid" : "included",
	);
	const [deliveryCost, setDeliveryCost] = useState(initial?.deliveryCost ?? "");
	const [leadTimeDays, setLeadTimeDays] = useState(initial?.leadTimeDays ?? "");
	const [manualName, setManualName] = useState(initial?.companyName ?? "");
	const [manualWebsite, setManualWebsite] = useState(initial?.website ?? "");
	const [manualAddress, setManualAddress] = useState(initial?.address ?? "");
	const [manualEmail, setManualEmail] = useState(initial?.email ?? "");
	// Inputs paired with the matched-INN fields. DaData doesn't carry website/email,
	// so the user fills them in. Seeded from `initial` so edit mode preserves
	// whatever was previously saved.
	const [matchedWebsite, setMatchedWebsite] = useState(initial?.website ?? "");
	const [matchedEmail, setMatchedEmail] = useState(initial?.email ?? "");
	const [showErrors, setShowErrors] = useState(false);

	const innFilled = isValidCompanyInnLength(inn);
	const lookupEnabled = mode === "inn" && !innLocked && innFilled;
	const lookup = useCompanyLookupByInn(inn, { enabled: lookupEnabled });

	// In edit mode, the saved supplier data hydrates the matched-INN fields
	// directly — we don't re-call DaData because the user already accepted it.
	// In create mode, the lookup result is the source.
	const lockedMatch = innLocked && initial?.inn ? { companyName: initial.companyName, address: initial.address } : null;
	const liveMatch = lookup.data
		? {
				companyName: lookup.data.shortName || lookup.data.fullName,
				address: lookup.data.address,
			}
		: null;
	const matched = lockedMatch ?? liveMatch;

	const isFetching = lookupEnabled && lookup.isFetching;
	const isMiss = lookupEnabled && lookup.isFetched && lookup.data === null;

	function handleResetInn() {
		setInnLocked(false);
		setInn("");
		setMatchedWebsite("");
		setMatchedEmail("");
	}

	const innValid = mode !== "inn" || (innFilled && (matched != null || isMiss));
	// In INN mode: matched provides the name (no manual entry needed). On miss
	// we steer the user to the Manual tab, so name validity still passes.
	// In manual mode: name is required.
	const innModeReady = mode === "inn" && matched != null;
	const manualModeReady = mode === "manual" && manualName.trim() !== "";
	const companyReady = innModeReady || manualModeReady;
	const nameValid = mode !== "manual" || manualName.trim() !== "";
	const emailValid = mode === "inn" ? matchedEmail.trim() !== "" : manualEmail.trim() !== "";
	const priceValid = pricePerUnit.trim() !== "";
	const deferralValid = paymentType !== "deferred" || deferralDays.trim() !== "";
	const deliveryValid = deliveryMode !== "paid" || deliveryCost.trim() !== "";
	const canSave = innValid && nameValid && emailValid && priceValid && deferralValid && deliveryValid;

	function handleSave() {
		if (!canSave) {
			setShowErrors(true);
			return;
		}
		const payload =
			mode === "inn" && matched
				? {
						inn: inn.trim(),
						companyName: matched.companyName,
						address: matched.address,
						website: matchedWebsite.trim(),
						email: matchedEmail.trim(),
					}
				: {
						inn: "",
						companyName: manualName.trim(),
						address: manualAddress.trim(),
						website: manualWebsite.trim(),
						email: manualEmail.trim(),
					};
		onSave({
			...payload,
			pricePerUnit: pricePerUnit.trim(),
			paymentType,
			deferralDays: paymentType === "deferred" ? deferralDays.trim() : "",
			prepaymentPercent: paymentType === "prepayment" ? prepaymentPercent.trim() : "",
			deliveryIncluded: deliveryMode === "included",
			deliveryCost: deliveryMode === "paid" ? deliveryCost.trim() : "",
			leadTimeDays: leadTimeDays.trim(),
		});
	}

	const innErrorId = "current-supplier-inn-error";
	const priceErrorId = "current-supplier-price-error";
	const nameErrorId = "current-supplier-name-error";
	const emailErrorId = "current-supplier-email-error";
	const deferralErrorId = "current-supplier-deferral-error";
	const deliveryErrorId = "current-supplier-delivery-error";

	const showInnError = showErrors && mode === "inn" && !innFilled;
	const showPriceError = showErrors && !priceValid;
	const showNameError = showErrors && mode === "manual" && !nameValid;
	// Email error suppressed in INN mode until the match lands — the field is
	// disabled before that, so flagging a missing value would be confusing.
	const showEmailError =
		showErrors && (mode === "inn" ? matched != null && matchedEmail.trim() === "" : manualEmail.trim() === "");
	const showDeferralError = showErrors && !deferralValid;
	const showDeliveryError = showErrors && !deliveryValid;

	const innModeFieldsEnabled = matched != null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[30rem]">
				<DialogHeader className="gap-1 pr-8">
					<DialogTitle className="text-balance">
						{editing ? "Текущий поставщик" : "Добавить текущего поставщика"}
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					<section className="flex flex-col gap-3">
						<SectionHeader>Поставщик</SectionHeader>

						<SegmentedControl options={MODE_OPTIONS} labels={MODE_LABELS} value={mode} onChange={setMode} />

						{mode === "inn" && (
							<div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none">
								<div className="flex flex-col gap-1.5">
									<FieldLabel htmlFor="current-supplier-inn" required>
										ИНН
									</FieldLabel>
									<div className="flex items-stretch gap-2">
										<Input
											id="current-supplier-inn"
											value={inn}
											onChange={(e) => setInn(digitsOnly(e.target.value).slice(0, INN_MAX_LEN))}
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
										className="flex items-center gap-2 text-sm text-muted-foreground"
									>
										<LoaderCircle
											aria-hidden="true"
											className="size-4 animate-spin text-primary motion-reduce:animate-none"
										/>
										<span>Ищем поставщика по ИНН…</span>
									</div>
								)}

								<div className="flex flex-col gap-1.5">
									<FieldLabel htmlFor="current-supplier-matched-name" disabled={!innModeFieldsEnabled}>
										Название
									</FieldLabel>
									<Input
										id="current-supplier-matched-name"
										value={matched?.companyName ?? ""}
										readOnly
										disabled={!innModeFieldsEnabled}
										placeholder="ООО «Ромашка»"
									/>
								</div>

								<div className="flex flex-col gap-1.5">
									<FieldLabel htmlFor="current-supplier-matched-address" disabled={!innModeFieldsEnabled}>
										Адрес
									</FieldLabel>
									<Input
										id="current-supplier-matched-address"
										value={matched?.address ?? ""}
										readOnly
										disabled={!innModeFieldsEnabled}
										placeholder="г Москва, ул Ленина, д 1"
									/>
								</div>

								<div className="flex flex-col gap-1.5">
									<FieldLabel htmlFor="current-supplier-matched-website" disabled={!innModeFieldsEnabled}>
										Сайт
									</FieldLabel>
									<Input
										id="current-supplier-matched-website"
										value={matchedWebsite}
										onChange={(e) => setMatchedWebsite(e.target.value)}
										autoComplete="url"
										inputMode="url"
										spellCheck={false}
										disabled={!innModeFieldsEnabled || innLocked}
										placeholder="romashka.ru"
									/>
								</div>

								<div className="flex flex-col gap-1.5">
									<FieldLabel htmlFor="current-supplier-matched-email" required disabled={!innModeFieldsEnabled}>
										Email
									</FieldLabel>
									<Input
										id="current-supplier-matched-email"
										type="email"
										value={matchedEmail}
										onChange={(e) => setMatchedEmail(e.target.value)}
										autoComplete="email"
										spellCheck={false}
										disabled={!innModeFieldsEnabled || innLocked}
										aria-required="true"
										aria-invalid={showEmailError || undefined}
										aria-describedby={showEmailError ? emailErrorId : undefined}
										className={showEmailError ? "border-destructive" : undefined}
										placeholder="info@romashka.ru"
									/>
									{showEmailError && (
										<p id={emailErrorId} className="text-sm text-destructive">
											Укажите email
										</p>
									)}
								</div>

								{isMiss && (
									<div
										role="note"
										className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
									>
										<AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
										<p className="text-pretty">
											Поставщик не&nbsp;найден. Переключитесь на «Вручную», чтобы ввести данные.
										</p>
									</div>
								)}
							</div>
						)}

						{mode === "manual" && (
							<div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none">
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
									<FieldLabel htmlFor="current-supplier-email" required>
										Email
									</FieldLabel>
									<Input
										id="current-supplier-email"
										type="email"
										value={manualEmail}
										onChange={(e) => setManualEmail(e.target.value)}
										autoComplete="email"
										spellCheck={false}
										aria-required="true"
										aria-invalid={showEmailError || undefined}
										aria-describedby={showEmailError ? emailErrorId : undefined}
										className={showEmailError ? "border-destructive" : undefined}
										placeholder="info@romashka.ru"
									/>
									{showEmailError && (
										<p id={emailErrorId} className="text-sm text-destructive">
											Укажите email
										</p>
									)}
								</div>
							</div>
						)}
					</section>

					<div className="border-t border-border/60" aria-hidden="true" />

					<section className="flex flex-col gap-3">
						<SectionHeader>Цена и оплата</SectionHeader>

						<div className="flex flex-col gap-1.5">
							<FieldLabel htmlFor="current-supplier-price" required disabled={!companyReady}>
								Текущая цена/ед. без&nbsp;НДС
							</FieldLabel>
							<div className={cn("flex items-center gap-1.5", !companyReady && "opacity-60")}>
								<Input
									id="current-supplier-price"
									value={pricePerUnit}
									onChange={(e) => setPricePerUnit(e.target.value.replace(/[^\d.]/g, ""))}
									inputMode="decimal"
									autoComplete="off"
									placeholder="1250"
									disabled={!companyReady}
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

						<div className="flex flex-col gap-1.5">
							<FieldLabel disabled={!companyReady}>Тип оплаты</FieldLabel>
							<div className={cn("flex flex-wrap items-center gap-2", !companyReady && "opacity-60")}>
								<SegmentedControl
									options={PAYMENT_OPTIONS}
									labels={PAYMENT_LABELS}
									value={paymentType}
									onChange={setPaymentType}
									disabled={!companyReady}
								/>
								{paymentType === "prepayment" && (
									<div className="flex items-center gap-1.5 animate-in fade-in-0 duration-150 motion-reduce:animate-none">
										<Input
											aria-label="Размер предоплаты"
											value={prepaymentPercent}
											onChange={(e) => setPrepaymentPercent(digitsOnly(e.target.value).slice(0, 3))}
											inputMode="numeric"
											autoComplete="off"
											placeholder="100"
											disabled={!companyReady}
											className="w-20 tabular-nums"
										/>
										<span className="text-sm text-muted-foreground">%</span>
									</div>
								)}
								{paymentType === "deferred" && (
									<div className="flex items-center gap-1.5 animate-in fade-in-0 duration-150 motion-reduce:animate-none">
										<Input
											aria-label="Дней отсрочки"
											value={deferralDays}
											onChange={(e) => setDeferralDays(digitsOnly(e.target.value))}
											inputMode="numeric"
											autoComplete="off"
											placeholder="30"
											disabled={!companyReady}
											aria-invalid={showDeferralError || undefined}
											aria-describedby={showDeferralError ? deferralErrorId : undefined}
											className={cn("w-20 tabular-nums", showDeferralError && "border-destructive")}
										/>
										<span className="text-sm text-muted-foreground">дн.</span>
									</div>
								)}
							</div>
							{showDeferralError && (
								<p id={deferralErrorId} className="text-sm text-destructive">
									Укажите количество дней отсрочки
								</p>
							)}
						</div>
					</section>

					<div className="border-t border-border/60" aria-hidden="true" />

					<section className="flex flex-col gap-3">
						<SectionHeader>Доставка и сроки</SectionHeader>

						<div className="flex flex-col gap-1.5">
							<FieldLabel disabled={!companyReady}>Доставка</FieldLabel>
							<div className={cn("flex flex-wrap items-center gap-2", !companyReady && "opacity-60")}>
								<SegmentedControl
									options={DELIVERY_OPTIONS}
									labels={DELIVERY_LABELS}
									value={deliveryMode}
									onChange={setDeliveryMode}
									disabled={!companyReady}
								/>
								{deliveryMode === "paid" && (
									<div className="flex items-center gap-1.5 animate-in fade-in-0 duration-150 motion-reduce:animate-none">
										<Input
											aria-label="Стоимость доставки"
											value={deliveryCost}
											onChange={(e) => setDeliveryCost(e.target.value.replace(/[^\d.]/g, ""))}
											inputMode="decimal"
											autoComplete="off"
											placeholder="300"
											disabled={!companyReady}
											aria-invalid={showDeliveryError || undefined}
											aria-describedby={showDeliveryError ? deliveryErrorId : undefined}
											className={cn("w-24 tabular-nums", showDeliveryError && "border-destructive")}
										/>
										<span className="text-sm text-muted-foreground whitespace-nowrap">₽/ед.</span>
									</div>
								)}
							</div>
							{showDeliveryError && (
								<p id={deliveryErrorId} className="text-sm text-destructive">
									Укажите стоимость доставки
								</p>
							)}
						</div>

						<div className="flex flex-col gap-1.5">
							<FieldLabel htmlFor="current-supplier-lead-time" disabled={!companyReady}>
								Срок поставки
							</FieldLabel>
							<div className={cn("flex items-center gap-1.5", !companyReady && "opacity-60")}>
								<Input
									id="current-supplier-lead-time"
									value={leadTimeDays}
									onChange={(e) => setLeadTimeDays(digitsOnly(e.target.value))}
									inputMode="numeric"
									autoComplete="off"
									placeholder="14"
									disabled={!companyReady}
									className="w-24 tabular-nums"
								/>
								<span className="text-sm text-muted-foreground">дн.</span>
							</div>
						</div>
					</section>
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

/** Soft Plus-icon tile used as a leading affordance — at rest reads as a muted button,
 * brightens to `bg-background` on hover of an ancestor `.group`. Two sizes match the
 * placeholder-row CTA (`sm`) and the item-picker list-card (`md`). */
export function PlusTile({ size = "sm" }: { size?: "sm" | "md" }) {
	const tile = size === "md" ? "size-9" : "size-6";
	const icon = size === "md" ? "size-4" : "size-3.5";
	return (
		<span
			aria-hidden="true"
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted text-foreground shadow-xs transition-[background-color,border-color] duration-150 ease-out group-hover:border-border group-hover:bg-background motion-reduce:transition-none",
				tile,
			)}
		>
			<Plus className={icon} />
		</span>
	);
}

/** «Добавить текущего поставщика» pinned-row content for supplier tables when a position
 * has no `currentSupplier`. Renders centered across the full row via `DataTablePlaceholderRow`.
 * Row-level `.group` brightens the `PlusTile` on hover so the placeholder reads as a button
 * without competing with sibling pinned rows. */
export function AddSupplierPlaceholderCell() {
	return (
		<div className="flex min-h-9 items-center justify-center gap-2.5 text-sm">
			<PlusTile />
			<span className="font-medium text-foreground">Добавить текущего поставщика</span>
		</div>
	);
}
