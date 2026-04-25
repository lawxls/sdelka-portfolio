import { CircleHelp, LoaderCircle, X } from "lucide-react";
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
import { FolderSelect } from "@/components/ui/folder-select";
import { Input } from "@/components/ui/input";
import { OptionalSegmentedControl, SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CREATION_QUESTIONS } from "@/data/mock-creation-questions";
import type { NewItemInput } from "@/data/types";
import {
	DELIVERY_COST_TYPE_LABELS,
	PAYMENT_METHOD_LABELS,
	PAYMENT_METHODS,
	PAYMENT_TYPE_LABELS,
	PAYMENT_TYPES,
	UNITS,
	UNLOADING_LABELS,
} from "@/data/types";
import { useProcurementCompanies } from "@/data/use-companies";
import { nextUnusedColor, useCreateFolder, useFolders } from "@/data/use-folders";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { formatFileSize, formatGroupedInteger } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAddPositionForm, type WizardStep } from "./use-add-position-form";

interface AddPositionsDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (item: NewItemInput) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;

const STEP_TITLES: Record<WizardStep, string> = {
	1: "Заполните данные по позиции",
	2: "Заполните данные по текущему поставщику",
	3: "Дополнительные вопросы",
};

function SectionGroupHeader({ title }: { title: string }) {
	return <h3 className="mt-5 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>;
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

export function AddPositionsDrawer({ open, onOpenChange, onSubmit }: AddPositionsDrawerProps) {
	const { data: companies } = useProcurementCompanies();
	const { data: folders = [] } = useFolders();
	const createFolderMutation = useCreateFolder();

	const companiesById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

	const form = useAddPositionForm({
		resolveAddressStrings: (companyId, ids) => {
			const company = companiesById.get(companyId);
			if (!company) return [];
			const wanted = new Set(ids);
			return company.addresses.filter((a) => wanted.has(a.id)).map((a) => a.address);
		},
	});

	const { step, step1 } = form;

	const [showConfirm, setShowConfirm] = useState(false);
	const [step3Ready, setStep3Ready] = useState(false);
	const nameInputRef = useRef<HTMLInputElement>(null);
	const companyTriggerRef = useRef<HTMLButtonElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

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
				if (result.focus === "company") companyTriggerRef.current?.focus();
				else if (result.focus === "name") nameInputRef.current?.focus();
			}
			return;
		}
		if (step === 2) {
			form.advance();
			return;
		}
		handleSubmit();
	}

	function handleSubmit() {
		const payload = form.toPayload();
		onSubmit(payload);
		form.reset();
		setStep3Ready(false);
		onOpenChange(false);
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			if (form.isDirty) {
				setShowConfirm(true);
				return;
			}
			form.reset();
			setStep3Ready(false);
		}
		onOpenChange(nextOpen);
	}

	function handleConfirmDiscard() {
		setShowConfirm(false);
		form.reset();
		setStep3Ready(false);
		onOpenChange(false);
	}

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
		if (toAdd.length > 0) {
			form.update1("files", [...step1.files, ...toAdd]);
		}
	}

	function handleFileRemove(index: number) {
		form.update1(
			"files",
			step1.files.filter((_, i) => i !== index),
		);
	}

	const progressPercent = Math.floor((step * 100) / 3);

	return (
		<>
			<Sheet open={open} onOpenChange={handleOpenChange}>
				<SheetContent
					showCloseButton={false}
					className="flex flex-col gap-0 max-md:!w-full max-md:!max-w-full max-md:!inset-0 max-md:!rounded-none"
				>
					<SheetHeader className="border-b pb-4">
						<SheetTitle>Добавить позицию</SheetTitle>
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
								<span className="font-medium text-foreground">Шаг {step} из 3</span>
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
									nameInputRef={nameInputRef}
									companyTriggerRef={companyTriggerRef}
									fileInputRef={fileInputRef}
									onFilesAdd={handleFilesAdd}
									onFileRemove={handleFileRemove}
								/>
							</TooltipProvider>
						)}
						{step === 2 && <Step2Body form={form} />}
						{step === 3 && <Step3Body form={form} ready={step3Ready} onReady={() => setStep3Ready(true)} />}
					</div>

					<SheetFooter className="sticky bottom-0 flex-row justify-between border-t bg-background">
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

