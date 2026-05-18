import {
	Check,
	ChevronDown,
	CircleHelp,
	Info,
	LoaderCircle,
	Package,
	Plus,
	RefreshCw,
	Search,
	Trash2,
	TriangleAlert,
	X,
} from "lucide-react";
// biome-ignore lint/style/noRestrictedImports: one-time external sync from React Query data (no stable mount point fits here)
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxBadge } from "@/components/ui/checkbox-badge";
import { DateField } from "@/components/ui/date-field";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { FolderSelect } from "@/components/ui/folder-select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OptionalSegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { CreateCompanyPayload } from "@/data/domains/companies";
import type { ProcurementInquiry } from "@/data/domains/procurement-inquiries";
import { PICKABLE_ITEM_STATUSES, type ProcurementItem, UNITS, UNLOADING_LABELS } from "@/data/types";
import { useProcurementCompanies } from "@/data/use-companies";
import { useCompanyDetail, useCreateAddress, useCreateCompany } from "@/data/use-company-detail";
import { nextUnusedColor, useCreateFolder, useFolders } from "@/data/use-folders";
import { useGeneratePreview } from "@/data/use-generated-questions";
import { useAllItems } from "@/data/use-items";
import { useProcurementInquiries } from "@/data/use-procurement-inquiries";
import { useInlineEdit } from "@/hooks/use-inline-edit";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { formatCurrency, pluralizeRu } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CompanyCreationSheet } from "./company-creation-sheet";
import { CurrentSupplierDialog } from "./current-supplier-dialog";
import { ProcurementStatusIcon, STATUS_CONFIG } from "./procurement-card";
import {
	type CreateProcurementInquiryPayload,
	type CurrentSupplierDraft,
	type PositionDraft,
	useCreateProcurementInquiryForm,
	type WizardStep,
} from "./use-create-procurement-inquiry-form";

interface CreateProcurementInquiryDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (payload: CreateProcurementInquiryPayload) => void;
}

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
export const SURFACE_TINT =
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

