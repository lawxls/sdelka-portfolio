import { CircleHelp, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AddressMultiSelect } from "@/components/ui/address-multi-select";
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
import { FolderSelect } from "@/components/ui/folder-select";
import { Input } from "@/components/ui/input";
import { OptionalSegmentedControl, SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { formatFileSize, formatGroupedInteger } from "@/lib/format";
import { useAddPositionForm } from "./use-add-position-form";

interface AddPositionsDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (item: NewItemInput) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;

const STEP_TITLES: Record<1 | 2 | 3, string> = {
	1: "Заполните данные по позиции",
	2: "Заполните данные по текущему поставщику",
	3: "Дополнительные вопросы",
};

function HintTooltip({ text }: { text: string }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Подсказка">
					<CircleHelp className="size-3.5" aria-hidden="true" />
				</button>
			</TooltipTrigger>
			<TooltipContent>{text}</TooltipContent>
		</Tooltip>
	);
}

function SectionLabel({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
	return (
		<div className="border-t border-border py-3">
			<div className="flex items-center gap-1.5">
				<span className="text-sm font-medium">{label}</span>
				{hint && <HintTooltip text={hint} />}
			</div>
			<div className="mt-3 flex flex-wrap items-center gap-3">{children}</div>
		</div>
	);
}

function SectionGroupHeader({ title }: { title: string }) {
	return <h3 className="mt-5 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>;
}

export function AddPositionsDrawer({ open, onOpenChange, onSubmit }: AddPositionsDrawerProps) {
	const { data: companies } = useProcurementCompanies();
	const { data: folders = [] } = useFolders();
	const createFolderMutation = useCreateFolder();

	const form = useAddPositionForm({
		resolveAddressStrings: (companyId, ids) => {
			if (!companyId) return [];
			const company = companies.find((c) => c.id === companyId);
			if (!company) return [];
			return company.addresses.filter((a) => ids.includes(a.id)).map((a) => a.address);
		},
	});

	const { step, step1 } = form;

	const [showConfirm, setShowConfirm] = useState(false);
	const nameInputRef = useRef<HTMLInputElement>(null);
	const companyTriggerRef = useRef<HTMLButtonElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const selectedCompany = step1.companyId ? companies.find((c) => c.id === step1.companyId) : undefined;

	function handleCreateFolder(name: string) {
		createFolderMutation.mutate(
			{ name, color: nextUnusedColor(folders) },
			{
				onSuccess: (created) => {
					form.update1("folderId", created.id);
				},
			},
		);
	}

	function handleAdvance() {
		if (step === 1) {
			const ok = form.advance();
			if (!ok) {
				setTimeout(() => {
					if (!step1.companyId) companyTriggerRef.current?.focus();
					else if (!step1.name.trim()) nameInputRef.current?.focus();
				}, 0);
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
		toast.success("Позиция создана");
		form.reset();
		onOpenChange(false);
	}

	function handleClose() {
		if (form.isDirty) {
			setShowConfirm(true);
			return;
		}
		form.reset();
		onOpenChange(false);
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			if (form.isDirty) {
				setShowConfirm(true);
				return;
			}
			form.reset();
		}
		onOpenChange(nextOpen);
	}

	function handleConfirmDiscard() {
		setShowConfirm(false);
		form.reset();
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

	const progressPercent = step === 1 ? 33 : step === 2 ? 66 : 100;

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
						<div className="mt-3 flex flex-col gap-1.5">
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
							<p className="text-xs text-muted-foreground">
								Шаг {step} из 3 — {STEP_TITLES[step]}
							</p>
						</div>
					</SheetHeader>

					<div className="flex-1 overflow-y-auto px-4">
						<TooltipProvider>
							{step === 1 && (
								<Step1Body
									form={form}
									companies={companies}
									selectedCompany={selectedCompany}
									folders={folders}
									nextFolderColor={nextUnusedColor(folders)}
									onCreateFolder={handleCreateFolder}
									nameInputRef={nameInputRef}
									companyTriggerRef={companyTriggerRef}
									fileInputRef={fileInputRef}
									onFilesAdd={handleFilesAdd}
									onFileRemove={handleFileRemove}
								/>
							)}
							{step === 2 && <Step2Body form={form} />}
							{step === 3 && <StepPlaceholder title="Дополнительные вопросы — скоро" />}
						</TooltipProvider>
					</div>

					<SheetFooter className="sticky bottom-0 flex-row justify-between border-t bg-background">
						<div className="flex gap-2">
							<Button type="button" variant="ghost" onClick={handleClose}>
								Отмена
							</Button>
							{step > 1 && (
								<Button type="button" variant="outline" onClick={() => form.goBack()}>
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

	return (
		<div className="flex flex-col gap-4 pt-4">
			<Input
				placeholder="Название"
				value={step2.companyName}
				onChange={(e) => update2("companyName", e.target.value)}
				autoComplete="organization"
				aria-label="Название текущего поставщика"
			/>

			<div>
				<Input
					placeholder="ИНН"
					value={step2.inn}
					onChange={(e) => update2("inn", e.target.value)}
					onBlur={blurInn}
					inputMode="numeric"
					autoComplete="off"
					spellCheck={false}
					aria-label="ИНН"
					aria-invalid={step2Errors.inn ? true : undefined}
					aria-describedby={step2Errors.inn ? "inn-error" : undefined}
					className={step2Errors.inn ? "border-destructive" : undefined}
				/>
				{step2Errors.inn && (
					<p id="inn-error" className="mt-1 text-sm text-destructive">
						{step2Errors.inn}
					</p>
				)}
			</div>

			<div className="flex items-center gap-1.5">
				<Input
					placeholder="Текущая цена без НДС"
					value={step2.pricePerUnit}
					onChange={(e) => update2("pricePerUnit", e.target.value.replace(/[^\d.]/g, ""))}
					inputMode="decimal"
					autoComplete="off"
					aria-label="Текущая цена без НДС"
					className="flex-1"
				/>
				<span className="text-sm text-muted-foreground">₽</span>
			</div>

			<div className="flex flex-col gap-2">
				<span className="text-sm font-medium">Условия оплаты</span>
				<div className="flex flex-wrap items-center gap-3">
					<SegmentedControl
						options={PAYMENT_TYPES}
						labels={PAYMENT_TYPE_LABELS}
						value={step2.paymentType}
						onChange={(v) => update2("paymentType", v)}
					/>
					{step2.paymentType === "deferred" && (
						<div className="flex items-center gap-1.5">
							<Input
								type="number"
								inputMode="numeric"
								min={0}
								placeholder="Дней"
								value={step2.deferralDays}
								onChange={(e) => update2("deferralDays", e.target.value)}
								aria-label="Дней отсрочки"
								autoComplete="off"
								className="w-24"
							/>
							<span className="text-sm text-muted-foreground">дней</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function StepPlaceholder({ title }: { title: string }) {
	return (
		<div className="flex h-full items-center justify-center py-8">
			<p className="text-sm text-muted-foreground">{title}</p>
		</div>
	);
}

type CompanyList = ReturnType<typeof useProcurementCompanies>["data"];
type FolderList = NonNullable<ReturnType<typeof useFolders>["data"]>;

interface Step1BodyProps {
	form: ReturnType<typeof useAddPositionForm>;
	companies: CompanyList;
	selectedCompany: CompanyList[number] | undefined;
	folders: FolderList;
	nextFolderColor: string;
	onCreateFolder: (name: string) => void;
	nameInputRef: React.RefObject<HTMLInputElement | null>;
	companyTriggerRef: React.RefObject<HTMLButtonElement | null>;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onFilesAdd: (files: FileList | null) => void;
	onFileRemove: (index: number) => void;
}

function Step1Body({
	form,
	companies,
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
	const deliveryCostVisible = step1.deliveryCostType === "paid" || step1.deliveryCostType === "pickup";

	return (
		<div className="flex flex-col gap-0 pt-3">
			<SectionGroupHeader title="Позиция" />
			<div className="flex flex-col gap-3 border-t border-border py-3">
				<div>
					<Select
						value={step1.companyId || undefined}
						onValueChange={(v) => {
							update1("companyId", v);
							const company = companies.find((c) => c.id === v);
							update1("addressIds", company?.addresses.map((a) => a.id) ?? []);
						}}
					>
						<SelectTrigger
							ref={companyTriggerRef}
							aria-label="Компания"
							aria-required="true"
							aria-invalid={step1Errors.company ? true : undefined}
							aria-describedby={step1Errors.company ? "company-error" : undefined}
							className={step1Errors.company ? "w-full border-destructive" : "w-full"}
						>
							<SelectValue placeholder="Компания *" />
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
						<p id="company-error" className="mt-1 text-sm text-destructive">
							{step1Errors.company}
						</p>
					)}
				</div>

				<FolderSelect
					folders={folders}
					value={step1.folderId}
					onChange={(id) => update1("folderId", id)}
					onCreateFolder={onCreateFolder}
					nextFolderColor={nextFolderColor}
				/>

				<div>
					<Input
						ref={nameInputRef}
						placeholder="Название *"
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
						<p id="name-error" className="mt-1 text-sm text-destructive">
							{step1Errors.name}
						</p>
					)}
				</div>

				<Input
					placeholder="Спецификация (Описание)"
					value={step1.description}
					onChange={(e) => update1("description", e.target.value)}
					spellCheck={false}
					autoComplete="off"
				/>

				<div className="flex flex-wrap gap-2">
					<Select value={step1.unit || undefined} onValueChange={(v) => update1("unit", v as typeof step1.unit)}>
						<SelectTrigger aria-label="Единица измерения" className="w-32">
							<SelectValue placeholder="Ед. изм." />
						</SelectTrigger>
						<SelectContent>
							{UNITS.map((u) => (
								<SelectItem key={u} value={u}>
									{u}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Input
						type="number"
						inputMode="numeric"
						min={0}
						placeholder="Кол-во в поставке"
						value={step1.quantityPerDelivery}
						onChange={(e) => update1("quantityPerDelivery", e.target.value)}
						autoComplete="off"
						className="flex-1 min-w-32"
					/>
					<Input
						type="number"
						inputMode="numeric"
						min={0}
						placeholder="Объём в год"
						value={step1.annualQuantity}
						onChange={(e) => update1("annualQuantity", e.target.value)}
						autoComplete="off"
						className="flex-1 min-w-32"
					/>
				</div>
			</div>

			<SectionGroupHeader title="Логистика" />
			<div className="flex flex-col gap-3 border-t border-border py-3">
				<div className="flex flex-col gap-1.5">
					<span className="text-sm text-muted-foreground">Адреса доставки</span>
					<AddressMultiSelect
						addresses={selectedCompany?.addresses ?? []}
						selectedIds={step1.addressIds}
						onChange={(ids) => update1("addressIds", ids)}
						placeholder={selectedCompany ? "Выберите адреса" : "Сначала выберите компанию"}
						disabled={!selectedCompany}
					/>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<Select
						value={step1.deliveryCostType ?? undefined}
						onValueChange={(v) => update1("deliveryCostType", v as typeof step1.deliveryCostType)}
					>
						<SelectTrigger aria-label="Доставка" className="w-44">
							<SelectValue placeholder="Доставка" />
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
								placeholder="Стоимость"
								value={formatGroupedInteger(step1.deliveryCost)}
								onChange={(e) => update1("deliveryCost", e.target.value.replace(/\D/g, ""))}
								aria-label="Стоимость доставки"
								autoComplete="off"
								className="w-32"
							/>
							<span className="text-sm text-muted-foreground">₽</span>
						</div>
					)}
				</div>

				<SectionLabel label="Разгрузка">
					<OptionalSegmentedControl
						options={["supplier", "self"] as const}
						labels={UNLOADING_LABELS}
						value={step1.unloading}
						onChange={(v) => update1("unloading", v)}
					/>
				</SectionLabel>
			</div>

			<SectionGroupHeader title="Финансы" />
			<div className="flex flex-col gap-3 border-t border-border py-3">
				<SectionLabel label="Оплата">
					<SegmentedControl
						options={PAYMENT_METHODS}
						labels={PAYMENT_METHOD_LABELS}
						value={step1.paymentMethod}
						onChange={(v) => update1("paymentMethod", v)}
					/>
				</SectionLabel>
				<div className="flex items-center gap-2 pb-1">
					<Checkbox
						id="deferral-required"
						checked={step1.deferralRequired}
						onCheckedChange={(checked) => update1("deferralRequired", checked === true)}
						aria-label="Отсрочка нужна"
					/>
					<label htmlFor="deferral-required" className="text-sm">
						Отсрочка нужна
					</label>
				</div>
			</div>

			<SectionGroupHeader title="Дополнительно" />
			<div className="flex flex-col gap-3 border-t border-border py-3">
				<div className="flex items-center gap-2">
					<Checkbox
						id="sample-required"
						checked={step1.sampleRequired}
						onCheckedChange={(checked) => update1("sampleRequired", checked === true)}
						aria-label="Нужен образец"
					/>
					<label htmlFor="sample-required" className="text-sm">
						Нужен образец
					</label>
				</div>
				<div className="flex items-center gap-2">
					<Checkbox
						id="analogues-allowed"
						checked={step1.analoguesAllowed}
						onCheckedChange={(checked) => update1("analoguesAllowed", checked === true)}
						aria-label="Аналоги допускаются"
					/>
					<label htmlFor="analogues-allowed" className="text-sm">
						Допускаются аналоги
					</label>
				</div>

				<div>
					<label htmlFor="comment" className="mb-1.5 block text-sm font-medium">
						Комментарий
					</label>
					<Textarea
						id="comment"
						placeholder="Введите комментарий…"
						value={step1.additionalInfo}
						onChange={(e) => update1("additionalInfo", e.target.value)}
						rows={3}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<span className="text-sm font-medium">Прикрепить файл</span>
					<button
						type="button"
						className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-input p-4 text-center transition-colors hover:border-primary"
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
						<ul className="flex flex-col gap-1">
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
				</div>
			</div>
		</div>
	);
}