function Step2Body({ form }: { form: ReturnType<typeof useAddPositionForm> }) {
	const { step2, step2Errors, update2, blurInn } = form;
	const deliveryCostVisible = step2.deliveryCostType === "paid";
	// «Ваш поставщик» downstream fields stay locked until Название, ИНН and Цена are all
	// filled — otherwise we'd persist a supplier record with no identifiable counterparty
	// or price, which leaks into the Поставщики/Предложения tabs as an unnamed row.
	const supplierBaseFilled =
		step2.companyName.trim() !== "" && step2.inn.trim() !== "" && step2.pricePerUnit.trim() !== "";

	return (
		<div className="flex flex-col gap-4 pt-4">
			<Field label="Название поставщика" htmlFor="supplier-name">
				<Input
					id="supplier-name"
					placeholder="ООО «МеталлТрейд»"
					value={step2.companyName}
					onChange={(e) => update2("companyName", e.target.value)}
					autoComplete="organization"
					aria-label="Название текущего поставщика"
				/>
			</Field>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
				<Field label="ИНН" htmlFor="supplier-inn" className="flex-1">
					<Input
						id="supplier-inn"
						placeholder="7712345678"
						value={step2.inn}
						onChange={(e) => update2("inn", e.target.value)}
						onBlur={blurInn}
						inputMode="numeric"
						autoComplete="off"
						spellCheck={false}
						aria-invalid={step2Errors.inn ? true : undefined}
						aria-describedby={step2Errors.inn ? "inn-error" : undefined}
						className={cn("w-full", step2Errors.inn && "border-destructive")}
					/>
					{step2Errors.inn && (
						<p id="inn-error" className="text-sm text-destructive">
							{step2Errors.inn}
						</p>
					)}
				</Field>

				<Field label="Текущая цена без НДС" htmlFor="supplier-price" className="flex-1">
					<div className="flex items-center gap-1.5">
						<Input
							id="supplier-price"
							placeholder="1250"
							value={step2.pricePerUnit}
							onChange={(e) => update2("pricePerUnit", e.target.value.replace(/[^\d.]/g, ""))}
							inputMode="decimal"
							autoComplete="off"
							className="flex-1"
						/>
						<span className="text-sm text-muted-foreground">₽</span>
					</div>
				</Field>
			</div>

			<Field label="Условия оплаты">
				<div className="flex flex-wrap items-center gap-3">
					<SegmentedControl
						options={PAYMENT_TYPES}
						labels={PAYMENT_TYPE_LABELS}
						value={step2.paymentType}
						onChange={(v) => update2("paymentType", v)}
						disabled={!supplierBaseFilled}
					/>
					{step2.paymentType === "deferred" && (
						<div className="flex items-center gap-1.5">
							<Input
								type="number"
								inputMode="numeric"
								min={0}
								placeholder="30"
								value={step2.deferralDays}
								onChange={(e) => update2("deferralDays", e.target.value)}
								aria-label="Дней отсрочки"
								autoComplete="off"
								className="w-24"
								disabled={!supplierBaseFilled}
							/>
							<span className="text-sm text-muted-foreground">дней</span>
						</div>
					)}
					{step2.paymentType === "prepayment" && (
						<div className="flex items-center gap-1.5">
							<Input
								type="number"
								inputMode="numeric"
								min={1}
								max={100}
								value={step2.prepaymentPercent}
								onChange={(e) => update2("prepaymentPercent", e.target.value)}
								aria-label="Размер предоплаты"
								autoComplete="off"
								className="w-20 tabular-nums"
								disabled={!supplierBaseFilled}
							/>
							<span className="text-sm text-muted-foreground">%</span>
						</div>
					)}
				</div>
			</Field>

			<Field label="Доставка">
				<div className="flex flex-wrap items-center gap-3">
					<Select
						value={step2.deliveryCostType ?? undefined}
						onValueChange={(v) => update2("deliveryCostType", v as typeof step2.deliveryCostType)}
						disabled={!supplierBaseFilled}
					>
						<SelectTrigger aria-label="Доставка" className="w-44">
							<SelectValue placeholder="Выберите тип" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="free">{DELIVERY_COST_TYPE_LABELS.free}</SelectItem>
							<SelectItem value="paid">{DELIVERY_COST_TYPE_LABELS.paid}</SelectItem>
							<SelectItem value="pickup">{DELIVERY_COST_TYPE_LABELS.pickup}</SelectItem>
						</SelectContent>
					</Select>
					{deliveryCostVisible && (
						<div className="flex items-center gap-1.5">
							<Input
								inputMode="numeric"
								placeholder="15 000"
								value={formatGroupedInteger(step2.deliveryCost)}
								onChange={(e) => update2("deliveryCost", e.target.value.replace(/\D/g, ""))}
								aria-label="Стоимость доставки"
								autoComplete="off"
								className="w-32"
								disabled={!supplierBaseFilled}
							/>
							<span className="text-sm text-muted-foreground">₽</span>
						</div>
					)}
				</div>
			</Field>
		</div>
	);
}

