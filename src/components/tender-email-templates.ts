import type { Unit } from "@/data/types";
import { formatShortDate } from "@/lib/format";

export interface EmailContext {
	folderName: string | null;
	positions: Array<{
		name: string;
		quantityPerDelivery: string;
		annualQuantity: string;
		unit: Unit | "";
	}>;
	deadline: string;
}

export interface EmailVariant {
	subject: string;
	body: string;
}

interface VariantTemplate {
	subject: (cat: string) => string;
	greeting: string;
	intro: (cat: string) => string;
	outro: string;
	closing: string;
	deadlinePrefix: string;
}

const VARIANTS: VariantTemplate[] = [
	{
		subject: (cat) => `Запрос коммерческого предложения — ${cat}`,
		greeting: "Здравствуйте!",
		intro: (cat) => `Просим направить коммерческое предложение на следующие позиции (${cat}):`,
		outro: "В КП укажите цену за единицу без НДС и срок поставки. Закупка разовая.",
		closing: "Спасибо!",
		deadlinePrefix: "Срок ответа",
	},
	{
		subject: (cat) => `Тендер на ${cat} — запрос КП`,
		greeting: "Добрый день!",
		intro: (cat) => `Рассматриваем разовую закупку по теме «${cat}». Будем благодарны за КП на позиции:`,
		outro: "Просьба указать цену за единицу без НДС, сроки поставки и условия оплаты.",
		closing: "С уважением, отдел закупок.",
		deadlinePrefix: "Ожидаем ответ",
	},
	{
		subject: (cat) => `Просьба о КП: ${cat}`,
		greeting: "Приветствуем!",
		intro: (cat) => `Просьба выслать КП на разовую закупку по направлению «${cat}»:`,
		outro: "Нужны: цена за единицу без НДС, срок поставки, возможность предоставить отсрочку.",
		closing: "Спасибо за оперативный ответ!",
		deadlinePrefix: "Пожалуйста, ответьте",
	},
];

function categoryLabel(ctx: EmailContext): string {
	if (ctx.folderName?.trim()) return ctx.folderName.trim();
	const firstNamed = ctx.positions.find((p) => p.name.trim() !== "");
	if (firstNamed) return firstNamed.name.trim();
	return "товары";
}

function positionLine(p: EmailContext["positions"][number]): string | null {
	const name = p.name.trim();
	if (!name) return null;
	const qty = p.quantityPerDelivery.trim() || p.annualQuantity.trim();
	const unit = p.unit;
	if (qty && unit) return `• ${name} — ${qty} ${unit}`;
	if (qty) return `• ${name} — ${qty}`;
	return `• ${name}`;
}

function positionsBlock(ctx: EmailContext): string | null {
	const lines = ctx.positions.map(positionLine).filter((line): line is string => line !== null);
	if (lines.length === 0) return null;
	return lines.join("\n");
}

function deadlineLine(ctx: EmailContext, prefix: string): string | null {
	if (!ctx.deadline) return null;
	return `${prefix} до ${formatShortDate(ctx.deadline)}.`;
}

function buildVariant(template: VariantTemplate, ctx: EmailContext): EmailVariant {
	const cat = categoryLabel(ctx);
	const body = [
		template.greeting,
		"",
		template.intro(cat),
		positionsBlock(ctx),
		"",
		template.outro,
		deadlineLine(ctx, template.deadlinePrefix),
		"",
		template.closing,
	]
		.filter((line): line is string => line !== null)
		.join("\n");
	return { subject: template.subject(cat), body };
}

export function buildEmailVariant(index: number, ctx: EmailContext): EmailVariant {
	const safe = ((index % VARIANTS.length) + VARIANTS.length) % VARIANTS.length;
	return buildVariant(VARIANTS[safe], ctx);
}
