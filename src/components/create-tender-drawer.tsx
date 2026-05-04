import { Check, ChevronDown, CircleHelp, Info, LoaderCircle, Plus, RefreshCw, Trash2, X } from "lucide-react";
// biome-ignore lint/style/noRestrictedImports: one-time external sync from React Query data (no stable mount point fits here)
import { useEffect, useMemo, useRef, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CheckboxBadge } from "@/components/ui/checkbox-badge";
import { DateField } from "@/components/ui/date-field";
import { FolderSelect } from "@/components/ui/folder-select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OptionalSegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CREATION_QUESTIONS } from "@/data/mock-creation-questions";
import { UNITS, UNLOADING_LABELS } from "@/data/types";
import { useProcurementCompanies } from "@/data/use-companies";
import { useCreateAddress } from "@/data/use-company-detail";
import { nextUnusedColor, useCreateFolder, useFolders } from "@/data/use-folders";
import { useInlineEdit } from "@/hooks/use-inline-edit";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
	type CreateTenderPayload,
	type PositionDraft,
	useCreateTenderForm,
	type WizardStep,
} from "./use-create-tender-form";

interface CreateTenderDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (payload: CreateTenderPayload) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;

const STEP_TITLES: Record<WizardStep, string> = {
	1: "Заполните данные по запросу",
	2: "Дополнительные вопросы",
	3: "Письмо для поставщиков",
};

const STEP_PROGRESS: Record<WizardStep, number> = {
	1: 33,
	2: 66,
	3: 100,
};

const TOTAL_STEPS = 3;

const DEADLINE_TOOLTIP =
	"По истечении дедлайна запрос автоматически перейдёт в статус «Переговоры завершены». При необходимости его можно будет вернуть в работу вручную.";

/** Subtle surface tint used for header, footer, and position cards — slightly darker than `--muted`
 * so chrome reads as a layer above the popover body in both themes. */
const SURFACE_TINT =
	"bg-[color-mix(in_oklch,var(--muted)_99%,var(--foreground)_0.4%)] dark:bg-[color-mix(in_oklch,var(--muted)_95%,var(--foreground)_1.5%)]";

function SectionGroupHeader({ title }: { title: string }) {
	return (
		<h3 className="mt-5 mb-1 text-xs font-semibold uppercase tracking-wide text-balance text-muted-foreground">
			{title}
		</h3>
	);
}

function Field({
	label,
	hint,
	htmlFor,
	required,
	className,
	children,
}: {
	label: string;
	hint?: string;
	htmlFor?: string;
	required?: boolean;
	className?: string;
	children: React.ReactNode;
}) {
	const asterisk = required ? (
		<span className="text-destructive" aria-hidden="true">
			*
		</span>
	) : null;
	const hintIcon = hint ? (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={hint}
					className="ml-1 text-muted-foreground hover:text-foreground focus-visible:rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50"
				>
					<CircleHelp aria-hidden="true" className="size-3.5" />
				</button>
			</TooltipTrigger>
			<TooltipContent>{hint}</TooltipContent>
		</Tooltip>
	) : null;
	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<div className="flex items-center gap-0.5">
				{htmlFor ? (
					<label htmlFor={htmlFor} className="text-sm font-medium">
						{label}
					</label>
				) : (
					<span className="text-sm font-medium">{label}</span>
				)}
				{asterisk}
				{hintIcon}
			</div>
			{children}
		</div>
	);
}