function Step3Body({
	form,
	ready,
	onReady,
}: {
	form: ReturnType<typeof useAddPositionForm>;
	ready: boolean;
	onReady: () => void;
}) {
	const { step3, update3 } = form;

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
				const answer = step3.answers[question.id] ?? {};
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
											update3(question.id, {
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
							onChange={(e) => update3(question.id, { freeText: e.target.value })}
							aria-label={`Свой вариант: ${question.label}`}
							className="h-8 bg-background/60 text-sm"
						/>
					</section>
				);
			})}
		</div>
	);
}

type CompanyList = ReturnType<typeof useProcurementCompanies>["data"];
type FolderList = NonNullable<ReturnType<typeof useFolders>["data"]>;

interface Step1BodyProps {
	form: ReturnType<typeof useAddPositionForm>;
	companies: CompanyList;
	lockedCompany: CompanyList[number] | undefined;
	selectedCompany: CompanyList[number] | undefined;
	folders: FolderList;
	nextFolderColor: string;
	onCreateFolder: (name: string, color: string) => void;
	nameInputRef: React.RefObject<HTMLInputElement | null>;
	companyTriggerRef: React.RefObject<HTMLButtonElement | null>;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onFilesAdd: (files: FileList | null) => void;
	onFileRemove: (index: number) => void;
}

