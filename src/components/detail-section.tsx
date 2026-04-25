import { LoaderCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DetailSection({
	title,
	editLabel,
	editing,
	onEdit,
	onCancel,
	onSave,
	saveDisabled,
	isPending,
	children,
}: {
	title: string;
	editLabel?: string;
	editing?: boolean;
	onEdit?: () => void;
	onCancel?: () => void;
	onSave?: () => void;
	saveDisabled?: boolean;
	isPending?: boolean;
	children: React.ReactNode;
}) {
	return (
		<section>
			<div className="mb-3 flex items-center gap-1.5 border-b border-border/50 pb-2">
				<h3 className="text-sm font-semibold text-foreground">{title}</h3>
				{!editing && editLabel && onEdit && (
					<button
						type="button"
						className="relative inline-flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-[color,scale] duration-150 ease-out hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100 after:absolute after:inset-[-8px] after:content-['']"
						onClick={onEdit}
						aria-label={editLabel}
					>
						<Pencil className="size-3" aria-hidden="true" />
					</button>
				)}
			</div>
			{children}
			{editing && onCancel && onSave && (
				<div className="mt-3 flex justify-end gap-2">
					<Button type="button" variant="outline" size="sm" onClick={onCancel}>
						Отмена
					</Button>
					<Button type="button" size="sm" disabled={saveDisabled} onClick={onSave}>
						{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
						Сохранить
					</Button>
				</div>
			)}
		</section>
	);
}

export function CardGrid({ children }: { children: React.ReactNode }) {
	return <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

export function FieldCard({
	label,
	children,
	span,
}: {
	label: string;
	children: React.ReactNode;
	span?: "full" | "half";
}) {
	const spanClass = span === "full" ? "sm:col-span-2 lg:col-span-3" : span === "half" ? "lg:col-span-2" : "";
	return (
		<div className={`rounded-md border border-border/60 bg-muted/30 p-2 flex flex-col gap-0.5 ${spanClass}`}>
			<span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
			{children}
		</div>
	);
}

export function ValueText({ value }: { value: string }) {
	const hasValue = value.length > 0;
	return <span className={`text-sm ${hasValue ? "" : "text-muted-foreground/50"}`}>{hasValue ? value : "—"}</span>;
}
