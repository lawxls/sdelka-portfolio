import { AlertCircle, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { FieldLabel } from "@/components/supplier-identity-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { isValidCompanyInnLength, useCompanyLookupByInn } from "@/data/use-company-detail";
import { digitsOnly } from "@/lib/format";
import { cn } from "@/lib/utils";

const INN_MAX_LEN = 12;

export interface AddSupplierDraft {
	inn: string;
	companyName: string;
	website: string;
	email: string;
}

interface AddSupplierDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (supplier: AddSupplierDraft) => void;
}

type Mode = "inn" | "manual";
const MODE_OPTIONS = ["inn", "manual"] as const satisfies readonly Mode[];
const MODE_LABELS: Record<Mode, string> = {
	inn: "По ИНН",
	manual: "Вручную",
};

export function AddSupplierDialog({ open, onOpenChange, onSave }: AddSupplierDialogProps) {
	const [mode, setMode] = useState<Mode>("inn");
	const [inn, setInn] = useState("");
	const [matchedWebsite, setMatchedWebsite] = useState("");
	const [matchedEmail, setMatchedEmail] = useState("");
	const [manualName, setManualName] = useState("");
	const [manualWebsite, setManualWebsite] = useState("");
	const [manualEmail, setManualEmail] = useState("");
	const [showErrors, setShowErrors] = useState(false);

	const innFilled = isValidCompanyInnLength(inn);
	const lookupEnabled = mode === "inn" && innFilled;
	const lookup = useCompanyLookupByInn(inn, { enabled: lookupEnabled });

	const matched = lookup.data ?? null;
	const isFetching = lookupEnabled && lookup.isFetching;
	const isMiss = lookupEnabled && lookup.isFetched && lookup.data === null;
	// Name + address are filled from DaData; the user can't edit them. The
	// downstream fields (Сайт/Email) become editable once a match lands —
	// DaData doesn't carry website/email so the user fills them in.
	const matchedName = matched ? matched.shortName || matched.fullName : "";
	const matchedAddress = matched?.address ?? "";
	const fieldsEnabled = matched != null;

	const innValid = mode !== "inn" || (innFilled && matched != null);
	const nameValid = mode !== "manual" || manualName.trim() !== "";
	const emailValid = mode === "inn" ? matchedEmail.trim() !== "" : manualEmail.trim() !== "";
	const canSave = innValid && nameValid && emailValid;

	function handleSave() {
		if (!canSave) {
			setShowErrors(true);
			return;
		}
		if (mode === "inn" && matched) {
			onSave({
				inn: inn.trim(),
				companyName: matchedName,
				website: matchedWebsite.trim(),
				email: matchedEmail.trim(),
			});
		} else {
			onSave({
				inn: "",
				companyName: manualName.trim(),
				website: manualWebsite.trim(),
				email: manualEmail.trim(),
			});
		}
	}

	const innErrorId = "add-supplier-inn-error";
	const nameErrorId = "add-supplier-name-error";
	const emailErrorId = "add-supplier-email-error";
	const showInnError = showErrors && mode === "inn" && !innFilled;
	const showNameError = showErrors && mode === "manual" && manualName.trim() === "";
	// In INN mode, email validation only kicks in once the match lands (the field
	// is disabled before that — flagging it as missing before the user can type
	// anything would be confusing).
	const showEmailError =
		showErrors && (mode === "inn" ? matched != null && matchedEmail.trim() === "" : manualEmail.trim() === "");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[30rem]">
				<DialogHeader className="gap-1 pr-8">
					<DialogTitle className="text-balance">Добавить поставщика</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					<SegmentedControl options={MODE_OPTIONS} labels={MODE_LABELS} value={mode} onChange={setMode} />

					{mode === "inn" && (
						<div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none">
							<div className="flex flex-col gap-1.5">
								<FieldLabel htmlFor="add-supplier-inn" required>
									ИНН
								</FieldLabel>
								<Input
									id="add-supplier-inn"
									value={inn}
									onChange={(e) => setInn(digitsOnly(e.target.value).slice(0, INN_MAX_LEN))}
									inputMode="numeric"
									autoComplete="off"
									spellCheck={false}
									aria-required="true"
									aria-invalid={showInnError || undefined}
									aria-describedby={showInnError ? innErrorId : undefined}
									className={cn("tabular-nums", showInnError && "border-destructive")}
									placeholder="7703123456"
								/>
								{showInnError && (
									<p id={innErrorId} className="text-sm text-destructive">
										ИНН должен состоять из 10 или 12 цифр
									</p>
								)}
							</div>

							{isFetching && (
								<div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
									<LoaderCircle
										aria-hidden="true"
										className="size-4 animate-spin text-primary motion-reduce:animate-none"
									/>
									<span>Ищем поставщика по ИНН…</span>
								</div>
							)}

							<div className="flex flex-col gap-1.5">
								<FieldLabel htmlFor="add-supplier-name" disabled={!fieldsEnabled}>
									Название
								</FieldLabel>
								<Input
									id="add-supplier-name"
									value={matchedName}
									readOnly
									disabled={!fieldsEnabled}
									placeholder="ООО «Ромашка»"
								/>
							</div>

							<div className="flex flex-col gap-1.5">
								<FieldLabel htmlFor="add-supplier-address" disabled={!fieldsEnabled}>
									Адрес
								</FieldLabel>
								<Input
									id="add-supplier-address"
									value={matchedAddress}
									readOnly
									disabled={!fieldsEnabled}
									placeholder="г Москва, ул Ленина, д 1"
								/>
							</div>

							<div className="flex flex-col gap-1.5">
								<FieldLabel htmlFor="add-supplier-website" disabled={!fieldsEnabled}>
									Сайт
								</FieldLabel>
								<Input
									id="add-supplier-website"
									value={matchedWebsite}
									onChange={(e) => setMatchedWebsite(e.target.value)}
									autoComplete="url"
									inputMode="url"
									spellCheck={false}
									disabled={!fieldsEnabled}
									placeholder="romashka.ru"
								/>
							</div>

							<div className="flex flex-col gap-1.5">
								<FieldLabel htmlFor="add-supplier-email" required disabled={!fieldsEnabled}>
									Email
								</FieldLabel>
								<Input
									id="add-supplier-email"
									type="email"
									value={matchedEmail}
									onChange={(e) => setMatchedEmail(e.target.value)}
									autoComplete="email"
									spellCheck={false}
									disabled={!fieldsEnabled}
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
								<FieldLabel htmlFor="add-supplier-manual-name" required>
									Название
								</FieldLabel>
								<Input
									id="add-supplier-manual-name"
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
								<FieldLabel htmlFor="add-supplier-manual-website">Сайт</FieldLabel>
								<Input
									id="add-supplier-manual-website"
									value={manualWebsite}
									onChange={(e) => setManualWebsite(e.target.value)}
									autoComplete="url"
									spellCheck={false}
									placeholder="romashka.ru"
								/>
							</div>

							<div className="flex flex-col gap-1.5">
								<FieldLabel htmlFor="add-supplier-manual-email" required>
									Email
								</FieldLabel>
								<Input
									id="add-supplier-manual-email"
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
