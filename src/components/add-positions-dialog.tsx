import { ArrowLeft, Download, FileUp, Loader2, PenLine } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseFile } from "@/data/mock-file-parser";
import type { NewItemInput } from "@/data/types";
import { FileDropzone } from "./file-dropzone";

type Step = "choice" | "upload" | "loading" | "preview";

interface AddPositionsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onManual: () => void;
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
			className="flex flex-1 flex-col items-center gap-3 rounded-lg border border-border p-6 text-center transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			<div className="flex size-12 items-center justify-center rounded-lg bg-muted">
				<Icon className="size-6 text-muted-foreground" aria-hidden="true" />
			</div>
			<div className="flex flex-col gap-1">
				<span className="text-sm font-medium">{title}</span>
				<span className="text-xs text-muted-foreground">{description}</span>
			</div>
		</button>
	);
}

export function AddPositionsDialog({ open, onOpenChange, onManual }: AddPositionsDialogProps) {
	const [step, setStep] = useState<Step>("choice");
	const [_parsedItems, setParsedItems] = useState<NewItemInput[]>([]);

	function handleManual() {
		onOpenChange(false);
		onManual();
	}

	function handleOpenChange(next: boolean) {
		if (!next) {
			setStep("choice");
			setParsedItems([]);
		}
		onOpenChange(next);
	}

	function handleFile(file: File) {
		setStep("loading");
		parseFile(file).then((items) => {
			setParsedItems(items);
			setStep("preview");
		});
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-4xl max-h-[85vh] max-sm:inset-0 max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:top-0 max-sm:left-0 max-sm:h-svh max-sm:max-h-none">
				<DialogHeader>
					<DialogTitle>Добавить позиции</DialogTitle>
					<DialogDescription className="sr-only">Выберите способ добавления позиций</DialogDescription>
				</DialogHeader>
				{step === "choice" && (
					<div className="flex flex-col gap-4 sm:flex-row">
						<ChoiceCard
							icon={PenLine}
							title="Вручную"
							description="Заполните данные для каждой позиции"
							onClick={handleManual}
						/>
						<ChoiceCard
							icon={FileUp}
							title="Из файла"
							description="Загрузите файл с позициями"
							onClick={() => setStep("upload")}
						/>
					</div>
				)}
				{step === "upload" && (
					<div className="flex flex-col gap-4">
						<FileDropzone onFile={handleFile} />
						<div className="flex items-center justify-between">
							<Button variant="ghost" onClick={() => setStep("choice")}>
								<ArrowLeft className="size-4" aria-hidden="true" />
								Назад
							</Button>
							<Button variant="ghost" onClick={() => {}}>
								<Download className="size-4" aria-hidden="true" />
								Скачать шаблон
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
					<div className="py-8 text-center text-sm text-muted-foreground">
						Предпросмотр будет добавлен в следующем обновлении
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
