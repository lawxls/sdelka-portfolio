import { ArrowRight, Briefcase, Building2, Check, Rocket, Sparkles } from "lucide-react";
import { type ComponentType, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

type Period = "monthly" | "yearly";
type TariffId = "start" | "business" | "corporate";

const PERIODS = ["monthly", "yearly"] as const;
const PERIOD_LABELS: Record<Period, string> = { monthly: "Помесячно", yearly: "Годовая" };

const RUB = new Intl.NumberFormat("ru-RU");
const formatRub = (value: number) => `${RUB.format(value)} ₽`;

interface Tariff {
	id: TariffId;
	name: string;
	icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	monthlyPrice: number | null;
	yearlyPrice: number | null;
	priceFallback?: string;
	monthlyCaptionLines: readonly string[];
	monthlyInquiries: number | null;
	yearlyBonus: number | null;
	cta: string;
	features: string[];
	highlight: "popular" | null;
}

const TARIFFS: Tariff[] = [
	{
		id: "start",
		name: "Старт",
		icon: Rocket,
		monthlyPrice: 19_900,
		yearlyPrice: 199_900,
		monthlyCaptionLines: ["Оплата помесячно", "Отмена в любой момент"],
		monthlyInquiries: 5,
		yearlyBonus: 5,
		cta: "Подключить",
		features: [
			"Поиск поставщиков",
			"Генерация и рассылка RFQ",
			"ИИ-переговоры",
			"Сравнение КП",
			"2 сотрудника · 1 компания",
			"300 писем в день",
		],
		highlight: null,
	},
	{
		id: "business",
		name: "Бизнес",
		icon: Briefcase,
		monthlyPrice: 49_900,
		yearlyPrice: 499_900,
		monthlyCaptionLines: ["Оплата помесячно", "Отмена в любой момент"],
		monthlyInquiries: 15,
		yearlyBonus: 20,
		cta: "Подключить",
		features: [
			"Всё из тарифа Старт",
			"Проверка надёжности",
			"Персональный менеджер",
			"5 сотрудников · 3 компании",
			"Максимальная глубина",
			"700 писем в день",
			"Выездное обучение",
		],
		highlight: "popular",
	},
	{
		id: "corporate",
		name: "Корпорация",
		icon: Building2,
		monthlyPrice: null,
		yearlyPrice: null,
		priceFallback: "Под задачу",
		monthlyCaptionLines: ["Стоимость и лимиты под объём вашей закупочной функции"],
		monthlyInquiries: null,
		yearlyBonus: null,
		cta: "Запросить расчёт",
		features: [
			"Индивидуальные лимиты",
			"Индивидуальные интеграции",
			"Функции на заказ",
			"on-premise",
			"Приоритетная поддержка",
			"Спецусловия по объёму",
		],
		highlight: null,
	},
];

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

function TariffCard({ tariff, period }: { tariff: Tariff; period: Period }) {
	const isPopular = tariff.highlight === "popular";
	const Icon = tariff.icon;
	const isYearly = period === "yearly";
	const prices =
		tariff.monthlyPrice !== null && tariff.yearlyPrice !== null
			? {
					displayedMonthly: isYearly ? Math.floor(tariff.yearlyPrice / 12) : tariff.monthlyPrice,
					yearlyPrice: tariff.yearlyPrice,
					savings: tariff.monthlyPrice * 12 - tariff.yearlyPrice,
				}
			: null;

	function handleClick() {
		toast.success("Запрос отправлен. Мы свяжемся с вами в ближайшее время");
	}

	return (
		<article
			data-testid={`tariff-${tariff.id}`}
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
							{formatRub(prices.displayedMonthly)}
						</span>
						<span className="text-sm text-muted-foreground">/мес</span>
					</div>
				) : (
					<span className="text-3xl font-semibold tracking-tight text-foreground">{tariff.priceFallback}</span>
				)}
			</div>

			<div className="mt-3 space-y-1 text-sm text-muted-foreground">
				{isYearly && prices ? (
					<>
						<p className="text-pretty">{formatRub(prices.yearlyPrice)} единоразово</p>
						<p className="text-pretty">
							Экономия <span className="font-medium text-foreground tabular-nums">{formatRub(prices.savings)}</span> за
							год
						</p>
					</>
				) : (
					tariff.monthlyCaptionLines.map((line) => (
						<p key={line} className="text-pretty">
							{line}
						</p>
					))
				)}
			</div>

			{tariff.monthlyInquiries !== null && (
				<div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
					<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Лимит запросов</p>
					<p className="mt-1 text-base font-medium text-foreground tabular-nums">
						{isYearly
							? `${tariff.monthlyInquiries * 12 + (tariff.yearlyBonus ?? 0)} запросов в год`
							: `${tariff.monthlyInquiries} запросов в месяц`}
					</p>
					{tariff.yearlyBonus !== null && (
						<div className="mt-1.5 h-5">
							{isYearly && (
								<span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
									+{tariff.yearlyBonus} в подарок
								</span>
							)}
						</div>
					)}
				</div>
			)}

			<div className="mt-5 flex-1 border-t border-border pt-4">
				<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">В тарифе</p>
				<ul className="mt-3 space-y-2.5">
					{tariff.features.map((feature) => (
						<li key={feature} className="flex items-start gap-2 text-sm text-foreground">
							<Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
							<span>{feature}</span>
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
				{tariff.cta}
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
									{formatRub(tier.pricePerInquiry)}
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

export function TariffsSettingsPage() {
	const [period, setPeriod] = useState<Period>("monthly");

	return (
		<main className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 px-xl py-lg">
			<h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">Тарифы</h1>

			<div className="mb-8">
				<PeriodToggle value={period} onChange={setPeriod} />
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{TARIFFS.map((tariff) => (
					<TariffCard key={tariff.id} tariff={tariff} period={period} />
				))}
			</div>

			<TopUpPanel />
		</main>
	);
}
