import { ArrowLeft, CircleHelp, Download, FileUp, Loader2, PenLine } from "lucide-react";
import { useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseFile } from "@/data/mock-file-parser";
import type { NewItemInput } from "@/data/types";
import { cn } from "@/lib/utils";
import { FileDropzone } from "./file-dropzone";
import { ImportPreview } from "./import-preview";

type Step = "choice" | "upload" | "loading" | "preview";

interface AddPositionsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onManual: () => void;
	onImport: (items: NewItemInput[]) => void;
	/** Owning company id stamped onto each parsed item so the backend create
	 * call carries the required `companyId` field. */
	companyId: string;
}

function ChoiceCard({
	icon: Icon,
	title,
	description,
	onClick,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	description: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex flex-1 flex-col items-center gap-3 rounded-xl border border-border p-6 text-center",
				"transition-[background-color,scale] duration-150 hover:bg-muted active:scale-[0.96]",
				"motion-reduce:transition-none motion-reduce:active:scale-100",
				"focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-hidden",
			)}
		>
			<div className="flex size-12 items-center justify-center rounded-lg bg-muted">
				<Icon className="size-6 text-muted-foreground" aria-hidden="true" />
			</div>
			<div className="flex flex-col gap-1">
				<span className="text-sm font-medium">{title}</span>
				<span className="text-pretty text-xs text-muted-foreground">{description}</span>
			</div>
		</button>
	);
}

export function AddPositionsDialog({ open, onOpenChange, onManual, onImport, companyId }: AddPositionsDialogProps) {
	const [step, setStep] = useState<Step>("choice");
	const [parsedItems, setParsedItems] = useState<NewItemInput[]>([]);
	const [showCloseWarning, setShowCloseWarning] = useState(false);

	function resetDialog() {
		setStep("choice");
		setParsedItems([]);
	}

	function handleManual() {
		onOpenChange(false);
		resetDialog();
		onManual();
	}

	function handleOpenChange(next: boolean) {
		if (!next && step === "preview") {
			setShowCloseWarning(true);
			return;
		}
		if (!next) resetDialog();
		onOpenChange(next);
	}

	function handleConfirmClose() {
		setShowCloseWarning(false);
		resetDialog();
		onOpenChange(false);
	}

	function handleFile(file: File) {
		setStep("loading");
		parseFile(file, companyId).then(
			(items) => {
				setParsedItems(items);
				setStep("preview");
			},
			() => {
				setStep("upload");
				toast.error("Не удалось обработать файл");
			},
		);
	}

	function handleImport() {
		onImport(parsedItems);
		resetDialog();
		onOpenChange(false);
	}

	return (
		<>
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="sm:max-w-4xl max-h-[85vh]">
					<DialogHeader>
						<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
							<DialogTitle className="leading-tight">Добавить позиции</DialogTitle>
							<button
								type="button"
								onClick={() => {}}
								className={cn(
									"relative inline-flex h-6 items-center gap-1 rounded-full bg-muted px-2.5 text-xs font-medium text-muted-foreground",
									"transition-[background-color,color,scale] duration-150 hover:bg-muted/70 hover:text-foreground active:scale-[0.96]",
									"motion-reduce:transition-none motion-reduce:active:scale-100",
									"focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50",
									"before:absolute before:-inset-2 before:content-['']",
								)}
							>
								<CircleHelp aria-hidden="true" className="size-3.5" />
								Как это работает?
							</button>
						</div>
						<DialogDescription className="sr-only">Выберите способ добавления позиций</DialogDescription>
					</DialogHeader>
					{step === "choice" && (
						<div className="flex flex-col gap-4 sm:flex-row">
							<ChoiceCard
								icon={PenLine}
								title="Добавить вручную"
								description="Заполните данные для каждой позиции"
								onClick={handleManual}
							/>
							<ChoiceCard
								icon={FileUp}
								title="Загрузить из файла"
								description="Загрузите файл с позициями"
								onClick={() => setStep("upload")}
							/>
						</div>
					)}
					{step === "upload" && (
						<div className="flex flex-col gap-4">
							<FileDropzone onFile={handleFile} />
							<div className="flex items-center justify-between gap-2">
								<Button variant="ghost" onClick={() => setStep("choice")}>
									<ArrowLeft className="size-4" aria-hidden="true" />
									Назад
								</Button>
								<Button variant="ghost" onClick={() => {}}>
									<Download className="size-4" aria-hidden="true" />
									Скачать пример файла с&nbsp;позициями
								</Button>
							</div>
						</div>
					)}
					{step === "loading" && (
						<div className="flex flex-col items-center justify-center gap-3 py-12">
							<Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden="true" />
							<p className="text-sm text-muted-foreground">Обработка файла…</p>
						</div>
					)}
					{step === "preview" && (
						<ImportPreview
							items={parsedItems}
							onBack={() => {
								setParsedItems([]);
								setStep("upload");
							}}
							onImport={handleImport}
						/>
					)}
				</DialogContent>
			</Dialog>

			<AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Закрыть?</AlertDialogTitle>
						<AlertDialogDescription>Загруженные данные будут потеряны.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Продолжить</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={handleConfirmClose}>
							Закрыть
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
