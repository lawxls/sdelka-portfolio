import { Cog, Minus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckboxBadge } from "@/components/ui/checkbox-badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const DEFAULT_DEADLINE = 3;
const MIN_DEADLINE = 1;
const MAX_DEADLINE = 30;
const DEFAULT_INSTRUCTIONS = "";
const DEFAULT_AUTO_RFQ = false;

export function WorkspaceSettingsPage() {
	const [deadline, setDeadline] = useState(DEFAULT_DEADLINE);
	const [deadlineText, setDeadlineText] = useState(String(DEFAULT_DEADLINE));
	const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
	const [autoRfq, setAutoRfq] = useState(DEFAULT_AUTO_RFQ);
	const [savedDeadline, setSavedDeadline] = useState(DEFAULT_DEADLINE);
	const [savedInstructions, setSavedInstructions] = useState(DEFAULT_INSTRUCTIONS);
	const [savedAutoRfq, setSavedAutoRfq] = useState(DEFAULT_AUTO_RFQ);

	const deadlineId = useId();
	const instructionsId = useId();

	const isDirty = deadline !== savedDeadline || instructions !== savedInstructions || autoRfq !== savedAutoRfq;

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

	function bumpDeadline(delta: number) {
		const next = Math.max(MIN_DEADLINE, Math.min(MAX_DEADLINE, deadline + delta));
		setDeadline(next);
		setDeadlineText(String(next));
	}

	function handleSave(e: React.FormEvent) {
		e.preventDefault();
		const clamped = Math.max(MIN_DEADLINE, Math.min(MAX_DEADLINE, deadline));
		setDeadline(clamped);
		setDeadlineText(String(clamped));
		setSavedDeadline(clamped);
		setSavedInstructions(instructions);
		setSavedAutoRfq(autoRfq);
		toast.success("Изменения сохранены");
	}

	const stepperButton = cn(
		"flex size-10 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.96]",
		"transition-[background-color,color,scale] duration-150 ease-out motion-reduce:transition-none motion-reduce:active:scale-100",
		"focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40",
	);

	return (
		<main className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 px-xl py-lg">
			<div className="mx-auto w-full max-w-[48rem]">
				<form onSubmit={handleSave}>
					<section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
						<div className="mb-6 flex items-center gap-2">
							<Cog aria-hidden="true" className="size-5 shrink-0 text-primary" />
							<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Общие настройки</h3>
						</div>

						<div className="space-y-5">
							<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
								<label htmlFor={deadlineId} className="text-sm font-medium text-foreground">
									Дедлайн ответа на задачи
								</label>
								<div className="inline-flex h-10 w-fit items-center overflow-hidden rounded-lg border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
									<button
										type="button"
										aria-label="Уменьшить дедлайн"
										onClick={() => bumpDeadline(-1)}
										disabled={deadline <= MIN_DEADLINE}
										className={stepperButton}
									>
										<Minus className="size-4" aria-hidden="true" />
									</button>
									<div className="flex h-full items-center justify-center gap-1 border-x border-input px-3">
										<input
											id={deadlineId}
											type="text"
											inputMode="numeric"
											value={deadlineText}
											onChange={handleDeadlineInput}
											onBlur={handleDeadlineBlur}
											size={1}
											className="min-w-[1ch] [field-sizing:content] bg-transparent text-center text-sm font-medium tabular-nums outline-none"
											autoComplete="off"
										/>
										<span className="text-sm text-muted-foreground">дн.</span>
									</div>
									<button
										type="button"
										aria-label="Увеличить дедлайн"
										onClick={() => bumpDeadline(1)}
										disabled={deadline >= MAX_DEADLINE}
										className={stepperButton}
									>
										<Plus className="size-4" aria-hidden="true" />
									</button>
								</div>
							</div>

							<CheckboxBadge
								id="auto-rfq"
								checked={autoRfq}
								onChange={setAutoRfq}
								ariaLabel="Рассылать запросы КП автоматически"
							>
								Рассылать запросы КП автоматически
							</CheckboxBadge>

							<div className="space-y-1.5">
								<label htmlFor={instructionsId} className="text-sm font-medium text-foreground">
									Инструкции для агента
								</label>
								<p className="text-xs text-muted-foreground">Опишите стиль переговоров, приоритеты и ограничения</p>
								<Textarea
									id={instructionsId}
									value={instructions}
									onChange={(e) => setInstructions(e.target.value)}
									placeholder="Например: Всегда уточняй сроки поставки…"
									rows={5}
									className="mt-1.5"
								/>
							</div>

							<div className="flex justify-end border-t border-border pt-4">
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
