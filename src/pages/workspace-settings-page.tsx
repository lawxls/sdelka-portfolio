import { Cog, PenLine } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/data/use-me";
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

function buildDefaultSignature(firstName: string, lastName: string): string {
	const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
	return fullName ? `С уважением,\n${fullName}` : "С уважением,";
}

function WorkspaceForm({ defaultSignature }: { defaultSignature: string }) {
	const [instructions, setInstructions] = useState("");
	const [savedInstructions, setSavedInstructions] = useState("");
	const [signature, setSignature] = useState(defaultSignature);
	const [savedSignature, setSavedSignature] = useState(defaultSignature);

	const instructionsId = useId();
	const signatureId = useId();

	const isDirty = instructions !== savedInstructions || signature !== savedSignature;

	function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setSavedInstructions(instructions);
		setSavedSignature(signature);
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

			<SectionCard>
				<SectionHeader icon={PenLine} title="Подпись в письмах" />
				<div className="space-y-1.5">
					<label htmlFor={signatureId} className="text-sm font-medium text-foreground">
						Подпись
					</label>
					<p className="text-xs text-muted-foreground">
						Будет добавляться в конце писем поставщикам — например, ФИО, должность и контакты.
					</p>
					<Textarea
						id={signatureId}
						value={signature}
						onChange={(e) => setSignature(e.target.value)}
						rows={4}
						className="mt-1.5 whitespace-pre-wrap"
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
	const { data: me } = useMe();

	return (
		<main className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 px-xl py-lg">
			<div className="mx-auto w-full max-w-[48rem]">
				{me ? <WorkspaceForm defaultSignature={buildDefaultSignature(me.first_name, me.last_name)} /> : null}
			</div>
		</main>
	);
}
