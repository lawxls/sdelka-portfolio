import { Plus } from "lucide-react";
import { useRef, useState } from "react";
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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { NewItemInput } from "@/data/types";
import { toNumberOrUndefined } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MAX_FILE_SIZE, MAX_TOTAL_SIZE, PositionCard, SURFACE_TINT } from "./create-procurement-inquiry-drawer";
import { defaultPosition, isPositionDraftDirty, type PositionDraft } from "./use-create-procurement-inquiry-form";

interface PositionError {
	name?: string;
}

interface AddPositionsManualDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (items: NewItemInput[]) => void;
}

function toItemInput(position: PositionDraft): NewItemInput {
	const payload: NewItemInput = { name: position.name.trim() };

	const description = position.description.trim();
	if (description) payload.description = description;
	if (position.unit !== "") payload.unit = position.unit;

	const annual = toNumberOrUndefined(position.annualQuantity);
	if (annual !== undefined) payload.annualQuantity = annual;

	const perDelivery = toNumberOrUndefined(position.quantityPerDelivery);
	if (perDelivery !== undefined) payload.quantityPerDelivery = perDelivery;

	const price = toNumberOrUndefined(position.pricePerUnit);
	if (price !== undefined) payload.currentPrice = price;

	return payload;
}

export function AddPositionsManualDrawer({ open, onOpenChange, onSubmit }: AddPositionsManualDrawerProps) {
	const [positions, setPositions] = useState<PositionDraft[]>(() => [defaultPosition()]);
	const [errors, setErrors] = useState<PositionError[]>(() => [{}]);
	const [showDiscard, setShowDiscard] = useState(false);
	const nameInputRefs = useRef<(HTMLInputElement | null)[]>([]);

	const isDirty = positions.length > 1 || positions.some(isPositionDraftDirty);
	const canAddPosition = (() => {
		const last = positions[positions.length - 1];
		return !!last && last.name.trim() !== "";
	})();
	const showRemove = positions.length > 1;

	function reset() {
		setPositions([defaultPosition()]);
		setErrors([{}]);
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

	function addFilesTo(positionIndex: number, newFiles: FileList | null) {
		if (!newFiles || newFiles.length === 0) return;
		setPositions((prev) => {
			const position = prev[positionIndex];
			if (!position) return prev;
			let runningTotal = prev.reduce((sum, p) => sum + p.files.reduce((s, f) => s + f.size, 0), 0);
			const toAdd: File[] = [];
			for (const file of newFiles) {
				if (file.size > MAX_FILE_SIZE) continue;
				if (runningTotal + file.size > MAX_TOTAL_SIZE) break;
				toAdd.push(file);
				runningTotal += file.size;
			}
			if (toAdd.length === 0) return prev;
			const next = prev.slice();
			next[positionIndex] = { ...position, files: [...position.files, ...toAdd] };
			return next;
		});
	}

	function removeFileFrom(positionIndex: number, fileIndex: number) {
		setPositions((prev) => {
			const position = prev[positionIndex];
			if (!position) return prev;
			const next = prev.slice();
			next[positionIndex] = { ...position, files: position.files.filter((_, i) => i !== fileIndex) };
			return next;
		});
	}

	function validate(): { ok: boolean; firstErrorIndex: number } {
		const nextErrors = positions.map((p) => (p.name.trim() ? {} : { name: "Укажите название позиции" }));
		setErrors(nextErrors);
		const firstErrorIndex = nextErrors.findIndex((e) => e.name);
		return { ok: firstErrorIndex < 0, firstErrorIndex };
	}

	function handleSubmit() {
		const { ok, firstErrorIndex } = validate();
		if (!ok) {
			nameInputRefs.current[firstErrorIndex]?.focus();
			return;
		}
		onSubmit(positions.map(toItemInput));
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
								{positions.map((position, index) => (
									<PositionCard
										// biome-ignore lint/suspicious/noArrayIndexKey: positions are identified by index — no stable id available
										key={index}
										index={index}
										position={position}
										error={errors[index]}
										onChange={(key, value) => updatePosition(index, key, value)}
										onRemove={showRemove ? () => removePosition(index) : undefined}
										onFilesAdd={(files) => addFilesTo(index, files)}
										onFileRemove={(fileIndex) => removeFileFrom(index, fileIndex)}
										nameInputRef={(el) => {
											nameInputRefs.current[index] = el;
										}}
									/>
								))}
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
