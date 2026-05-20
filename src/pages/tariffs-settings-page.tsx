import { ArrowRight, Briefcase, Building2, Check, Rocket, Sparkles } from "lucide-react";
import { type ComponentType, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tariff } from "@/data/domains/tariffs";
import { useTariffs } from "@/data/use-tariffs";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Period = "monthly" | "yearly";

const PERIODS = ["monthly", "yearly"] as const;
const PERIOD_LABELS: Record<Period, string> = { monthly: "Помесячно", yearly: "Годовая" };

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const ICONS_BY_SLUG: Record<string, IconComponent> = {
	start: Rocket,
	business: Briefcase,
	enterprise: Building2,
};

const PAID_CAPTION = ["Оплата помесячно", "Отмена в любой момент"] as const;

interface TopUpTier {
	id: string;
	label: string;
	pricePerInquiry: number;
}

const TOP_UP_TIERS: TopUpTier[] = [
	{ id: "none", label: "Без подписки", pricePerInquiry: 4_900 },
	{ id: "start", label: "В тарифе Старт", pricePerInquiry: 3_900 },
	{ id: "business", label: "В тарифе Бизнес", pricePerInquiry: 2_900 },
];

function yearlyTotalPrice(tariff: Tariff): number | null {
	if (tariff.yearlyPrice !== null) return tariff.yearlyPrice;
	if (tariff.price === null) return null;
	return Math.round((tariff.price * 12 * (100 - tariff.yearlyPriceDiscount)) / 100);
}

function TariffCard({ tariff, period }: { tariff: Tariff; period: Period }) {
	const isIndividual = tariff.priceType === "individual";
	const isPopular = tariff.isPopular;
	const Icon = ICONS_BY_SLUG[tariff.slug] ?? Rocket;
	const isYearly = period === "yearly";
	const yearlyTotal = yearlyTotalPrice(tariff);
	const prices =
		tariff.price !== null && yearlyTotal !== null
			? {
					displayedMonthly: isYearly ? Math.floor(yearlyTotal / 12) : tariff.price,
					yearlyPrice: yearlyTotal,
					savings: tariff.price * 12 - yearlyTotal,
				}
			: null;
	const inquiriesForPeriod = isYearly ? tariff.inquiriesPerYear : tariff.inquiriesPerMonth;
	const periodCaption = isIndividual ? [tariff.shortDescription] : PAID_CAPTION;

	function handleClick() {
		toast.success("Запрос отправлен. Мы свяжемся с вами в ближайшее время");
	}

	return (
		<article
			data-testid={`tariff-${tariff.slug}`}
			className={cn(
				"relative flex flex-col rounded-2xl border bg-background p-6",
				isPopular ? "border-primary/60 shadow-lg ring-1 ring-primary/40" : "border-border shadow-sm",
			)}
		>
			{isPopular && (
				<span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold tracking-wide text-primary-foreground shadow-sm">
					Популярный
				</span>
			)}

			<header className="flex items-start justify-between gap-3">
				<h3 className="font-heading text-xl font-semibold tracking-tight text-foreground">{tariff.name}</h3>
				<span className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-muted/60 text-muted-foreground">
					<Icon className="size-4" aria-hidden={true} />
				</span>
			</header>

			<div className="mt-5">
				{prices ? (
					<div className="flex flex-wrap items-baseline gap-x-2">
						<span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
							{formatCurrency(prices.displayedMonthly)}
						</span>
						<span className="text-sm text-muted-foreground">/мес</span>
					</div>
				) : (
					<span className="text-3xl font-semibold tracking-tight text-foreground">Под задачу</span>
				)}
			</div>

			<div className="mt-3 space-y-1 text-sm text-muted-foreground">
				{isYearly && prices ? (
					<>
						<p className="text-pretty">{formatCurrency(prices.yearlyPrice)} за год</p>
						{prices.savings > 0 && (
							<p className="text-pretty">
								Экономия{" "}
								<span className="font-medium text-foreground tabular-nums">{formatCurrency(prices.savings)}</span> за
								год
							</p>
						)}
					</>
				) : (
					periodCaption.map((line) => (
						<p key={line} className="text-pretty">
							{line}
						</p>
					))
				)}
			</div>

			{inquiriesForPeriod !== null && (
				<div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
					<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Лимит запросов</p>
					<p className="mt-1 text-base font-medium text-foreground tabular-nums">
						{isYearly ? `${inquiriesForPeriod} запросов в год` : `${inquiriesForPeriod} запросов в месяц`}
					</p>
				</div>
			)}

			<div className="mt-5 flex-1 border-t border-border pt-4">
				<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">В тарифе</p>
				<ul className="mt-3 space-y-2.5">
					{tariff.features.map((feature) => (
						<li key={feature.position} className="flex items-start gap-2 text-sm text-foreground">
							<Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
							<span>{feature.name}</span>
						</li>
					))}
				</ul>
			</div>

			<Button
				type="button"
				size="lg"
				variant={isPopular ? "default" : "outline"}
				className="mt-6 gap-2"
				onClick={handleClick}
			>
				{isIndividual ? "Запросить расчёт" : "Подключить"}
				<ArrowRight
					className="size-4 transition-transform duration-150 ease-out group-hover/button:translate-x-0.5"
					aria-hidden="true"
				/>
			</Button>
		</article>
	);
}

