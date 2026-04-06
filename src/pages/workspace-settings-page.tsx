import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_DEADLINE = 3;
const MIN_DEADLINE = 1;
const MAX_DEADLINE = 30;
const DEFAULT_INSTRUCTIONS = "";

export function WorkspaceSettingsPage() {
	const [deadline, setDeadline] = useState(DEFAULT_DEADLINE);
	const [deadlineText, setDeadlineText] = useState(String(DEFAULT_DEADLINE));
	const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
	const [savedDeadline, setSavedDeadline] = useState(DEFAULT_DEADLINE);
	const [savedInstructions, setSavedInstructions] = useState(DEFAULT_INSTRUCTIONS);

	const deadlineId = useId();
	const instructionsId = useId();

	const isDirty = deadline !== savedDeadline || instructions !== savedInstructions;

	function handleDeadlineInput(e: React.ChangeEvent<HTMLInputElement>) {
		const raw = e.target.value.replace(/\D/g, "");
		setDeadlineText(raw);
		if (raw === "") return;
		const num = Number.parseInt(raw, 10);
		setDeadline(Math.min(num, MAX_DEADLINE));
	}

	function handleDeadlineBlur() {
		const clamped = Math.max(MIN_DEADLINE, Math.min(MAX_DEADLINE, deadline));
		setDeadline(clamped);
		setDeadlineText(String(clamped));
	}

	function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setSavedDeadline(deadline);
		setSavedInstructions(instructions);
		toast.success("Изменения сохранены");
	}

	return (
		<main className="flex min-h-0 flex-1 flex-col overflow-auto px-lg py-md">
			<h1 className="text-lg font-semibold">Общие настройки</h1>

			<form onSubmit={handleSave} className="mt-6 w-full max-w-[28rem] space-y-6">
				<div className="space-y-1.5">
					<label htmlFor={deadlineId} className="text-sm font-medium text-foreground">
						Дедлайн на ответ
					</label>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="icon"
							aria-label="Уменьшить"
							disabled={deadline <= MIN_DEADLINE}
							onClick={() => {
								const next = Math.max(MIN_DEADLINE, deadline - 1);
								setDeadline(next);
								setDeadlineText(String(next));
							}}
						>
							<Minus className="size-4" aria-hidden="true" />
						</Button>
						<input
							id={deadlineId}
							type="text"
							inputMode="numeric"
							value={deadlineText}
							onChange={handleDeadlineInput}
							onBlur={handleDeadlineBlur}
							className="h-8 w-14 rounded-lg border border-input bg-transparent text-center text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
							autoComplete="off"
						/>
						<Button
							type="button"
							variant="outline"
							size="icon"
							aria-label="Увеличить"
							disabled={deadline >= MAX_DEADLINE}
							onClick={() => {
								const next = Math.min(MAX_DEADLINE, deadline + 1);
								setDeadline(next);
								setDeadlineText(String(next));
							}}
						>
							<Plus className="size-4" aria-hidden="true" />
						</Button>
						<span className="text-sm text-muted-foreground">Дней</span>
					</div>
				</div>

				<div className="space-y-1.5">
					<label htmlFor={instructionsId} className="text-sm font-medium text-foreground">
						Инструкции для агента
					</label>
					<Textarea
						id={instructionsId}
						value={instructions}
						onChange={(e) => setInstructions(e.target.value)}
						placeholder="Например: Всегда уточняй сроки поставки…"
						rows={4}
					/>
				</div>

				<Button type="submit" disabled={!isDirty}>
					Сохранить
				</Button>
			</form>
		</main>
	);
}
