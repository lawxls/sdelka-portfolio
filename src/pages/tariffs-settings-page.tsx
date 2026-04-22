import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Highlight = "popular" | "current" | null;

interface Tariff {
	id: string;
	name: string;
	subtitle: string;
	price: string;
	priceNote: string | null;
	pitch: string;
	features: string[];
	cta: string;
	highlight: Highlight;
}

const TARIFFS: Tariff[] = [
	{
		id: "basic",
		name: "Базовый",
		subtitle: "Для начинающих",
		price: "Бесплатно",
		priceNote: null,
		pitch: "Идеальный старт для знакомства с возможностями платформы",
		features: ["1 пользователь", "1 запрос в месяц", "Чат с поддержкой"],
		cta: "По умолчанию",
		highlight: "current",
	},
	{
		id: "business",
		name: "Бизнес",
		subtitle: "Для растущих компаний",
		price: "Индивидуально",
		priceNote: null,
		pitch: "За скорость, прозрачность и эффективность в закупках",
		features: [
			"Все функции платформы",
			"До 5 пользователей",
			"30\u2013150 запросов в месяц",
			"50\u00A0GB хранилища",
			"Персональный менеджер",
			"Приоритетная поддержка",
			"Аналитика и отчётность",
		],
		cta: "Обсудить условия",
		highlight: "popular",
	},
	{
		id: "corporate",
		name: "Корпоративный",
		subtitle: "Для крупного бизнеса",
		price: "Индивидуально",
		priceNote: null,
		pitch: "Полный контроль и максимальные возможности для вашей компании",
		features: [
			"Безлимитные пользователи",
			"Безлимитное хранилище",
			"Безлимитные запросы",
			"SLA",
			"Корпоративные домены",
			"Персональная настройка",
			"Обучение команды",
			"Выделенная поддержка",
			"Кастомный функционал",
		],
		cta: "Обсудить условия",
		highlight: null,
	},
];

function TariffCard({ tariff }: { tariff: Tariff }) {
	const isPopular = tariff.highlight === "popular";
	const isCurrent = tariff.highlight === "current";

	function handleClick() {
		if (isCurrent) return;
		toast.success("Запрос отправлен. Мы свяжемся с вами в ближайшее время");
	}

	return (
		<article
			data-testid={`tariff-${tariff.id}`}
			className={cn(
				"relative flex flex-col rounded-2xl border bg-background p-6 shadow-sm transition-[border-color,box-shadow] duration-150 ease-out",
				isPopular ? "border-primary/60 ring-1 ring-primary/40" : "border-border",
			)}
		>
			{isPopular && (
				<span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground shadow-sm">
					<Sparkles className="size-3" aria-hidden="true" />
					Популярный
				</span>
			)}

			<header className="space-y-1">
				<h3 className="text-xl font-semibold tracking-tight text-foreground">{tariff.name}</h3>
				<p className="text-sm text-muted-foreground">{tariff.subtitle}</p>
			</header>

			<div className="mt-5 flex items-baseline gap-1">
				<span className={cn("font-semibold tracking-tight", tariff.price === "Бесплатно" ? "text-3xl" : "text-2xl")}>
					{tariff.price}
				</span>
				{tariff.priceNote && <span className="text-sm text-muted-foreground">{tariff.priceNote}</span>}
			</div>

			<p className="mt-3 text-sm text-pretty text-muted-foreground">{tariff.pitch}</p>

			<Button
				type="button"
				size="lg"
				variant={isPopular ? "default" : "outline"}
				className={cn("mt-6", isCurrent && "opacity-80")}
				onClick={handleClick}
				aria-disabled={isCurrent || undefined}
			>
				{tariff.cta}
			</Button>

			<div className="mt-6 border-t border-border pt-5">
				<ul className="space-y-2.5">
					{tariff.features.map((feature) => (
						<li key={feature} className="flex items-start gap-2 text-sm text-foreground">
							<Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
							<span>{feature}</span>
						</li>
					))}
				</ul>
			</div>
		</article>
	);
}

export function TariffsSettingsPage() {
	return (
		<main className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 px-xl py-lg">
			<div className="mb-6 max-w-[48rem]">
				<h1 className="font-heading text-2xl font-semibold tracking-tight">Тарифы</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Выберите подходящий план. В любой момент можно перейти на другой тариф или обсудить индивидуальные условия.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{TARIFFS.map((tariff) => (
					<TariffCard key={tariff.id} tariff={tariff} />
				))}
			</div>
		</main>
	);
}
