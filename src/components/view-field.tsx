export function ViewField({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-xs text-muted-foreground">{label}</span>
			<span className={`text-sm ${value ? "" : "text-muted-foreground/50"}`}>{value || "\u2014"}</span>
		</div>
	);
}
