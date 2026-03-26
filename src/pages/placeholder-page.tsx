import type { LucideIcon } from "lucide-react";

interface PlaceholderPageProps {
	icon: LucideIcon;
	title: string;
	subtitle: string;
}

export function PlaceholderPage({ icon: Icon, title, subtitle }: PlaceholderPageProps) {
	return (
		<div className="flex flex-1 items-center justify-center">
			<div className="text-center">
				<Icon data-testid="placeholder-icon" className="mx-auto size-16 text-muted-foreground" />
				<h1 className="mt-4 text-2xl font-semibold">{title}</h1>
				<p className="mt-2 text-muted-foreground">{subtitle}</p>
			</div>
		</div>
	);
}
