import { Plus } from "lucide-react";
// biome-ignore lint/style/noRestrictedImports: re-seeds Company/Категория from URL state when the sheet re-opens — no stable mount point fits here
import { useEffect, useRef, useState } from "react";
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
import { FolderSelect } from "@/components/ui/folder-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CompanySummary, Folder, NewItemInput } from "@/data/types";
import { SURFACE_TINT } from "@/lib/class-presets";
import { toNumberOrUndefined } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Field, PositionCard, SectionGroupHeader } from "./create-procurement-inquiry-drawer";
import { CurrentSupplierDialog } from "./current-supplier-dialog";
import {
	type CurrentSupplierDraft,
	defaultPosition,
	isPositionDraftDirty,
	type PositionDraft,
} from "./use-create-procurement-inquiry-form";

interface PositionError {
	name?: string;
}

interface GeneralInfoError {
	companyId?: string;
}

interface AddPositionsManualDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** `folderId` is forwarded separately so the parent can decide whether to wrap
	 * the batch in an inquiry that carries the category (items have no folder FK). */
	onSubmit: (items: NewItemInput[], folderId: string | null) => void;
	companies: CompanySummary[];
	folders: Folder[];
	/** Returns the persisted folder so the drawer can auto-select it. Without
	 * the awaited id the popover closes and `folderId` stays at whatever the
	 * user had before — the in-line "create" gesture would silently fail to
	 * stamp the category onto the submitted items. */
	onCreateFolder: (name: string, color: string) => Promise<Folder>;
	nextFolderColor: string;
	initialCompanyId?: string;
	initialFolderId?: string | null;
}

function toItemInput(position: PositionDraft, companyId: string): NewItemInput {
	const payload: NewItemInput = { name: position.name.trim(), companyId };

	const description = position.description.trim();
	if (description) payload.description = description;
	if (position.unit !== "") payload.unit = position.unit;

	const annual = toNumberOrUndefined(position.annualQuantity);
	if (annual !== undefined) payload.annualQuantity = annual;

	const perDelivery = toNumberOrUndefined(position.quantityPerDelivery);
	if (perDelivery !== undefined) payload.quantityPerDelivery = perDelivery;

	const price = toNumberOrUndefined(position.currentSupplier?.pricePerUnit ?? "");
	if (price !== undefined) payload.currentPrice = price;

	return payload;
}