export function CreateTenderDrawer({ open, onOpenChange, onSubmit }: CreateTenderDrawerProps) {
	const { data: companies } = useProcurementCompanies();
	const { data: folders = [] } = useFolders();
	const createFolderMutation = useCreateFolder();

	const companiesById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

	const form = useCreateTenderForm();

	const { step, step1 } = form;

	const [showConfirm, setShowConfirm] = useState(false);
	const [step2Ready, setStep2Ready] = useState(false);
	const [step3Ready, setStep3Ready] = useState(false);
	const [emailRegenerating, setEmailRegenerating] = useState(false);
	const nameInputRefs = useRef<(HTMLInputElement | null)[]>([]);
	const deadlineInputRef = useRef<HTMLInputElement>(null);
	const companyTriggerRef = useRef<HTMLButtonElement>(null);
	const regenerateTimerRef = useRef<number | null>(null);

	function clearRegenerateTimer() {
		if (regenerateTimerRef.current !== null) {
			window.clearTimeout(regenerateTimerRef.current);
			regenerateTimerRef.current = null;
		}
	}

	useMountEffect(() => clearRegenerateTimer);

	const selectedFolderName = useMemo(() => {
		if (!step1.folderId) return null;
		return folders.find((f) => f.id === step1.folderId)?.name ?? null;
	}, [folders, step1.folderId]);

	const lockedCompany = companies.length === 1 ? companies[0] : undefined;
	const selectedCompany = step1.companyId ? companiesById.get(step1.companyId) : undefined;
	const nextFolderColor = useMemo(() => nextUnusedColor(folders), [folders]);

	const { update1 } = form;
	// biome-ignore lint/correctness/useExhaustiveDependencies: update1 is stable via setState; including it would re-fire on every render
	useEffect(() => {
		if (!open) return;
		if (!lockedCompany) return;
		if (step1.companyId === lockedCompany.id) return;
		update1("companyId", lockedCompany.id);
		const mainAddress = lockedCompany.addresses.find((a) => a.isMain) ?? lockedCompany.addresses[0];
		update1("addressIds", mainAddress ? [mainAddress.id] : []);
	}, [open, lockedCompany, step1.companyId]);

	function handleCreateFolder(name: string, color: string) {
		createFolderMutation.mutate(
			{ name, color },
			{
				onSuccess: (created) => {
					form.update1("folderId", created.id);
				},
			},
		);
	}

	function handleAdvance() {
		if (step === 1) {
			const result = form.advance();
			if (!result.advanced) {
				if (result.focus === "deadline") deadlineInputRef.current?.focus();
				else if (result.focus === "company") companyTriggerRef.current?.focus();
				else if (result.focus === "name") nameInputRefs.current[result.positionIndex ?? 0]?.focus();
			}
			return;
		}
		if (step === 2) {
			form.advance();
			return;
		}
		handleSubmit();
	}

	function handleRegenerateEmail() {
		if (emailRegenerating) return;
		setEmailRegenerating(true);
		regenerateTimerRef.current = window.setTimeout(() => {
			form.regenerateEmail(selectedFolderName);
			setEmailRegenerating(false);
			regenerateTimerRef.current = null;
		}, 600);
	}

	function resetForm() {
		clearRegenerateTimer();
		form.reset();
		setStep2Ready(false);
		setStep3Ready(false);
		setEmailRegenerating(false);
		nameInputRefs.current = [];
	}

	function handleSubmit() {
		const payload = form.toPayload();
		onSubmit(payload);
		resetForm();
		onOpenChange(false);
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			if (form.isDirty) {
				setShowConfirm(true);
				return;
			}
			resetForm();
		}
		onOpenChange(nextOpen);
	}

	function handleConfirmDiscard() {
		setShowConfirm(false);
		resetForm();
		onOpenChange(false);
	}

	function handleAddPosition() {
		const newIndex = step1.positions.length;
		form.addPosition();
		queueMicrotask(() => nameInputRefs.current[newIndex]?.focus());
	}

	const progressPercent = STEP_PROGRESS[step];

	return (
		<>
			<Sheet open={open} onOpenChange={handleOpenChange}>
				<SheetContent
					showCloseButton={false}
					className="flex flex-col gap-0 max-md:!w-full max-md:!max-w-full max-md:!inset-0 max-md:!rounded-none"
				>
					<SheetHeader className={cn("border-b pb-4", SURFACE_TINT)}>
						<SheetTitle>Создать запрос</SheetTitle>
						<SheetDescription className="sr-only">{STEP_TITLES[step]}</SheetDescription>
						<div className="mt-3 flex flex-col gap-2">
							<div
								role="progressbar"
								aria-label="Прогресс заполнения"
								aria-valuemin={0}
								aria-valuemax={100}
								aria-valuenow={progressPercent}
								className="h-1 w-full overflow-hidden rounded-full bg-muted motion-reduce:contrast-more:bg-border"
							>
								<div
									className="h-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
									style={{ width: `${progressPercent}%` }}
								/>
							</div>
							<p className="text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">
								<span className="font-medium text-foreground">
									Шаг {step} из {TOTAL_STEPS}
								</span>
								<span className="mx-1.5 opacity-40">·</span>
								<span>{STEP_TITLES[step]}</span>
							</p>
						</div>
					</SheetHeader>

					<div className="flex-1 overflow-y-auto px-4">
						{step === 1 && (
							<TooltipProvider>
								<Step1Body
									form={form}
									companies={companies}
									lockedCompany={lockedCompany}
									selectedCompany={selectedCompany}
									folders={folders}
									nextFolderColor={nextFolderColor}
									onCreateFolder={handleCreateFolder}
									nameInputRefs={nameInputRefs}
									deadlineInputRef={deadlineInputRef}
									companyTriggerRef={companyTriggerRef}
									onAddPosition={handleAddPosition}
								/>
							</TooltipProvider>
						)}
						{step === 2 && <Step2Body form={form} ready={step2Ready} onReady={() => setStep2Ready(true)} />}
						{step === 3 && (
							<Step3Body
								form={form}
								folderName={selectedFolderName}
								ready={step3Ready}
								onReady={() => setStep3Ready(true)}
								regenerating={emailRegenerating}
								onRegenerate={handleRegenerateEmail}
							/>
						)}
					</div>

					<SheetFooter className={cn("sticky bottom-0 flex-row justify-between border-t", SURFACE_TINT)}>
						<div className="flex gap-2">
							{step === 1 && (
								<Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
									Отмена
								</Button>
							)}
							{step > 1 && (
								<Button type="button" variant="ghost" onClick={() => form.goBack()}>
									Назад
								</Button>
							)}
						</div>
						<Button type="button" onClick={handleAdvance}>
							{step === 3 ? "Создать" : "Далее"}
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>

			<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Закрыть без сохранения?</AlertDialogTitle>
						<AlertDialogDescription>Внесённые данные будут потеряны.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Продолжить</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={handleConfirmDiscard}>
							Закрыть без сохранения
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function Step2Body({
	form,
	ready,
	onReady,
}: {
	form: ReturnType<typeof useCreateTenderForm>;
	ready: boolean;
	onReady: () => void;
}) {
	const { step2, update2 } = form;

	useMountEffect(() => {
		if (ready) return undefined;
		const id = setTimeout(onReady, 5000);
		return () => clearTimeout(id);
	});

	if (!ready) {
		return (
			<div
				role="status"
				aria-live="polite"
				className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground"
			>
				<LoaderCircle aria-hidden="true" className="size-6 animate-spin text-primary motion-reduce:animate-none" />
				<p className="text-sm">Генерируем уточняющие вопросы…</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 pt-4 pb-2">
			{CREATION_QUESTIONS.map((question, index) => {
				const answer = step2.answers[question.id] ?? {};
				const freeTextId = `q-${question.id}-free`;
				return (
					<section
						key={question.id}
						aria-labelledby={`q-${question.id}-label`}
						className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4"
					>
						<div className="flex items-baseline gap-2.5">
							<span aria-hidden="true" className="text-sm font-medium tabular-nums text-muted-foreground">
								{index + 1}.
							</span>
							<h4 id={`q-${question.id}-label`} className="text-[15px] font-medium leading-snug text-foreground">
								{question.label}
							</h4>
						</div>
						<div className="flex flex-wrap gap-1.5">
							{question.options.map((option) => {
								const selected = answer.selectedOption === option;
								return (
									<button
										key={option}
										type="button"
										aria-pressed={selected}
										onClick={() =>
											update2(question.id, {
												selectedOption: selected ? undefined : option,
											})
										}
										className={cn(
											"rounded-full border px-3 py-1 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none",
											selected
												? "border-primary bg-primary text-primary-foreground"
												: "border-border bg-background text-foreground hover:bg-muted",
										)}
									>
										{option}
									</button>
								);
							})}
						</div>
						<Input
							id={freeTextId}
							placeholder="Введите свой вариант"
							value={answer.freeText ?? ""}
							onChange={(e) => update2(question.id, { freeText: e.target.value })}
							aria-label={`Свой вариант: ${question.label}`}
							className="h-8 bg-background/60 text-sm"
						/>
					</section>
				);
			})}
		</div>
	);
}

function Step3Body({
	form,
	folderName,
	ready,
	onReady,
	regenerating,
	onRegenerate,
}: {
	form: ReturnType<typeof useCreateTenderForm>;
	folderName: string | null;
	ready: boolean;
	onReady: () => void;
	regenerating: boolean;
	onRegenerate: () => void;
}) {
	const { step3, update3, seedEmail } = form;
	const bodyId = "tender-email-body";

	useMountEffect(() => {
		seedEmail(folderName);
		if (ready) return undefined;
		const id = window.setTimeout(onReady, 600);
		return () => window.clearTimeout(id);
	});

	if (!ready) {
		return (
			<div
				role="status"
				aria-live="polite"
				className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground"
			>
				<LoaderCircle aria-hidden="true" className="size-6 animate-spin text-primary motion-reduce:animate-none" />
				<p className="text-sm">Генерируем письмо…</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-0 pt-3">
			<SectionGroupHeader title="RFQ" />
			<div className="flex flex-col gap-4 border-t border-border py-4">
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between gap-2">
						<label htmlFor={bodyId} className="text-sm font-medium">
							Текст письма
						</label>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onRegenerate}
							disabled={regenerating}
							aria-label="Перегенерировать письмо"
						>
							<span aria-hidden="true" className="relative inline-flex size-4 items-center justify-center">
								<RefreshCw
									className={cn(
										"absolute size-4 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
										regenerating ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0",
									)}
								/>
								<LoaderCircle
									className={cn(
										"absolute size-4 animate-spin transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:animate-none motion-reduce:transition-none",
										regenerating ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]",
									)}
								/>
							</span>
							Перегенерировать
						</Button>
					</div>
					<Textarea
						id={bodyId}
						value={step3.body}
						onChange={(e) => update3("body", e.target.value)}
						spellCheck={false}
						rows={10}
						className="font-normal"
					/>
				</div>
			</div>

			<SectionGroupHeader title="Отправка" />
			<div className="flex flex-col gap-2 border-t border-border py-4">
				<CheckboxBadge
					id="tender-email-autosend"
					checked={step3.autoSend}
					onChange={(v) => update3("autoSend", v)}
					ariaLabel="Автоотправка запросов"
				>
					Автоотправка запросов
				</CheckboxBadge>
				<p className="text-pretty text-xs text-muted-foreground">
					Включите, чтобы разослать запросы всем поставщикам сразу после их нахождения
				</p>
			</div>
		</div>
	);
}

type CompanyList = ReturnType<typeof useProcurementCompanies>["data"];
type FolderList = NonNullable<ReturnType<typeof useFolders>["data"]>;

interface Step1BodyProps {
	form: ReturnType<typeof useCreateTenderForm>;
	companies: CompanyList;
	lockedCompany: CompanyList[number] | undefined;
	selectedCompany: CompanyList[number] | undefined;
	folders: FolderList;
	nextFolderColor: string;
	onCreateFolder: (name: string, color: string) => void;
	nameInputRefs: React.RefObject<(HTMLInputElement | null)[]>;
	deadlineInputRef: React.RefObject<HTMLInputElement | null>;
	companyTriggerRef: React.RefObject<HTMLButtonElement | null>;
	onAddPosition: () => void;
}

function Step1Body({
	form,
	companies,
	lockedCompany,
	selectedCompany,
	folders,
	nextFolderColor,
	onCreateFolder,
	nameInputRefs,
	deadlineInputRef,
	companyTriggerRef,
	onAddPosition,
}: Step1BodyProps) {
	const { step1, step1Errors, update1, updatePosition, removePosition, canAddPosition } = form;
	const companyDisabled = !!lockedCompany;
	const showRemove = step1.positions.length > 1;

	function handleFilesAdd(newFiles: FileList | null) {
		if (!newFiles) return;
		const currentTotal = step1.files.reduce((sum, f) => sum + f.size, 0);
		const toAdd: File[] = [];
		let runningTotal = currentTotal;
		for (const file of newFiles) {
			if (file.size > MAX_FILE_SIZE) continue;
			if (runningTotal + file.size > MAX_TOTAL_SIZE) break;
			toAdd.push(file);
			runningTotal += file.size;
		}
		if (toAdd.length > 0) update1("files", [...step1.files, ...toAdd]);
	}

	function handleFileRemove(index: number) {
		update1(
			"files",
			step1.files.filter((_, i) => i !== index),
		);
	}

	return (
		<div className="flex flex-col gap-0 pt-3">
			<SectionGroupHeader title="Запрос" />
			<div className="flex flex-col gap-4 border-t border-border py-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
					<Field label="Дедлайн" htmlFor="tender-deadline" hint={DEADLINE_TOOLTIP} required className="flex-1">
						<DateField
							id="tender-deadline"
							inputRef={deadlineInputRef}
							value={step1.deadline}
							onChange={(v) => update1("deadline", v)}
							ariaRequired
							ariaInvalid={!!step1Errors.deadline}
							ariaDescribedBy={step1Errors.deadline ? "tender-deadline-error" : undefined}
							hasError={!!step1Errors.deadline}
						/>
						{step1Errors.deadline && (
							<p id="tender-deadline-error" className="text-sm text-destructive">
								{step1Errors.deadline}
							</p>
						)}
					</Field>

					<Field label="Компания" required className="flex-1">
						<Select
							value={step1.companyId || undefined}
							onValueChange={(v) => {
								update1("companyId", v);
								const company = companies.find((c) => c.id === v);
								const mainAddress = company?.addresses.find((a) => a.isMain) ?? company?.addresses[0];
								update1("addressIds", mainAddress ? [mainAddress.id] : []);
							}}
							disabled={companyDisabled}
						>
							<SelectTrigger
								ref={companyTriggerRef}
								aria-label="Компания"
								aria-required="true"
								aria-invalid={step1Errors.company ? true : undefined}
								aria-describedby={step1Errors.company ? "company-error" : undefined}
								className={cn("w-full", step1Errors.company && "border-destructive", companyDisabled && "opacity-70")}
							>
								<SelectValue placeholder="— выберите —" />
							</SelectTrigger>
							<SelectContent position="popper">
								{companies.map((c) => (
									<SelectItem key={c.id} value={c.id}>
										{c.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{step1Errors.company && (
							<p id="company-error" className="text-sm text-destructive">
								{step1Errors.company}
							</p>
						)}
					</Field>
				</div>

				<Field label="Категория">
					<FolderSelect
						folders={folders}
						value={step1.folderId}
						onChange={(id) => update1("folderId", id)}
						onCreateFolder={onCreateFolder}
						nextFolderColor={nextFolderColor}
					/>
				</Field>
			</div>

			<SectionGroupHeader title="Позиции" />
			<div className="flex flex-col gap-3 border-t border-border py-4">
				<SingleSupplierBanner />
				{step1.positions.map((position, index) => (
					<PositionCard
						// biome-ignore lint/suspicious/noArrayIndexKey: positions are identified by index — no stable id available
						key={index}
						index={index}
						position={position}
						error={step1Errors.positions[index]}
						onChange={(key, value) => updatePosition(index, key, value)}
						onRemove={showRemove ? () => removePosition(index) : undefined}
						nameInputRef={(el) => {
							nameInputRefs.current[index] = el;
						}}
					>
						{index === 0 && (
							<FilesField files={step1.files} onFilesAdd={handleFilesAdd} onFileRemove={handleFileRemove} />
						)}
					</PositionCard>
				))}
				<div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onAddPosition}
						disabled={!canAddPosition}
						aria-label="Добавить позицию"
						className="active:scale-[0.96] transition-transform duration-100 motion-reduce:transition-none motion-reduce:active:scale-100"
					>
						<Plus aria-hidden="true" className="size-4" />
						Добавить позицию
					</Button>
				</div>

				<Field
					label="Комментарий"
					hint="Опишите дополнительные требования к позициям — ИИ учтёт их при поиске поставщиков и в переговорах"
					htmlFor="position-comment"
				>
					<Textarea
						id="position-comment"
						placeholder="Срочная поставка до 15-го числа"
						value={step1.additionalInfo}
						onChange={(e) => update1("additionalInfo", e.target.value)}
						rows={3}
					/>
				</Field>
			</div>

			<SectionGroupHeader title="Логистика" />
			<div className="flex flex-col gap-4 border-t border-border py-4">
				<Field label="Адрес доставки">
					<AddressSelect
						company={selectedCompany}
						value={step1.addressIds[0] ?? null}
						onChange={(id) => update1("addressIds", id ? [id] : [])}
					/>
				</Field>

				<Field label="Разгрузка">
					<OptionalSegmentedControl
						options={["supplier", "self"] as const}
						labels={UNLOADING_LABELS}
						value={step1.unloading}
						onChange={(v) => update1("unloading", v)}
					/>
				</Field>
			</div>

			<SectionGroupHeader title="Дополнительно" />
			<div className="flex flex-wrap gap-2 border-t border-border py-3">
				<CheckboxBadge
					id="cash-payment-allowed"
					checked={step1.cashPaymentAllowed}
					onChange={(v) => update1("cashPaymentAllowed", v)}
					ariaLabel="Допускается оплата наличными"
				>
					Допускается оплата наличными
				</CheckboxBadge>
				<CheckboxBadge
					id="analogues-not-allowed"
					checked={step1.analoguesNotAllowed}
					onChange={(v) => update1("analoguesNotAllowed", v)}
					ariaLabel="Аналоги не допускаются"
				>
					Аналоги не допускаются
				</CheckboxBadge>
			</div>
		</div>
	);
}

function SingleSupplierBanner() {
	return (
		<div
			role="note"
			className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100"
		>
			<Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
			<div className="flex flex-col gap-1.5">
				<p className="text-balance font-semibold">Важно: один запрос&nbsp;— один поставщик</p>
				<p className="text-pretty">
					Все позиции в рамках одного запроса должны поставляться одним поставщиком. Для товаров из разных категорий
					создавайте отдельные запросы.
				</p>
			</div>
		</div>
	);
}

interface PositionCardProps {
	index: number;
	position: PositionDraft;
	error: { name?: string } | undefined;
	onChange: <K extends keyof PositionDraft>(key: K, value: PositionDraft[K]) => void;
	onRemove?: () => void;
	nameInputRef: (el: HTMLInputElement | null) => void;
	children?: React.ReactNode;
}

function PositionCard({ index, position, error, onChange, onRemove, nameInputRef, children }: PositionCardProps) {
	const nameId = `position-${index}-name`;
	const descId = `position-${index}-description`;
	const qtyId = `position-${index}-qty`;
	const annualId = `position-${index}-annual`;
	const priceId = `position-${index}-price`;
	const innId = `position-${index}-inn`;
	const nameError = error?.name;
	const innEnabled = position.pricePerUnit.trim() !== "";

	return (
		<section
			aria-label={`Позиция ${index + 1}`}
			className={cn(
				"relative flex flex-col gap-4 rounded-xl border border-border/60 p-4 animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none",
				SURFACE_TINT,
				"[&_input]:bg-background [&_textarea]:bg-background [&_[data-slot=select-trigger]]:bg-background",
				"dark:[&_input]:bg-input/30 dark:[&_textarea]:bg-input/30 dark:[&_[data-slot=select-trigger]]:bg-input/30",
			)}
		>
			{onRemove && (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={onRemove}
					aria-label={`Удалить позицию ${index + 1}`}
					className="absolute right-2 top-2 text-muted-foreground hover:text-foreground active:scale-[0.96] transition-[color,scale] duration-100 motion-reduce:transition-none motion-reduce:active:scale-100 before:absolute before:-inset-1.5 before:content-['']"
				>
					<Trash2 aria-hidden="true" className="size-4" />
				</Button>
			)}

			<Field label="Название" htmlFor={nameId} required>
				<Input
					id={nameId}
					ref={nameInputRef}
					placeholder="Арматура А500С Ø12 мм"
					value={position.name}
					onChange={(e) => onChange("name", e.target.value)}
					spellCheck={false}
					autoComplete="off"
					aria-required="true"
					aria-invalid={nameError ? true : undefined}
					aria-describedby={nameError ? `${nameId}-error` : undefined}
					className={nameError ? "border-destructive" : undefined}
				/>
				{nameError && (
					<p id={`${nameId}-error`} className="text-sm text-destructive">
						{nameError}
					</p>
				)}
			</Field>

			<div className="flex flex-wrap gap-3">
				<Field label="Ед. изм." className="w-32 shrink-0">
					<Select value={position.unit || undefined} onValueChange={(v) => onChange("unit", v as typeof position.unit)}>
						<SelectTrigger aria-label="Единица измерения" className="w-full">
							<SelectValue placeholder="Выберите" />
						</SelectTrigger>
						<SelectContent>
							{UNITS.map((u) => (
								<SelectItem key={u} value={u}>
									{u}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
				<Field label="Кол-во в поставке" htmlFor={qtyId} className="flex-1 min-w-32">
					<Input
						id={qtyId}
						type="number"
						inputMode="numeric"
						min={0}
						placeholder="50"
						value={position.quantityPerDelivery}
						onChange={(e) => onChange("quantityPerDelivery", e.target.value)}
						autoComplete="off"
						aria-label="Количество в поставке"
						className="tabular-nums"
					/>
				</Field>
				<Field label="Объём в год" htmlFor={annualId} className="flex-1 min-w-32">
					<Input
						id={annualId}
						type="number"
						inputMode="numeric"
						min={0}
						placeholder="600"
						value={position.annualQuantity}
						onChange={(e) => onChange("annualQuantity", e.target.value)}
						autoComplete="off"
						aria-label="Объём в год"
						className="tabular-nums"
					/>
				</Field>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-start">
				<Field label="Текущая цена без НДС" htmlFor={priceId} className="flex-1 min-w-0">
					<div className="flex items-center gap-1.5">
						<Input
							id={priceId}
							placeholder="1250"
							value={position.pricePerUnit}
							onChange={(e) => onChange("pricePerUnit", e.target.value.replace(/[^\d.]/g, ""))}
							inputMode="decimal"
							autoComplete="off"
							aria-label="Текущая цена без НДС"
							className="flex-1 tabular-nums"
						/>
						<span className="text-sm text-muted-foreground">₽</span>
					</div>
				</Field>
				<Field label="ИНН текущего поставщика" htmlFor={innId} className="flex-1 min-w-0">
					<Input
						id={innId}
						value={position.currentSupplierInn}
						onChange={(e) => onChange("currentSupplierInn", e.target.value.replace(/\D/g, ""))}
						inputMode="numeric"
						autoComplete="off"
						spellCheck={false}
						aria-label="ИНН текущего поставщика"
						disabled={!innEnabled}
						className="tabular-nums"
					/>
				</Field>
			</div>

			<Field label="Спецификация" hint="Описание позиции" htmlFor={descId}>
				<Input
					id={descId}
					placeholder="По ГОСТ 34028-2016"
					value={position.description}
					onChange={(e) => onChange("description", e.target.value)}
					spellCheck={false}
					autoComplete="off"
				/>
			</Field>

			{children}
		</section>
	);
}

interface FilesFieldProps {
	files: File[];
	onFilesAdd: (files: FileList | null) => void;
	onFileRemove: (index: number) => void;
}

function FilesField({ files, onFilesAdd, onFileRemove }: FilesFieldProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	return (
		<Field
			label="Прикрепить файлы"
			hint="Прикрепите макеты, спецификации и другие документы — это поможет поставщикам сделать точный расчёт"
		>
			<button
				type="button"
				aria-label="Прикрепить файлы"
				className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-input bg-background/40 p-4 text-center transition-colors hover:border-primary focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none"
				onClick={() => fileInputRef.current?.click()}
				onDragOver={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
				onDrop={(e) => {
					e.preventDefault();
					e.stopPropagation();
					onFilesAdd(e.dataTransfer.files);
				}}
			>
				<p className="text-sm text-muted-foreground">Перетащите файлы сюда или нажмите для выбора</p>
				<p className="text-xs text-muted-foreground">Макс. 10&nbsp;МБ на файл, 25&nbsp;МБ суммарно</p>
			</button>
			<input
				ref={fileInputRef}
				type="file"
				multiple
				className="hidden"
				onChange={(e) => {
					onFilesAdd(e.target.files);
					e.target.value = "";
				}}
			/>
			{files.length > 0 && (
				<ul className="mt-1 flex flex-col gap-1">
					{files.map((file, i) => (
						<li key={`${file.name}-${file.size}`} className="flex items-center gap-2 text-sm">
							<span className="min-w-0 flex-1 truncate">{file.name}</span>
							<span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								onClick={() => onFileRemove(i)}
								aria-label={`Удалить ${file.name}`}
							>
								<X aria-hidden="true" />
							</Button>
						</li>
					))}
				</ul>
			)}
		</Field>
	);
}

interface AddressSelectProps {
	company: CompanyList[number] | undefined;
	value: string | null;
	onChange: (id: string | null) => void;
}

function AddressSelect({ company, value, onChange }: AddressSelectProps) {
	const [open, setOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const createMutation = useCreateAddress(company?.id ?? "");

	const addresses = company?.addresses ?? [];
	const selected = value ? addresses.find((a) => a.id === value) : undefined;
	const disabled = !company;

	function handleSelect(id: string | null) {
		onChange(id);
		setCreating(false);
		setOpen(false);
	}

	function handleCreate(text: string) {
		if (!company) return;
		const trimmed = text.trim();
		if (!trimmed) {
			setCreating(false);
			return;
		}
		createMutation.mutate(
			{ name: trimmed.slice(0, 32), address: trimmed, phone: "", isMain: false },
			{
				onSuccess: (created) => {
					onChange(created.id);
				},
			},
		);
		setCreating(false);
		setOpen(false);
	}

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) setCreating(false);
			}}
		>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					aria-label="Адрес доставки"
					disabled={disabled}
					className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground")}
				>
					<span className="min-w-0 flex-1 truncate text-left">
						{selected?.address ?? (company ? "Выберите адрес" : "Сначала выберите компанию")}
					</span>
					<ChevronDown aria-hidden="true" className="ml-2 size-4 opacity-60" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-(--radix-popover-trigger-width) gap-1 p-1">
				{addresses.map((a) => (
					<button
						key={a.id}
						type="button"
						onClick={() => handleSelect(a.id)}
						className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-hidden"
					>
						<span className="truncate">{a.address}</span>
						{a.id === value && <Check aria-hidden="true" className="ml-auto size-3.5 opacity-70" />}
					</button>
				))}
				{addresses.length > 0 && <div className="my-1 border-t border-border" />}
				{creating ? (
					<CreateAddressRow onSave={handleCreate} onCancel={() => setCreating(false)} />
				) : (
					<button
						type="button"
						onClick={() => setCreating(true)}
						className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-accent focus-visible:bg-accent focus-visible:outline-hidden"
					>
						<Plus className="size-3.5" aria-hidden="true" />
						<span>Добавить адрес</span>
					</button>
				)}
			</PopoverContent>
		</Popover>
	);
}

function CreateAddressRow({ onSave, onCancel }: { onSave: (text: string) => void; onCancel: () => void }) {
	const { inputRef, handleKeyDown, handleBlur } = useInlineEdit({
		onSave,
		onCancel,
		deferFocus: true,
	});

	return (
		<div className="flex items-center gap-2 rounded-md px-2 py-1.5">
			<input
				ref={inputRef}
				type="text"
				className="h-5 flex-1 bg-transparent text-sm outline-none"
				placeholder="г. Москва, ул. Ленина, 1"
				aria-label="Новый адрес доставки"
				autoComplete="street-address"
				spellCheck={false}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
			/>
		</div>
	);
}