function Step1Body({
	form,
	companies,
	lockedCompany,
	selectedCompany,
	folders,
	nextFolderColor,
	onCreateFolder,
	nameInputRef,
	companyTriggerRef,
	fileInputRef,
	onFilesAdd,
	onFileRemove,
}: Step1BodyProps) {
	const { step1, step1Errors, update1 } = form;
	const companyDisabled = !!lockedCompany;

	return (
		<div className="flex flex-col gap-0 pt-3">
			<SectionGroupHeader title="Позиция" />
			<div className="flex flex-col gap-4 border-t border-border py-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
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

					<Field label="Категория" className="flex-1">
						<FolderSelect
							folders={folders}
							value={step1.folderId}
							onChange={(id) => update1("folderId", id)}
							onCreateFolder={onCreateFolder}
							nextFolderColor={nextFolderColor}
						/>
					</Field>
				</div>

				<Field label="Название" htmlFor="position-name" required>
					<Input
						id="position-name"
						ref={nameInputRef}
						placeholder="Арматура А500С Ø12 мм"
						value={step1.name}
						onChange={(e) => update1("name", e.target.value)}
						autoFocus
						spellCheck={false}
						autoComplete="off"
						aria-required="true"
						aria-invalid={step1Errors.name ? true : undefined}
						aria-describedby={step1Errors.name ? "name-error" : undefined}
						className={step1Errors.name ? "border-destructive" : undefined}
					/>
					{step1Errors.name && (
						<p id="name-error" className="text-sm text-destructive">
							{step1Errors.name}
						</p>
					)}
				</Field>

				<Field label="Спецификация" hint="Описание позиции" htmlFor="position-description">
					<Input
						id="position-description"
						placeholder="По ГОСТ 34028-2016"
						value={step1.description}
						onChange={(e) => update1("description", e.target.value)}
						spellCheck={false}
						autoComplete="off"
					/>
				</Field>

				<div className="flex flex-wrap gap-3">
					<Field label="Ед. изм." className="w-32 shrink-0">
						<Select value={step1.unit || undefined} onValueChange={(v) => update1("unit", v as typeof step1.unit)}>
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
					<Field label="Кол-во в поставке" htmlFor="position-qty-delivery" className="flex-1 min-w-32">
						<Input
							id="position-qty-delivery"
							type="number"
							inputMode="numeric"
							min={0}
							placeholder="50"
							value={step1.quantityPerDelivery}
							onChange={(e) => update1("quantityPerDelivery", e.target.value)}
							autoComplete="off"
							aria-label="Количество в поставке"
						/>
					</Field>
					<Field label="Объём в год" htmlFor="position-annual" className="flex-1 min-w-32">
						<Input
							id="position-annual"
							type="number"
							inputMode="numeric"
							min={0}
							placeholder="600"
							value={step1.annualQuantity}
							onChange={(e) => update1("annualQuantity", e.target.value)}
							autoComplete="off"
							aria-label="Объём в год"
						/>
					</Field>
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

				<Field
					label="Прикрепить файлы"
					hint="Прикрепите макеты, спецификации и другие документы — это поможет поставщикам сделать точный расчёт"
				>
					<button
						type="button"
						aria-label="Прикрепить файлы"
						className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-input p-4 text-center transition-colors hover:border-primary focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none"
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
					{step1.files.length > 0 && (
						<ul className="mt-1 flex flex-col gap-1">
							{step1.files.map((file, i) => (
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
			</div>

			<SectionGroupHeader title="Логистика и Финансы" />
			<div className="flex flex-col gap-4 border-t border-border py-4">
				<Field label="Адрес доставки">
					<Select
						value={step1.addressIds[0] ?? undefined}
						onValueChange={(v) => update1("addressIds", v ? [v] : [])}
						disabled={!selectedCompany || (selectedCompany?.addresses.length ?? 0) === 0}
					>
						<SelectTrigger aria-label="Адрес доставки" className="w-full">
							<SelectValue placeholder={selectedCompany ? "Выберите адрес" : "Сначала выберите компанию"} />
						</SelectTrigger>
						<SelectContent>
							{(selectedCompany?.addresses ?? []).map((a) => (
								<SelectItem key={a.id} value={a.id}>
									{a.address}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				<Field label="Разгрузка">
					<OptionalSegmentedControl
						options={["supplier", "self"] as const}
						labels={UNLOADING_LABELS}
						value={step1.unloading}
						onChange={(v) => update1("unloading", v)}
					/>
				</Field>

				<Field label="Оплата">
					<SegmentedControl
						options={PAYMENT_METHODS}
						labels={PAYMENT_METHOD_LABELS}
						value={step1.paymentMethod}
						onChange={(v) => update1("paymentMethod", v)}
					/>
				</Field>

				<CheckboxBadge
					id="deferral-required"
					checked={step1.deferralRequired}
					onChange={(v) => update1("deferralRequired", v)}
					ariaLabel="Отсрочка нужна"
				>
					Отсрочка нужна
				</CheckboxBadge>
			</div>

			<SectionGroupHeader title="Дополнительно" />
			<div className="flex flex-wrap gap-2 border-t border-border py-3">
				<CheckboxBadge
					id="sample-required"
					checked={step1.sampleRequired}
					onChange={(v) => update1("sampleRequired", v)}
					ariaLabel="Нужен образец"
				>
					Нужен образец
				</CheckboxBadge>
				<CheckboxBadge
					id="analogues-allowed"
					checked={step1.analoguesAllowed}
					onChange={(v) => update1("analoguesAllowed", v)}
					ariaLabel="Аналоги допускаются"
				>
					Допускаются аналоги
				</CheckboxBadge>
			</div>
		</div>
	);
}
