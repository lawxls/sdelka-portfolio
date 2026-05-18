import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
	onFile: (file: File) => void;
	accept?: string;
	hint?: string;
	disabled?: boolean;
}

const DEFAULT_ACCEPT = ".xlsx,.csv,.xls";
const DEFAULT_HINT = "Перетащите файл сюда или нажмите для выбора";

export function FileDropzone({ onFile, accept = DEFAULT_ACCEPT, hint = DEFAULT_HINT, disabled }: FileDropzoneProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	function handleClick() {
		inputRef.current?.click();
	}

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) onFile(file);
	}

	function handleDragEnter(e: React.DragEvent) {
		e.preventDefault();
		setDragging(true);
	}

	function handleDragLeave(e: React.DragEvent) {
		e.preventDefault();
		setDragging(false);
	}

	function handleDragOver(e: React.DragEvent) {
		e.preventDefault();
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragging(false);
		const file = e.dataTransfer.files[0];
		if (file) onFile(file);
	}

	return (
		<>
			<button
				type="button"
				data-testid="dropzone"
				data-dragging={dragging || undefined}
				onClick={handleClick}
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				disabled={disabled}
				className={cn(
					"hidden w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent sm:flex",
					dragging ? "border-ring bg-muted" : "border-border",
				)}
			>
				<Upload className="size-10 text-muted-foreground" aria-hidden="true" />
				<p className="text-sm text-muted-foreground">{hint}</p>
			</button>
			<Button
				type="button"
				variant="outline"
				size="lg"
				onClick={handleClick}
				disabled={disabled}
				className="w-full sm:hidden"
			>
				<Upload aria-hidden="true" />
				Выбрать файл
			</Button>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				className="hidden"
				data-testid="dropzone-input"
				aria-label="Загрузить файл"
				onChange={handleChange}
			/>
		</>
	);
}
