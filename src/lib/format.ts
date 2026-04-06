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
	return value > 0 ? "text-red-600 dark:text-red-400" : "text-primary";
}

export function formatDeviation(value: number | null | undefined): { text: string; className: string } {
	if (value == null) return { text: "\u2014", className: "" };
	const triangle = value > 0 ? "\u25B2\u2009" : value < 0 ? "\u25BC\u2009" : "";
	return { text: `${triangle}${formatPercent(value)}`, className: signClassName(value) };
}

const integerFormatter = new Intl.NumberFormat("ru-RU");

/** Format a raw digit string as a grouped integer (e.g. "1234567" → "1 234 567"). */
export function formatGroupedInteger(raw: string): string {
	const digits = raw.replace(/\D/g, "");
	if (!digits) return "";
	return integerFormatter.format(Number(digits));
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} Б`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

const dayMonthFormatter = new Intl.DateTimeFormat("ru-RU", {
	day: "2-digit",
	month: "2-digit",
});

export function formatDayMonth(iso: string): string {
	return dayMonthFormatter.format(new Date(iso));
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
	day: "numeric",
	month: "long",
	year: "numeric",
});

export function formatDate(iso: string): string {
	return dateFormatter.format(new Date(iso));
}

const datetimeFormatter = new Intl.DateTimeFormat("ru-RU", {
	day: "numeric",
	month: "long",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

export function formatDateTime(iso: string): string {
	return datetimeFormatter.format(new Date(iso));
}

export function getInitials(firstName: string, lastName: string): string {
	return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function formatDelivery(cost: number | null): string {
	if (cost == null) return "Самовывоз";
	if (cost === 0) return "Включена";
	return currencyFormatter.format(cost);
}

export function formatDeferral(days: number): string {
	if (days === 0) return "Предоплата";
	return pluralizeRu(days, "день", "дня", "дней");
}

export function stripProtocol(url: string): string {
	return url.replace(/^https?:\/\//, "");
}

export function formatAssigneeName(assignee: { firstName: string; lastName: string } | null): string {
	if (!assignee) return "Не назначен";
	return `${assignee.lastName} ${assignee.firstName}`;
}

export function pluralizeRu(count: number, one: string, few: string, many: string): string {
	const mod100 = count % 100;
	const mod10 = count % 10;
	if (mod100 >= 11 && mod100 <= 14) return `${count}\u00A0${many}`;
	if (mod10 === 1) return `${count}\u00A0${one}`;
	if (mod10 >= 2 && mod10 <= 4) return `${count}\u00A0${few}`;
	return `${count}\u00A0${many}`;
}
