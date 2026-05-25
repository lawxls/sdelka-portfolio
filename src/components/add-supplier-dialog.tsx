import { AlertCircle, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { FieldLabel } from "@/components/supplier-identity-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

export function AddSupplierDialog({ open, onOpenChange, onSave }: AddSupplierDialogProps) {
	const [inn, setInn] = useState("");
	const [website, setWebsite] = useState("");
	const [email, setEmail] = useState("");
	const [showErrors, setShowErrors] = useState(false);

	const innFilled = isValidCompanyInnLength(inn);
	const lookup = useCompanyLookupByInn(inn, { enabled: innFilled });

	const matched = lookup.data ?? null;
	const isFetching = innFilled && lookup.isFetching;
	const isMiss = innFilled && lookup.isFetched && lookup.data === null;
	// Name + address are filled from DaData; the user can't edit them. The
	// downstream fields (Сайт/Email) become editable once a match lands —
	// DaData doesn't carry website/email so the user fills them in.
	const matchedName = matched ? matched.shortName || matched.fullName : "";
	const matchedAddress = matched?.address ?? "";
	const fieldsEnabled = matched != null;

	const innValid = innFilled && matched != null;
	const websiteValid = website.trim() !== "";
	const emailValid = email.trim() !== "";
	const canSave = innValid && websiteValid && emailValid;

	function handleSave() {
		if (!canSave) {
			setShowErrors(true);
			return;
		}
		if (!matched) return;
		onSave({
			inn: inn.trim(),
			companyName: matchedName,
			website: website.trim(),
			email: email.trim(),
		});
	}

	const innErrorId = "add-supplier-inn-error";
	const websiteErrorId = "add-supplier-website-error";
	const emailErrorId = "add-supplier-email-error";
	const showInnError = showErrors && !innFilled;
	// Website/email errors only surface once the match lands — the fields are
	// disabled before that, so flagging missing values would be confusing.
	const showWebsiteError = showErrors && matched != null && !websiteValid;
	const showEmailError = showErrors && matched != null && !emailValid;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[30rem]">
				<DialogHeader className="gap-1 pr-8">
					<DialogTitle className="text-balance">Добавить поставщика</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-3">
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
						<FieldLabel htmlFor="add-supplier-website" required disabled={!fieldsEnabled}>
							Сайт
						</FieldLabel>
						<Input
							id="add-supplier-website"
							value={website}
							onChange={(e) => setWebsite(e.target.value)}
							autoComplete="url"
							inputMode="url"
							spellCheck={false}
							disabled={!fieldsEnabled}
							aria-required="true"
							aria-invalid={showWebsiteError || undefined}
							aria-describedby={showWebsiteError ? websiteErrorId : undefined}
							className={showWebsiteError ? "border-destructive" : undefined}
							placeholder="romashka.ru"
						/>
						{showWebsiteError && (
							<p id={websiteErrorId} className="text-sm text-destructive">
								Укажите сайт
							</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<FieldLabel htmlFor="add-supplier-email" required disabled={!fieldsEnabled}>
							Email
						</FieldLabel>
						<Input
							id="add-supplier-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
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
							<p className="text-pretty">Поставщик не&nbsp;найден. Проверьте ИНН и&nbsp;попробуйте снова.</p>
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