function PeriodToggle({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			<SegmentedControl<Period> options={PERIODS} labels={PERIOD_LABELS} value={value} onChange={onChange} />
			<p className="flex items-center gap-1.5 text-sm text-muted-foreground">
				<Sparkles className="size-3.5 text-primary" aria-hidden="true" />
				Годовая подписка — <span className="font-medium text-foreground">выгоднее на&nbsp;16%</span>
			</p>
		</div>
	);
}

function TopUpPanel() {
	return (
		<section data-testid="top-up-panel" className="mt-10 rounded-2xl border border-border bg-muted/40 p-6 sm:p-8">
			<div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
				<div className="max-w-[28rem]">
					<h2 className="font-heading text-lg font-semibold tracking-tight text-balance text-foreground">
						Если лимит кончится — докупите запросы
					</h2>
					<p className="mt-1 text-sm text-pretty text-muted-foreground">
						Платите только за то, что нужно сверх лимита.
					</p>
				</div>
				<ul className="flex flex-wrap gap-3">
					{TOP_UP_TIERS.map((tier) => (
						<li
							key={tier.id}
							className="min-w-[9rem] flex-1 rounded-xl border border-border bg-background px-4 py-3 shadow-sm"
						>
							<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{tier.label}</p>
							<p className="mt-1 flex items-baseline gap-1 text-foreground">
								<span className="text-xl font-semibold tracking-tight tabular-nums">
									{formatCurrency(tier.pricePerInquiry)}
								</span>
								<span className="text-xs text-muted-foreground">/запрос</span>
							</p>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

function TariffsSkeleton() {
	return (
		<div
			data-testid="tariffs-skeleton"
			className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
			aria-busy="true"
			aria-live="polite"
		>
			{["a", "b", "c"].map((id) => (
				<article key={id} className="flex flex-col rounded-2xl border border-border bg-background p-6 shadow-sm">
					<Skeleton className="h-5 w-24" />
					<Skeleton className="mt-5 h-8 w-36" />
					<Skeleton className="mt-3 h-3 w-40" />
					<Skeleton className="mt-5 h-16 w-full" />
					<div className="mt-5 space-y-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-4 w-2/3" />
						<Skeleton className="h-4 w-4/5" />
					</div>
					<Skeleton className="mt-6 h-10 w-full" />
				</article>
			))}
		</div>
	);
}

export function TariffsSettingsPage() {
	const [period, setPeriod] = useState<Period>("monthly");
	const { data: tariffs, isError, isLoading, refetch } = useTariffs();

	return (
		<main className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 px-xl py-lg">
			<h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">Тарифы</h1>

			<div className="mb-8">
				<PeriodToggle value={period} onChange={setPeriod} />
			</div>

			{isError ? (
				<div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
					<p className="mb-3 text-sm text-muted-foreground">Не удалось загрузить тарифы</p>
					<Button variant="outline" onClick={() => refetch()}>
						Повторить
					</Button>
				</div>
			) : isLoading || !tariffs ? (
				<TariffsSkeleton />
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{tariffs.map((tariff) => (
						<TariffCard key={tariff.id} tariff={tariff} period={period} />
					))}
				</div>
			)}

			<TopUpPanel />
		</main>
	);
}
