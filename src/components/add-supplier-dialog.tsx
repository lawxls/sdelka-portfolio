import { AlertCircle } from "lucide-react";
import { useState } from "react";
import {
	FieldLabel,
	type SupplierCardState,
	SupplierEmptyCard,
	SupplierLoadingCard,
	SupplierMatchedCard,
} from "@/components/supplier-identity-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { INN_INDIVIDUAL_LEN, isValidInnLength, useSupplierIdentity } from "@/data/use-suppliers";
import { digitsOnly } from "@/lib/format";
import { cn } from "@/lib/utils";

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
	const [manualName, setManualName] = useState("");
	const [manualWebsite, setManualWebsite] = useState("");
	const [manualEmail, setManualEmail] = useState("");
	const [showErrors, setShowErrors] = useState(false);

	const lookupEnabled = mode === "inn" && isValidInnLength(inn);
	const lookup = useSupplierIdentity(inn, { enabled: lookupEnabled });

	const innFilled = isValidInnLength(inn);
	const matchedIdentity = lookup.data ?? null;
	const isFetching = lookupEnabled && lookup.isFetching;
	const isMiss = lookupEnabled && lookup.isFetched && lookup.data === null;
	const cardState: SupplierCardState = !innFilled
		? "empty"
		: isFetching
			? "loading"
			: matchedIdentity
				? "matched"
				: isMiss
					? "miss"
					: "empty";

	const innValid = mode !== "inn" || (innFilled && matchedIdentity != null);
	const nameValid = mode !== "manual" || manualName.trim() !== "";
	const canSave = innValid && nameValid;

	function handleSave() {
		if (!canSave) {
			setShowErrors(true);
			return;
		}
		if (mode === "inn" && matchedIdentity) {
			onSave({
				inn: inn.trim(),
				companyName: matchedIdentity.companyName,
				website: matchedIdentity.website,
				email: matchedIdentity.email,
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
	const showInnError = showErrors && mode === "inn" && !innFilled;
	const showNameError = showErrors && mode === "manual" && manualName.trim() === "";

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
									onChange={(e) => setInn(digitsOnly(e.target.value).slice(0, INN_INDIVIDUAL_LEN))}
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

							{cardState === "empty" && <SupplierEmptyCard innFilled={innFilled} />}
							{cardState === "loading" && <SupplierLoadingCard />}
							{cardState === "matched" && matchedIdentity && <SupplierMatchedCard identity={matchedIdentity} />}
							{cardState === "miss" && (
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
								<FieldLabel htmlFor="add-supplier-name" required>
									Название
								</FieldLabel>
								<Input
									id="add-supplier-name"
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
								<FieldLabel htmlFor="add-supplier-website">Сайт</FieldLabel>
								<Input
									id="add-supplier-website"
									value={manualWebsite}
									onChange={(e) => setManualWebsite(e.target.value)}
									autoComplete="url"
									spellCheck={false}
									placeholder="romashka.ru"
								/>
							</div>

							<div className="flex flex-col gap-1.5">
								<FieldLabel htmlFor="add-supplier-email">Email</FieldLabel>
								<Input
									id="add-supplier-email"
									type="email"
									value={manualEmail}
									onChange={(e) => setManualEmail(e.target.value)}
									autoComplete="email"
									spellCheck={false}
									placeholder="info@romashka.ru"
								/>
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
