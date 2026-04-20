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
		setDeadline(Math.max(MIN_DEADLINE, Math.min(num, MAX_DEADLINE)));
	}

	function handleDeadlineBlur() {
		const clamped = Math.max(MIN_DEADLINE, Math.min(MAX_DEADLINE, deadline));
		setDeadline(clamped);
		setDeadlineText(String(clamped));
	}

	function handleSave(e: React.FormEvent) {
		e.preventDefault();
		const clamped = Math.max(MIN_DEADLINE, Math.min(MAX_DEADLINE, deadline));
		setDeadline(clamped);
		setDeadlineText(String(clamped));
		setSavedDeadline(clamped);
		setSavedInstructions(instructions);
		toast.success("Изменения сохранены");
	}

	return (
		<main className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 px-xl py-lg">
			<div className="mx-auto w-full max-w-[48rem]">
				<form onSubmit={handleSave}>
					<section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
						<h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
							Параметры работы
						</h3>
						<div className="w-full max-w-[28rem] space-y-5">
							<div className="space-y-1.5">
								<label htmlFor={deadlineId} className="text-sm font-medium text-foreground">
									Дедлайн на ответ
								</label>
								<div className="flex items-center gap-2">
									<input
										id={deadlineId}
										type="text"
										inputMode="numeric"
										value={deadlineText}
										onChange={handleDeadlineInput}
										onBlur={handleDeadlineBlur}
										className="h-9 w-20 rounded-lg border border-input bg-background px-3 text-center text-sm tabular-nums outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
										autoComplete="off"
									/>
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

							<div className="pt-1">
								<Button type="submit" disabled={!isDirty}>
									Сохранить
								</Button>
							</div>
						</div>
					</section>
				</form>
			</div>
		</main>
	);
}
