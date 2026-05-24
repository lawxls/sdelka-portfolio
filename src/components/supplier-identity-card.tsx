import { cn } from "@/lib/utils";

export function FieldLabel({
	htmlFor,
	required,
	disabled,
	children,
}: {
	htmlFor?: string;
	required?: boolean;
	disabled?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className={cn("flex items-center gap-0.5", disabled && "opacity-60")}>
			{htmlFor ? (
				<label htmlFor={htmlFor} className="text-sm font-medium">
					{children}
				</label>
			) : (
				<span className="text-sm font-medium">{children}</span>
			)}
			{required && (
				<span className="text-destructive" aria-hidden="true">
					*
				</span>
			)}
		</div>
	);
}
