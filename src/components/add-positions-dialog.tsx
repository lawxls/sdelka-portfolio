import { FileUp, PenLine } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
	function handleManual() {
		onOpenChange(false);
		onManual();
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-4xl max-h-[85vh] max-sm:inset-0 max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:top-0 max-sm:left-0 max-sm:h-svh max-sm:max-h-none">
				<DialogHeader>
					<DialogTitle>Добавить позиции</DialogTitle>
					<DialogDescription className="sr-only">Выберите способ добавления позиций</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4 sm:flex-row">
					<ChoiceCard
						icon={PenLine}
						title="Вручную"
						description="Заполните данные для каждой позиции"
						onClick={handleManual}
					/>
					<ChoiceCard icon={FileUp} title="Из файла" description="Загрузите файл с позициями" onClick={() => {}} />
				</div>
			</DialogContent>
		</Dialog>
	);
}
