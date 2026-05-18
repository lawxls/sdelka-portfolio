import { Cog } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CARD_BASE = "rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6";

function SectionCard({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
	return (
		<section className={cn(CARD_BASE, className)} {...props}>
			{children}
		</section>
	);
}

function SectionHeader({
	icon: Icon,
	title,
}: {
	icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	title: string;
}) {
	return (
		<div className="mb-5 flex items-center gap-2">
			<Icon aria-hidden className="size-5 shrink-0 text-primary" />
			<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
		</div>
	);
}

function WorkspaceForm() {
	const [instructions, setInstructions] = useState("");
	const [savedInstructions, setSavedInstructions] = useState("");

	const instructionsId = useId();

	const isDirty = instructions !== savedInstructions;

	function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setSavedInstructions(instructions);
		toast.success("Изменения сохранены");
	}

	return (
		<form onSubmit={handleSave} className="space-y-5">
			<SectionCard>
				<SectionHeader icon={Cog} title="Общие настройки" />
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
			</SectionCard>

			<div className="flex justify-end">
				<Button type="submit" disabled={!isDirty}>
					Сохранить
				</Button>
			</div>
		</form>
	);
}

export function WorkspaceSettingsPage() {
	return (
		<main className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 px-xl py-lg">
			<div className="mx-auto w-full max-w-[48rem]">
				<WorkspaceForm />
			</div>
		</main>
	);
}
