import { Cog } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_INSTRUCTIONS = "";

export function WorkspaceSettingsPage() {
	const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
	const [savedInstructions, setSavedInstructions] = useState(DEFAULT_INSTRUCTIONS);

	const instructionsId = useId();

	const isDirty = instructions !== savedInstructions;

	function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setSavedInstructions(instructions);
		toast.success("Изменения сохранены");
	}

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
