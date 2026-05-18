import { Cog, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceSettings } from "@/data/domains/workspace-settings";
import { useUpdateWorkspaceSettings, useWorkspaceSettings } from "@/data/use-workspace-settings";
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

function WorkspaceForm({ data }: { data: WorkspaceSettings }) {
	const [instructions, setInstructions] = useState(data.agentInstructions);
	const updateMutation = useUpdateWorkspaceSettings();
	const instructionsId = useId();

	const isDirty = instructions !== data.agentInstructions;

	function handleSave(e: React.FormEvent) {
		e.preventDefault();
		updateMutation.mutate(
			{ agentInstructions: instructions },
			{
				onSuccess: () => toast.success("Изменения сохранены"),
				onError: () => toast.error("Не удалось сохранить настройки"),
			},
		);
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
				<Button type="submit" disabled={!isDirty || updateMutation.isPending}>
					{updateMutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
					Сохранить
				</Button>
			</div>
		</form>
	);
}

export function WorkspaceSettingsPage() {
	const { data, isError, refetch } = useWorkspaceSettings();

	if (isError) {
		return (
			<main className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 px-xl py-lg">
				<div className="mx-auto w-full max-w-[48rem]">
					<p className="mb-3 text-sm text-muted-foreground">Не удалось загрузить настройки</p>
					<Button variant="outline" onClick={() => refetch()} className="self-start">
						Повторить
					</Button>
				</div>
			</main>
		);
	}

	if (!data) {
		return (
			<main
				data-testid="workspace-settings-skeleton"
				className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 px-xl py-lg"
			>
				<div className="mx-auto w-full max-w-[48rem] space-y-5">
					<SectionCard>
						<Skeleton className="mb-5 h-4 w-32" />
						<Skeleton className="h-4 w-40" />
						<Skeleton className="mt-1.5 h-3 w-64" />
						<Skeleton className="mt-1.5 h-24 w-full" />
					</SectionCard>
				</div>
			</main>
		);
	}

	return (
		<main className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 px-xl py-lg">
			<div className="mx-auto w-full max-w-[48rem]">
				<WorkspaceForm key={data.agentInstructions} data={data} />
			</div>
		</main>
	);
}
