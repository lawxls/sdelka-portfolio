import { Loader2, Paperclip, Send, X } from "lucide-react";
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

let nextFileId = 0;

interface ChatComposerProps {
	onSend: (body: string, files: File[]) => Promise<unknown>;
	isPending?: boolean;
	error?: string | null;
}

export function ChatComposer({ onSend, isPending, error }: ChatComposerProps) {
	const [body, setBody] = useState("");
	const [entries, setEntries] = useState<FileEntry[]>([]);
	const [fileError, setFileError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const trimmed = body.trim();
	const canSend = (trimmed.length > 0 || entries.length > 0) && !isPending;

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
		setEntries((prev) => [...prev, ...selected.map((file) => ({ id: nextFileId++, file }))]);
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
		<form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t pt-3">
			<Textarea
				value={body}
				onChange={(e) => setBody(e.target.value)}
				placeholder="Написать сообщение…"
				rows={3}
				disabled={isPending}
			/>
			{entries.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{entries.map(({ id, file }) => (
						<div key={id} className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs">
							<span className="max-w-32 truncate">{file.name}</span>
							<span className="text-muted-foreground">{formatFileSize(file.size)}</span>
							<button
								type="button"
								onClick={() => removeFile(id)}
								className="rounded-sm hover:bg-muted"
								aria-label={`Удалить ${file.name}`}
							>
								<X className="size-3" aria-hidden="true" />
							</button>
						</div>
					))}
				</div>
			)}
			{displayError && (
				<p className="text-sm text-destructive" role="alert">
					{displayError}
				</p>
			)}
			<div className="flex justify-end gap-1">
				<input
					ref={fileInputRef}
					type="file"
					accept={ACCEPT}
					multiple
					className="hidden"
					onChange={handleFileChange}
					tabIndex={-1}
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					disabled={isPending}
					aria-label="Прикрепить файл"
					onClick={() => fileInputRef.current?.click()}
				>
					<Paperclip aria-hidden="true" />
				</Button>
				<Button type="submit" size="sm" disabled={!canSend}>
					{isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
					Отправить
				</Button>
			</div>
		</form>
	);
}