export function AddPositionsManualDrawer({
	open,
	onOpenChange,
	onSubmit,
	companies,
	folders,
	onCreateFolder,
	nextFolderColor,
	initialCompanyId,
	initialFolderId,
}: AddPositionsManualDrawerProps) {
	const [positions, setPositions] = useState<PositionDraft[]>(() => [defaultPosition()]);
	const [errors, setErrors] = useState<PositionError[]>(() => [{}]);
	const [companyId, setCompanyId] = useState<string>(initialCompanyId ?? "");
	const [folderId, setFolderId] = useState<string | null>(initialFolderId ?? null);
	const [generalInfoErrors, setGeneralInfoErrors] = useState<GeneralInfoError>({});
	const [showDiscard, setShowDiscard] = useState(false);
	const [activeSupplierPositionIndex, setActiveSupplierPositionIndex] = useState<number | null>(null);
	const activeSupplierInitial =
		activeSupplierPositionIndex !== null ? positions[activeSupplierPositionIndex]?.currentSupplier : undefined;
	const nameInputRefs = useRef<(HTMLInputElement | null)[]>([]);
	const companyTriggerRef = useRef<HTMLButtonElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-seed only on open transitions; keeping `initialCompanyId`/`initialFolderId` out of deps avoids snapping the user's choices back to URL state mid-edit
	useEffect(() => {
		if (!open) return;
		setCompanyId(initialCompanyId ?? "");
		setFolderId(initialFolderId ?? null);
		setGeneralInfoErrors({});
	}, [open]);

	const isDirty =
		positions.length > 1 ||
		positions.some(isPositionDraftDirty) ||
		companyId !== (initialCompanyId ?? "") ||
		folderId !== (initialFolderId ?? null);
	const canAddPosition = (() => {
		const last = positions[positions.length - 1];
		return !!last && last.name.trim() !== "";
	})();
	const showRemove = positions.length > 1;

	function reset() {
		setPositions([defaultPosition()]);
		setErrors([{}]);
		setCompanyId(initialCompanyId ?? "");
		setFolderId(initialFolderId ?? null);
		setGeneralInfoErrors({});
	}

	function updatePosition<K extends keyof PositionDraft>(index: number, key: K, value: PositionDraft[K]) {
		setPositions((prev) => {
			const current = prev[index];
			if (!current || current[key] === value) return prev;
			const next = prev.slice();
			next[index] = { ...current, [key]: value };
			return next;
		});
		if (key === "name") {
			setErrors((prev) => {
				if (!prev[index]?.name) return prev;
				const next = prev.slice();
				next[index] = { ...next[index], name: undefined };
				return next;
			});
		}
	}

	function addPosition() {
		const newIndex = positions.length;
		setPositions((prev) => [...prev, defaultPosition()]);
		setErrors((prev) => [...prev, {}]);
		queueMicrotask(() => nameInputRefs.current[newIndex]?.focus());
	}

	function removePosition(index: number) {
		setPositions((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
		setErrors((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
	}

	function validate(): { ok: boolean; focus: "company" | "name"; firstPositionErrorIndex: number } {
		const nextPositionErrors = positions.map((p) => (p.name.trim() ? {} : { name: "Укажите название позиции" }));
		const firstPositionErrorIndex = nextPositionErrors.findIndex((e) => e.name);
		const nextGeneralErrors: GeneralInfoError = companyId ? {} : { companyId: "Выберите компанию" };

		setErrors(nextPositionErrors);
		setGeneralInfoErrors(nextGeneralErrors);

		if (nextGeneralErrors.companyId) {
			return { ok: false, focus: "company", firstPositionErrorIndex };
		}
		if (firstPositionErrorIndex >= 0) {
			return { ok: false, focus: "name", firstPositionErrorIndex };
		}
		return { ok: true, focus: "name", firstPositionErrorIndex };
	}

	function handleSubmit() {
		const result = validate();
		if (!result.ok) {
			if (result.focus === "company") companyTriggerRef.current?.focus();
			else nameInputRefs.current[result.firstPositionErrorIndex]?.focus();
			return;
		}
		onSubmit(
			positions.map((p) => toItemInput(p, companyId)),
			folderId,
		);
		reset();
		onOpenChange(false);
	}

	function handleOpenChange(next: boolean) {
		if (!next) {
			if (isDirty) {
				setShowDiscard(true);
				return;
			}
			reset();
		}
		onOpenChange(next);
	}

	function handleConfirmDiscard() {
		setShowDiscard(false);
		reset();
		onOpenChange(false);
	}

	function handleCompanyChange(next: string) {
		setCompanyId(next);
		if (generalInfoErrors.companyId) {
			setGeneralInfoErrors((prev) => ({ ...prev, companyId: undefined }));
		}
	}

	return (
		<>
			<Sheet open={open} onOpenChange={handleOpenChange}>
				<SheetContent
					showCloseButton={false}
					className="flex flex-col gap-0 max-md:!w-full max-md:!max-w-full max-md:!inset-0 max-md:!rounded-none"
				>
					<SheetHeader className={cn("border-b", SURFACE_TINT)}>
						<SheetTitle>Добавить позиции</SheetTitle>
						<SheetDescription className="sr-only">Заполните карточки позиций для добавления в список</SheetDescription>
					</SheetHeader>

					<div className="flex-1 overflow-y-auto px-4 py-4">
						<TooltipProvider>
							<div className="flex flex-col gap-3">
								<SectionGroupHeader title="Общая информация" className="mt-2" />
								<Field label="Компания" required htmlFor="add-positions-company">
									<Select value={companyId || undefined} onValueChange={handleCompanyChange}>
										<SelectTrigger
											id="add-positions-company"
											ref={companyTriggerRef}
											aria-label="Компания"
											aria-required="true"
											aria-invalid={generalInfoErrors.companyId ? true : undefined}
											aria-describedby={generalInfoErrors.companyId ? "add-positions-company-error" : undefined}
											className={cn("w-full", generalInfoErrors.companyId && "border-destructive")}
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
									{generalInfoErrors.companyId && (
										<p id="add-positions-company-error" className="text-sm text-destructive">
											{generalInfoErrors.companyId}
										</p>
									)}
								</Field>
								<Field label="Категория">
									<FolderSelect
										folders={folders}
										value={folderId}
										onChange={setFolderId}
										onCreateFolder={async (name, color) => {
											const created = await onCreateFolder(name, color);
											setFolderId(created.id);
										}}
										nextFolderColor={nextFolderColor}
									/>
								</Field>

								<SectionGroupHeader title="Позиции" className="mt-2" />
								{positions.map((position, index) => (
									<PositionCard
										// biome-ignore lint/suspicious/noArrayIndexKey: positions are identified by index — no stable id available
										key={index}
										index={index}
										position={position}
										error={errors[index]}
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
										onClick={addPosition}
										disabled={!canAddPosition}
										aria-label="Добавить позицию"
										className="active:scale-[0.96] transition-transform duration-100 motion-reduce:transition-none motion-reduce:active:scale-100"
									>
										<Plus aria-hidden="true" className="size-4" />
										Добавить позицию
									</Button>
								</div>
							</div>
						</TooltipProvider>
					</div>

					<SheetFooter className={cn("sticky bottom-0 flex-row justify-between border-t", SURFACE_TINT)}>
						<Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
							Отмена
						</Button>
						<Button type="button" onClick={handleSubmit}>
							Добавить
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>

			<AlertDialog open={showDiscard} onOpenChange={setShowDiscard}>
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