export function CreateProcurementInquiryDrawer({ open, onOpenChange, onSubmit }: CreateProcurementInquiryDrawerProps) {
	const { data: companies, isLoading: companiesLoading } = useProcurementCompanies();
	const { data: folders = [] } = useFolders();
	const createFolderMutation = useCreateFolder();

	const companiesById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
	const hasNoCompanies = !companiesLoading && companies.length === 0;

	const form = useCreateProcurementInquiryForm();

	const { step, step1 } = form;

	const [showConfirm, setShowConfirm] = useState(false);
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
				else if (result.focus === "company") {
					companyTriggerRef.current?.focus();
					if (hasNoCompanies) toast.error("Для создания запроса необходимо создать компанию");
				} else if (result.focus === "name") nameInputRefs.current[result.positionIndex ?? 0]?.focus();
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
									companiesLoading={companiesLoading}
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
						{step === 2 && <Step2Body form={form} onSkip={() => form.advance()} />}
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

/** Floor on loader visibility so a fast success doesn't flash. */
const PREVIEW_LOADER_MIN_MS = 400;

function buildPreviewInput(step1: Step1ForPreview) {
	return {
		positions: step1.positions
			.filter((p) => p.name.trim() !== "")
			.map((p) => {
				const desc = p.description.trim();
				return desc ? { name: p.name.trim(), description: desc } : { name: p.name.trim() };
			}),
		folderId: step1.folderId,
		additionalInfo: step1.additionalInfo.trim() || undefined,
	};
}

interface Step1ForPreview {
	positions: { name: string; description: string }[];
	folderId: string | null;
	additionalInfo: string;
}

function Step2Body({ form, onSkip }: { form: ReturnType<typeof useCreateProcurementInquiryForm>; onSkip: () => void }) {
	const { step1, step2, setGeneratedQuestions, updateGeneratedAnswer } = form;
	const preview = useGeneratePreview();
	const [minLoaderElapsed, setMinLoaderElapsed] = useState(false);
	const minLoaderTimerRef = useRef<number | null>(null);
	// Late preview responses can land after the user has left Step 2 (Back, or
	// advance-while-loading). Ignore them so a stale success can't repopulate
	// `generatedQuestions` or call `onSkip` against a wizard that has moved on.
	const aliveRef = useRef(true);

	const step1Ref = useRef(step1);
	step1Ref.current = step1;
	const setQsRef = useRef(setGeneratedQuestions);
	setQsRef.current = setGeneratedQuestions;
	const onSkipRef = useRef(onSkip);
	onSkipRef.current = onSkip;
	const previewRef = useRef(preview);
	previewRef.current = preview;

	function runPreview() {
		setMinLoaderElapsed(false);
		if (minLoaderTimerRef.current !== null) window.clearTimeout(minLoaderTimerRef.current);
		minLoaderTimerRef.current = window.setTimeout(() => setMinLoaderElapsed(true), PREVIEW_LOADER_MIN_MS);
		previewRef.current.reset();
		previewRef.current.mutate(buildPreviewInput(step1Ref.current), {
			onSuccess: (data) => {
				if (!aliveRef.current) return;
				if (data.questions.length === 0) {
					// Mock never returns 0; a future LLM might. Persist nothing and
					// auto-advance so the wizard doesn't get stuck on an empty Step 2.
					setQsRef.current([]);
					onSkipRef.current();
					return;
				}
				setQsRef.current(
					data.questions.map((q) => ({ questionText: q.questionText, suggests: q.suggests, answer: "" })),
				);
			},
		});
	}

	// Each Step 1→2 transition remounts this body, so the preview fires once
	// per entry. Mock backend returns a different random subset per call; the
	// real LLM will eventually base output on the latest positions.
	useMountEffect(() => {
		aliveRef.current = true;
		runPreview();
		return () => {
			aliveRef.current = false;
			if (minLoaderTimerRef.current !== null) {
				window.clearTimeout(minLoaderTimerRef.current);
				minLoaderTimerRef.current = null;
			}
		};
	});

	if (preview.isPending || !minLoaderElapsed) {
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

	if (preview.isError) {
		return (
			<div
				role="alert"
				className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground"
			>
				<TriangleAlert aria-hidden="true" className="size-6 text-destructive" />
				<p className="text-sm text-foreground">Не удалось загрузить вопросы</p>
				<div className="flex gap-2">
					<Button type="button" variant="outline" size="sm" onClick={runPreview}>
						Повторить
					</Button>
					<Button type="button" variant="ghost" size="sm" onClick={onSkip}>
						Пропустить
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 pt-4 pb-2">
			{step2.generatedQuestions.map((question, index) => {
				const labelId = `q-${index}-label`;
				const freeTextId = `q-${index}-free`;
				const selectedChip = question.suggests.find((s) => s === question.answer);
				const freeText = selectedChip === undefined ? question.answer : "";
				return (
					<section
						// biome-ignore lint/suspicious/noArrayIndexKey: questions identified positionally — no stable id available
						key={index}
						aria-labelledby={labelId}
						className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4"
					>
						<div className="flex items-baseline gap-2.5">
							<span aria-hidden="true" className="text-sm font-medium tabular-nums text-muted-foreground">
								{index + 1}.
							</span>
							<h4 id={labelId} className="text-[15px] font-medium leading-snug text-foreground">
								{question.questionText}
							</h4>
						</div>
						<div className="flex flex-wrap gap-1.5">
							{question.suggests.map((suggest) => {
								const selected = selectedChip === suggest;
								return (
									<button
										key={suggest}
										type="button"
										aria-pressed={selected}
										onClick={() => updateGeneratedAnswer(index, selected ? "" : suggest)}
										className={cn(
											"rounded-full border px-3 py-1 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none",
											selected
												? "border-primary bg-primary text-primary-foreground"
												: "border-border bg-background text-foreground hover:bg-muted",
										)}
									>
										{suggest}
									</button>
								);
							})}
						</div>
						<Input
							id={freeTextId}
							placeholder="Введите свой вариант"
							value={freeText}
							onChange={(e) => updateGeneratedAnswer(index, e.target.value)}
							aria-label={`Свой вариант: ${question.questionText}`}
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
	form: ReturnType<typeof useCreateProcurementInquiryForm>;
	folderName: string | null;
	ready: boolean;
	onReady: () => void;
	regenerating: boolean;
	onRegenerate: () => void;
}) {
	const { step3, update3, seedEmail } = form;
	const bodyId = "procurement-inquiry-email-body";

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
					id="procurement-inquiry-email-autosend"
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
	form: ReturnType<typeof useCreateProcurementInquiryForm>;
	companies: CompanyList;
	companiesLoading: boolean;
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
	companiesLoading,
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
	const { step1, step1Errors, update1, updatePosition, removePosition, setPositions, canAddPosition } = form;
	const companyDisabled = !!lockedCompany;
	const showRemove = step1.positions.length > 1;
	const [pickerOpen, setPickerOpen] = useState(false);
	const [activeSupplierPositionIndex, setActiveSupplierPositionIndex] = useState<number | null>(null);
	const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
	const createCompanyMutation = useCreateCompany();
	const activeSupplierInitial =
		activeSupplierPositionIndex !== null ? step1.positions[activeSupplierPositionIndex]?.currentSupplier : undefined;
	const hasNoCompanies = !companiesLoading && companies.length === 0;

	function handleSubmitCreateCompany(data: CreateCompanyPayload) {
		createCompanyMutation.mutate(data, {
			onSuccess: (created) => {
				update1("companyId", created.id);
				const mainAddress = created.addresses.find((a) => a.isMain) ?? created.addresses[0];
				if (mainAddress) update1("deliveryAddressId", mainAddress.id);
				setCreateCompanyOpen(false);
			},
			onError: () => {
				// The HTTP adapter's two-step create POSTs the company before the
				// address. If the address step fails, the company is already
				// server-side — close the sheet so a retry inside it can't create
				// a duplicate. The user retries the address from the company drawer.
				setCreateCompanyOpen(false);
				toast.error("Не удалось создать компанию полностью. Откройте её, чтобы добавить адрес.");
			},
		});
	}

	return (
		<div className="flex flex-col gap-0 pt-3">
			<SectionGroupHeader title="Запрос" />
			<div className="flex flex-col gap-4 border-t border-border py-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
					<Field
						label="Дедлайн"
						htmlFor="procurement-inquiry-deadline"
						hint={DEADLINE_TOOLTIP}
						required
						className="flex-1"
					>
						<DateField
							id="procurement-inquiry-deadline"
							inputRef={deadlineInputRef}
							value={step1.deadline}
							onChange={(v) => update1("deadline", v)}
							ariaRequired
							ariaInvalid={!!step1Errors.deadline}
							ariaDescribedBy={step1Errors.deadline ? "procurement-inquiry-deadline-error" : undefined}
							hasError={!!step1Errors.deadline}
						/>
						{step1Errors.deadline && (
							<p id="procurement-inquiry-deadline-error" className="text-sm text-destructive">
								{step1Errors.deadline}
							</p>
						)}
					</Field>

					<Field label="Компания" required className="flex-1">
						{hasNoCompanies ? (
							<Button
								ref={companyTriggerRef}
								type="button"
								variant="outline"
								className={cn("w-full justify-center", step1Errors.company && "border-destructive")}
								onClick={() => setCreateCompanyOpen(true)}
								aria-label="Создать компанию"
								aria-invalid={step1Errors.company ? true : undefined}
								aria-describedby={step1Errors.company ? "company-error" : undefined}
								data-testid="create-company-cta"
							>
								<Plus className="size-4" aria-hidden="true" />
								Создать компанию
							</Button>
						) : (
							<Select
								value={step1.companyId || undefined}
								onValueChange={(v) => {
									update1("companyId", v);
									update1("deliveryAddressId", null);
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
						)}
						{step1Errors.company && (
							<p id="company-error" className="text-sm text-destructive">
								{hasNoCompanies ? "Создайте компанию" : step1Errors.company}
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

				<Field label="Скопировать поставщиков" hint="Скопируйте поставщиков из уже существующего запроса">
					<CopySuppliersSelect
						value={step1.copySuppliersFromInquiryId}
						onChange={(id) => update1("copySuppliersFromInquiryId", id)}
					/>
				</Field>
			</div>

			<SectionGroupHeader title="Позиции" />
			<div className="flex flex-col gap-3 border-t border-border py-4">
				<SingleSupplierBanner />
				<Button
					type="button"
					variant="outline"
					className="w-full"
					onClick={() => setPickerOpen(true)}
					aria-label="Выбрать позиции из списка"
				>
					<Package aria-hidden="true" className="size-4" />
					Выбрать позиции
				</Button>
				<PickPositionsDialog
					open={pickerOpen}
					onOpenChange={setPickerOpen}
					onApply={(items) => {
						setPositions(items.map(itemToPositionDraft));
						setPickerOpen(false);
					}}
				/>
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
						onOpenSupplier={() => setActiveSupplierPositionIndex(index)}
					/>
				))}
				{activeSupplierPositionIndex !== null && (
					<CurrentSupplierDialog
						open
						onOpenChange={(o) => {
							if (!o) setActiveSupplierPositionIndex(null);
						}}
						initial={activeSupplierInitial}
						onSave={(supplier: CurrentSupplierDraft) => {
							updatePosition(activeSupplierPositionIndex, "currentSupplier", supplier);
							setActiveSupplierPositionIndex(null);
						}}
					/>
				)}
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
			</div>

			<SectionGroupHeader title="Логистика" />
			<div className="flex flex-col gap-4 border-t border-border py-4">
				<Field label="Адрес доставки">
					<AddressSelect
						companyId={selectedCompany?.id ?? null}
						value={step1.deliveryAddressId}
						onChange={(id) => update1("deliveryAddressId", id)}
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
			<div className="flex flex-col gap-4 border-t border-border py-4">
				<div className="flex flex-wrap gap-2">
					<CheckboxBadge
						id="cash-payment-allowed"
						checked={step1.cashAllowed}
						onChange={(v) => update1("cashAllowed", v)}
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

			<CompanyCreationSheet
				open={createCompanyOpen}
				onOpenChange={(open) => {
					setCreateCompanyOpen(open);
					if (!open) createCompanyMutation.reset();
				}}
				onSubmit={handleSubmitCreateCompany}
				isPending={createCompanyMutation.isPending}
			/>
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
				<p className="text-balance font-semibold">Важно: один запрос&nbsp;— одна отрасль</p>
				<p className="text-pretty">
					Все позиции в рамках одного запроса должны поставляться поставщиками из одной отрасли. Для товаров из разных
					категорий создавайте отдельные запросы.
				</p>
			</div>
		</div>
	);
}

export interface PositionCardProps {
	index: number;
	position: PositionDraft;
	error: { name?: string } | undefined;
	onChange: <K extends keyof PositionDraft>(key: K, value: PositionDraft[K]) => void;
	onRemove?: () => void;
	nameInputRef: (el: HTMLInputElement | null) => void;
	onOpenSupplier: () => void;
}

export function PositionCard({
	index,
	position,
	error,
	onChange,
	onRemove,
	nameInputRef,
	onOpenSupplier,
}: PositionCardProps) {
	const nameId = `position-${index}-name`;
	const descId = `position-${index}-description`;
	const qtyId = `position-${index}-qty`;
	const annualId = `position-${index}-annual`;
	const nameError = error?.name;
	const supplier = position.currentSupplier;

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

			<Field label="Описание / уточнения" htmlFor={descId}>
				<Textarea
					id={descId}
					placeholder="Опишите дополнительные требования к позиции"
					value={position.description}
					onChange={(e) => onChange("description", e.target.value)}
					rows={3}
				/>
			</Field>

			<div className="flex flex-wrap gap-3">
				<Field label="Ед. изм." className="w-32 shrink-0">
					<UnitCardSelect value={position.unit} onChange={(v) => onChange("unit", v)} />
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

			{supplier ? (
				<CurrentSupplierSummary
					supplier={supplier}
					onEdit={onOpenSupplier}
					onRemove={() => onChange("currentSupplier", undefined)}
				/>
			) : (
				<Button
					type="button"
					variant="outline"
					onClick={onOpenSupplier}
					aria-label="Добавить текущего поставщика"
					className="w-full border-dashed border-foreground/25 text-foreground/80 hover:border-foreground/45 hover:bg-background hover:text-foreground dark:border-foreground/30 dark:hover:bg-background"
				>
					<Plus aria-hidden="true" className="size-4" />
					Добавить текущего поставщика
				</Button>
			)}
		</section>
	);
}

interface CurrentSupplierSummaryProps {
	supplier: NonNullable<PositionDraft["currentSupplier"]>;
	onEdit: () => void;
	onRemove: () => void;
}

function CurrentSupplierSummary({ supplier, onEdit, onRemove }: CurrentSupplierSummaryProps) {
	const priceNum = supplier.pricePerUnit.trim() === "" ? null : Number(supplier.pricePerUnit);
	const deliveryNum = supplier.deliveryCost.trim() === "" ? null : Number(supplier.deliveryCost);
	return (
		<div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/60 p-3 dark:bg-input/20">
			<div className="flex items-start gap-2">
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
						Текущий поставщик
					</span>
					<span className="text-sm font-medium text-foreground break-words">
						{supplier.companyName || supplier.inn}
					</span>
					{supplier.companyName && (
						<span className="text-xs text-muted-foreground tabular-nums">ИНН {supplier.inn}</span>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Button type="button" variant="ghost" size="sm" onClick={onEdit}>
						Изменить
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={onRemove}
						aria-label="Удалить текущего поставщика"
						className="relative text-muted-foreground hover:text-foreground before:absolute before:-inset-1.5 before:content-['']"
					>
						<X aria-hidden="true" className="size-4" />
					</Button>
				</div>
			</div>
			<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
				<span className="text-muted-foreground">
					Цена: <span className="text-foreground">{priceNum !== null ? formatCurrency(priceNum) : "—"}</span>
				</span>
				<span className="text-muted-foreground">
					Доставка: <span className="text-foreground">{deliveryNum !== null ? formatCurrency(deliveryNum) : "—"}</span>
				</span>
			</div>
		</div>
	);
}

function UnitCardSelect({
	value,
	onChange,
}: {
	value: PositionDraft["unit"];
	onChange: (v: PositionDraft["unit"]) => void;
}) {
	const [open, setOpen] = useState(false);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					aria-label="Единица измерения"
					className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
				>
					<span className="truncate">{value || "Выберите"}</span>
					<ChevronDown aria-hidden="true" className="size-4 opacity-60" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-56 rounded-xl p-1.5">
				<div className="grid grid-cols-4 gap-1.5" role="listbox" aria-label="Единицы измерения">
					{UNITS.map((u) => {
						const selected = u === value;
						return (
							<button
								key={u}
								type="button"
								role="option"
								aria-selected={selected}
								onClick={() => {
									onChange(u);
									setOpen(false);
								}}
								className={cn(
									"flex h-10 items-center justify-center rounded-md border text-sm tabular-nums transition-[color,background-color,border-color,scale] duration-100 motion-reduce:transition-none active:scale-[0.96] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
									selected
										? "border-primary bg-primary text-primary-foreground"
										: "border-border bg-background hover:border-primary/60 hover:bg-accent",
								)}
							>
								{u}
							</button>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);
}

const NEW_SEARCH_LABEL = "Новый поиск";

function CopySuppliersSelect({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
	const [open, setOpen] = useState(false);
	const { items, isLoading } = useProcurementInquiries(
		{ sort: "createdAt", dir: "desc", limit: 50 },
		{ enabled: open },
	);
	const candidates = useMemo(() => items.filter((t) => t.suppliersCount > 0), [items]);
	const selected = value ? items.find((t) => t.id === value) : undefined;
	const labelId = useId();

	function handlePick(id: string | null) {
		onChange(id);
		setOpen(false);
	}

	const triggerLabel = selected ? selected.name : NEW_SEARCH_LABEL;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					aria-labelledby={labelId}
					className="w-full justify-between font-normal"
				>
					<span id={labelId} className="min-w-0 flex-1 truncate text-left">
						{triggerLabel}
					</span>
					<ChevronDown aria-hidden="true" className="ml-2 size-4 opacity-60" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				collisionPadding={16}
				onWheel={(e) => e.stopPropagation()}
				className="w-(--radix-popover-trigger-width) min-w-72 max-h-[60vh] overflow-y-auto overscroll-contain rounded-xl p-1.5"
			>
				<button
					type="button"
					onClick={() => handlePick(null)}
					aria-pressed={value === null}
					className={cn(
						"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-hidden",
						value === null && "bg-accent text-accent-foreground",
					)}
				>
					<span className="min-w-0 flex-1 font-medium">{NEW_SEARCH_LABEL}</span>
					{value === null && <Check aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />}
				</button>
				{isLoading && <p className="px-2 py-2 text-sm text-muted-foreground">Загружаем запросы…</p>}
				{!isLoading && candidates.length === 0 && (
					<p className="px-2 py-2 text-sm text-muted-foreground">Нет запросов с поставщиками</p>
				)}
				{candidates.map((procurementInquiry) => (
					<CopySuppliersRow
						key={procurementInquiry.id}
						procurementInquiry={procurementInquiry}
						selected={procurementInquiry.id === value}
						onSelect={() => handlePick(procurementInquiry.id)}
					/>
				))}
			</PopoverContent>
		</Popover>
	);
}

function CopySuppliersRow({
	procurementInquiry,
	selected,
	onSelect,
}: {
	procurementInquiry: ProcurementInquiry;
	selected: boolean;
	onSelect: () => void;
}) {
	const status = STATUS_CONFIG[procurementInquiry.status];
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={selected}
			className={cn(
				"flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-hidden",
				selected && "bg-accent text-accent-foreground",
			)}
		>
			<div className="flex items-center gap-2">
				<span className="flex min-w-0 flex-1 items-center gap-1.5">
					<span className="min-w-0 truncate font-medium">{procurementInquiry.name}</span>
					<span
						role="img"
						aria-label={status.label}
						className={cn("inline-flex shrink-0 items-center", status.className)}
					>
						<ProcurementStatusIcon status={procurementInquiry.status} iconClassName="size-3.5" />
					</span>
				</span>
				{selected && <Check aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />}
			</div>
			<p className="text-xs text-muted-foreground tabular-nums">
				{pluralizeRu(procurementInquiry.suppliersCount, "поставщик", "поставщика", "поставщиков")}
			</p>
		</button>
	);
}

function itemToPositionDraft(item: ProcurementItem): PositionDraft {
	return {
		name: item.name,
		description: item.description ?? "",
		unit: item.unit ?? "",
		quantityPerDelivery: item.quantityPerDelivery !== undefined ? String(item.quantityPerDelivery) : "",
		annualQuantity: String(item.annualQuantity),
	};
}

interface PickPositionsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onApply: (items: ProcurementItem[]) => void;
}

function PickPositionsDialog({ open, onOpenChange, onApply }: PickPositionsDialogProps) {
	const { data: allItems, isLoading } = useAllItems({ enabled: open });
	const [query, setQuery] = useState("");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

	useEffect(() => {
		if (open) return;
		setQuery("");
		setSelectedIds(new Set());
	}, [open]);

	const candidates = useMemo(() => {
		const pickable = (allItems ?? []).filter((item) => PICKABLE_ITEM_STATUSES.has(item.status));
		const trimmed = query.trim().toLowerCase();
		if (!trimmed) return pickable;
		return pickable.filter((item) => item.name.toLowerCase().includes(trimmed));
	}, [allItems, query]);

	function toggle(id: string) {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function handleApply() {
		const picked = (allItems ?? []).filter((item) => selectedIds.has(item.id));
		onApply(picked);
	}

	const selectedCount = selectedIds.size;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[28rem]">
				<DialogHeader className="gap-3 pr-8">
					<DialogTitle>Выбрать позиции</DialogTitle>
					<DialogDescription>Выберите позиции, которые хотите добавить в запрос</DialogDescription>
				</DialogHeader>
				<div className="relative">
					<Search
						aria-hidden="true"
						className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Поиск по названию"
						aria-label="Поиск позиций"
						spellCheck={false}
						autoComplete="off"
						className="pl-8"
					/>
				</div>
				<ul
					className="-mx-1 flex max-h-[60vh] flex-col overflow-y-auto overscroll-contain"
					aria-label="Доступные позиции"
				>
					{isLoading && <li className="px-2 py-6 text-center text-sm text-muted-foreground">Загружаем позиции…</li>}
					{!isLoading && candidates.length === 0 && (
						<li className="px-2 py-6 text-center text-sm text-muted-foreground">
							{query.trim() ? "Ничего не найдено" : "Нет позиций, готовых к добавлению"}
						</li>
					)}
					{candidates.map((item) => (
						<PickPositionRow
							key={item.id}
							item={item}
							checked={selectedIds.has(item.id)}
							onToggle={() => toggle(item.id)}
						/>
					))}
				</ul>
				<DialogFooter>
					<Button type="button" onClick={handleApply} disabled={selectedCount === 0}>
						Добавить
						{selectedCount > 0 && <span className="ml-1 tabular-nums">({selectedCount})</span>}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function PickPositionRow({
	item,
	checked,
	onToggle,
}: {
	item: ProcurementItem;
	checked: boolean;
	onToggle: () => void;
}) {
	const status = STATUS_CONFIG[item.status];
	const checkboxId = `pick-position-${item.id}`;
	return (
		<li>
			<label
				htmlFor={checkboxId}
				className="group/field flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent hover:text-accent-foreground"
			>
				<Checkbox id={checkboxId} checked={checked} onCheckedChange={() => onToggle()} />
				<span className="flex min-w-0 flex-1 items-center gap-1.5">
					<span className="min-w-0 truncate text-sm">{item.name}</span>
					<span
						role="img"
						aria-label={status.label}
						className={cn("inline-flex shrink-0 items-center", status.className)}
					>
						<ProcurementStatusIcon status={item.status} iconClassName="size-3.5" />
					</span>
				</span>
			</label>
		</li>
	);
}

interface AddressSelectProps {
	companyId: string | null;
	value: string | null;
	onChange: (id: string | null) => void;
}

function AddressSelect({ companyId, value, onChange }: AddressSelectProps) {
	const [open, setOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const detailQuery = useCompanyDetail(companyId);
	const createMutation = useCreateAddress(companyId ?? "");

	const addresses = detailQuery.data?.addresses ?? [];
	const selected = value ? addresses.find((a) => a.id === value) : undefined;
	const isLoading = companyId != null && detailQuery.isLoading;
	const disabled = !companyId || isLoading;

	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	useEffect(() => {
		if (!companyId) return;
		if (!detailQuery.data) return;
		if (value && detailQuery.data.addresses.some((a) => a.id === value)) return;
		const main = detailQuery.data.addresses.find((a) => a.isMain) ?? detailQuery.data.addresses[0];
		if (main) onChangeRef.current(main.id);
	}, [companyId, detailQuery.data, value]);

	function handleSelect(id: string | null) {
		onChange(id);
		setCreating(false);
		setOpen(false);
	}

	function handleCreate(text: string) {
		if (!companyId) return;
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

	function placeholderLabel() {
		if (!companyId) return "Сначала выберите компанию";
		if (isLoading) return "Загружаем адреса…";
		return "Выберите адрес";
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
					<span className="min-w-0 flex-1 truncate text-left">{selected?.address ?? placeholderLabel()}</span>
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
