const currencyFormatter = new Intl.NumberFormat("ru-RU", {
	style: "currency",
	currency: "RUB",
	maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("ru-RU", {
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
	return `${sign}${percentFormatter.format(value)}\u2009%`;
}

export function signClassName(value: number | null | undefined): string {
	if (value == null || value === 0) return "";
	return value > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400";
}

export function formatDeviation(value: number | null | undefined): { text: string; className: string } {
	if (value == null) return { text: "\u2014", className: "" };
	const triangle = value > 0 ? "\u25B2\u2009" : value < 0 ? "\u25BC\u2009" : "";
	return { text: `${triangle}${formatPercent(value)}`, className: signClassName(value) };
}
