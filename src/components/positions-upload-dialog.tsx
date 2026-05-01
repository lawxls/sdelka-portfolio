import { Download, Loader2 } from "lucide-react";
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
import { FileDropzone } from "./file-dropzone";
import { ImportPreview } from "./import-preview";

type Step = "upload" | "loading" | "preview";

interface PositionsUploadDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onImport: (items: NewItemInput[]) => void;
}

export function PositionsUploadDialog({ open, onOpenChange, onImport }: PositionsUploadDialogProps) {
	const [step, setStep] = useState<Step>("upload");
	const [parsedItems, setParsedItems] = useState<NewItemInput[]>([]);
	const [showCloseWarning, setShowCloseWarning] = useState(false);

	function resetDialog() {
		setStep("upload");
		setParsedItems([]);
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
		parseFile(file).then(
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
						<DialogTitle>Добавить позиции</DialogTitle>
						<DialogDescription className="sr-only">Загрузите файл с позициями</DialogDescription>
					</DialogHeader>
					{step === "upload" && (
						<div className="flex flex-col gap-4">
							<FileDropzone onFile={handleFile} />
							<p className="text-center text-xs text-muted-foreground">
								ИИ сам сформирует тендеры на&nbsp;основе загруженных позиций
							</p>
							<div className="flex items-center justify-end">
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
