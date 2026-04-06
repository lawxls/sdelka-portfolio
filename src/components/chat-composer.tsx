import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatComposerProps {
	onSend: (body: string) => Promise<unknown>;
	isPending?: boolean;
	error?: string | null;
}

export function ChatComposer({ onSend, isPending, error }: ChatComposerProps) {
	const [body, setBody] = useState("");

	const trimmed = body.trim();
	const canSend = trimmed.length > 0 && !isPending;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!canSend) return;
		try {
			await onSend(trimmed);
			setBody("");
		} catch {
			// error displayed via error prop from mutation state
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t pt-3">
			<Textarea
				value={body}
				onChange={(e) => setBody(e.target.value)}
				placeholder="Написать сообщение…"
				rows={3}
				disabled={isPending}
			/>
			{error && (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			)}
			<div className="flex justify-end">
				<Button type="submit" size="sm" disabled={!canSend}>
					{isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
					Отправить
				</Button>
			</div>
		</form>
	);
}
