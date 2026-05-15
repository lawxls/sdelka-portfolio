import { BadgeCheck, Building2, Globe, LoaderCircle, Mail, MapPin } from "lucide-react";
import type { SupplierIdentity } from "@/data/domains/suppliers";
import { cn } from "@/lib/utils";

/** State for the supplier-identity preview card driven by INN lookup —
 * shared between «Добавить текущего поставщика» and «Добавить поставщика». */
export type SupplierCardState = "empty" | "loading" | "matched" | "miss";

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

function DetailRow({
	icon: Icon,
	label,
	value,
	href,
}: {
	icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	label: string;
	value: string;
	href?: string;
}) {
	const isEmpty = value.trim() === "";
	const content = isEmpty ? (
		<span className="text-muted-foreground">—</span>
	) : href ? (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="text-foreground underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-hidden break-all"
		>
			{value}
		</a>
	) : (
		<span className="text-foreground break-words">{value}</span>
	);
	return (
		<li className="flex items-start gap-2 text-sm leading-snug">
			<Icon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
			<span className="sr-only">{label}: </span>
			{content}
		</li>
	);
}

function PlaceholderRow({
	icon: Icon,
	hint,
}: {
	icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	hint: string;
}) {
	return (
		<li className="flex items-start gap-2 text-sm leading-snug">
			<Icon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
			<span className="text-muted-foreground/70">{hint}</span>
		</li>
	);
}

export function SupplierEmptyCard({ innFilled }: { innFilled: boolean }) {
	return (
		<div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3.5">
			<div className="flex items-start gap-2">
				<Building2 aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
				<h4 className="text-sm font-medium leading-snug text-foreground/80 text-balance">
					{innFilled ? "Ищем поставщика по ИНН…" : "Данные подставятся автоматически"}
				</h4>
			</div>
			<ul className="flex flex-col gap-1.5">
				<PlaceholderRow icon={Globe} hint="Сайт" />
				<PlaceholderRow icon={Mail} hint="Email" />
				<PlaceholderRow icon={MapPin} hint="Адрес" />
			</ul>
		</div>
	);
}

export function SupplierLoadingCard() {
	return (
		<div
			role="status"
			aria-live="polite"
			className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/40 p-3.5 animate-in fade-in-0 duration-150 motion-reduce:animate-none"
		>
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<LoaderCircle aria-hidden="true" className="size-4 animate-spin text-primary motion-reduce:animate-none" />
				<span>Ищем поставщика по ИНН…</span>
			</div>
			<ul className="flex flex-col gap-1.5">
				<PlaceholderRow icon={Globe} hint="Сайт" />
				<PlaceholderRow icon={Mail} hint="Email" />
				<PlaceholderRow icon={MapPin} hint="Адрес" />
			</ul>
		</div>
	);
}

export function SupplierMatchedCard({ identity }: { identity: SupplierIdentity }) {
	return (
		<section
			aria-label="Найденный поставщик"
			className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3.5 shadow-xs animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none"
		>
			<div className="flex items-start gap-2">
				<BadgeCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
				<h4 className="text-sm font-semibold leading-snug text-foreground text-balance break-words">
					{identity.companyName || "Без названия"}
				</h4>
			</div>
			<ul className="flex flex-col gap-1.5">
				<DetailRow
					icon={Globe}
					label="Сайт"
					value={identity.website}
					href={identity.website ? identity.website : undefined}
				/>
				<DetailRow
					icon={Mail}
					label="Email"
					value={identity.email}
					href={identity.email ? `mailto:${identity.email}` : undefined}
				/>
				<DetailRow icon={MapPin} label="Адрес" value={identity.address} />
			</ul>
		</section>
	);
}
