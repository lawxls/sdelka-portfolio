const currencyFormatter = new Intl.NumberFormat("ru-RU", {
	style: "currency",
	currency: "RUB",
	maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("ru-RU", {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

export function formatCurrency(value: number | null | undefined): string {
	if (value == null) return "\u2014";
	return currencyFormatter.format(value);
}

export function formatPercent(value: number | null | undefined): string {
	if (value == null) return "\u2014";
	const sign = value > 0 ? "+" : "";
	return `${sign}${numberFormatter.format(value)}\u2009%`;
}

export function formatDeviation(value: number | null | undefined): { text: string; className: string } {
	if (value == null) return { text: "\u2014", className: "" };
	const text = formatPercent(value);
	if (value > 0) return { text, className: "text-red-600 dark:text-red-400" };
	if (value < 0) return { text, className: "text-green-600 dark:text-green-400" };
	return { text, className: "" };
}
