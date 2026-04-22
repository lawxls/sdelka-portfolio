import { ArrowUp, Loader2, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatFileSize } from "@/lib/format";

const ALLOWED_EXTENSIONS = new Set([".pdf", ".xlsx", ".xls", ".doc", ".docx", ".csv"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_COUNT = 5;
const ACCEPT = ".pdf,.xlsx,.xls,.doc,.docx,.csv";

function getExtension(name: string): string {
	const dot = name.lastIndexOf(".");
	return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

interface FileEntry {
	id: number;
	file: File;
}

interface ChatComposerProps {
	onSend: (body: string, files: File[]) => Promise<unknown>;
	isPending?: boolean;
	/** Fully block interaction (distinct from isPending which only runs during a submit). */
	disabled?: boolean;
	error?: string | null;
	placeholder?: string;
}

export function ChatComposer({
	onSend,
	isPending,
	disabled,
	error,
	placeholder = "Написать сообщение…",
}: ChatComposerProps) {
	const [body, setBody] = useState("");
	const [entries, setEntries] = useState<FileEntry[]>([]);
	const [fileError, setFileError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const nextFileId = useRef(0);

	const isInactive = !!(isPending || disabled);
	const trimmed = body.trim();
	const canSend = (trimmed.length > 0 || entries.length > 0) && !isInactive;

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const selected = Array.from(e.target.files ?? []);
		// Reset input so the same file can be re-selected
		if (fileInputRef.current) fileInputRef.current.value = "";
		if (selected.length === 0) return;

		// Validate types
		const invalidType = selected.find((f) => !ALLOWED_EXTENSIONS.has(getExtension(f.name)));
		if (invalidType) {
			setFileError(`Недопустимый формат файла: ${invalidType.name}`);
			return;
		}

		// Validate sizes
		const oversize = selected.find((f) => f.size > MAX_FILE_SIZE);
		if (oversize) {
			setFileError(`Файл «${oversize.name}» превышает 10 МБ`);
			return;
		}

		// Validate count
		if (entries.length + selected.length > MAX_FILE_COUNT) {
			setFileError(`Максимум 5 файлов на сообщение`);
			return;
		}

		setFileError(null);
		setEntries((prev) => [...prev, ...selected.map((file) => ({ id: nextFileId.current++, file }))]);
	}

	function removeFile(id: number) {
		setEntries((prev) => prev.filter((e) => e.id !== id));
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!canSend) return;
		try {
			await onSend(
				trimmed,
				entries.map((e) => e.file),
			);
			setBody("");
			setEntries([]);
			setFileError(null);
		} catch {
			// error displayed via error prop from mutation state
		}
	}

	const displayError = error || fileError;

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2" aria-disabled={disabled || undefined}>
			<div className="relative rounded-2xl border border-input bg-muted/30 transition-colors focus-within:border-ring">
				<Textarea
					value={body}
					onChange={(e) => setBody(e.target.value)}
					placeholder={placeholder}
					rows={3}
					disabled={isInactive}
					className="resize-none border-0 bg-transparent px-5 pt-4 pr-14 shadow-none focus-visible:ring-0 disabled:bg-transparent dark:bg-transparent dark:disabled:bg-transparent"
				/>
				{entries.length > 0 && (
					<div className="flex flex-wrap gap-1.5 px-3 pb-2">
						{entries.map(({ id, file }) => (
							<div
								key={id}
								className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs"
							>
								<span className="max-w-32 truncate">{file.name}</span>
								<span className="text-muted-foreground">{formatFileSize(file.size)}</span>
								<button
									type="button"
									onClick={() => removeFile(id)}
									className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
									aria-label={`Удалить ${file.name}`}
								>
									<X className="size-3" aria-hidden="true" />
								</button>
							</div>
						))}
					</div>
				)}
				<div className="flex items-center justify-between px-3 pb-2.5">
					<input
						ref={fileInputRef}
						type="file"
						accept={ACCEPT}
						multiple
						className="hidden"
						onChange={handleFileChange}
						tabIndex={-1}
					/>
					<button
						type="button"
						disabled={isInactive}
						aria-label="Прикрепить файл"
						onClick={() => fileInputRef.current?.click()}
						className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
					>
						<Paperclip className="size-5" aria-hidden="true" />
					</button>
					<Button
						type="submit"
						size="icon-sm"
						disabled={!canSend}
						aria-label="Отправить"
						className="size-8 rounded-full"
					>
						{isPending ? (
							<Loader2 className="size-4 animate-spin" aria-hidden="true" />
						) : (
							<ArrowUp className="size-4" aria-hidden="true" />
						)}
					</Button>
				</div>
			</div>
			{displayError && (
				<p className="text-sm text-destructive" role="alert">
					{displayError}
				</p>
			)}
		</form>
	);
}
