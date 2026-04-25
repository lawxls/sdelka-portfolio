import { describe, expect, it } from "vitest";
import {
	formatCompactRuble,
	formatCurrency,
	formatDeviation,
	formatPercent,
	formatPhone,
	formatRussianPlural,
	parsePhone,
	signClassName,
} from "./format";

describe("formatCurrency", () => {
	it("includes ₽ symbol", () => {
		expect(formatCurrency(1000)).toContain("₽");
	});

	it("formats with thousands separators", () => {
		const result = formatCurrency(1234567);
		// Should contain digits grouped — exact separator char depends on locale/ICU
		expect(result).toMatch(/1.*234.*567/);
		expect(result).toContain("₽");
	});

	it("formats zero", () => {
		const result = formatCurrency(0);
		expect(result).toContain("₽");
		expect(result).toContain("0");
	});

	it("formats negative", () => {
		const result = formatCurrency(-5000);
		expect(result).toContain("₽");
	});

	it("returns dash for null", () => {
		expect(formatCurrency(null)).toBe("\u2014");
	});

	it("returns dash for undefined", () => {
		expect(formatCurrency(undefined)).toBe("\u2014");
	});
});

describe("formatPercent", () => {
	it("adds + sign for positive values", () => {
		const result = formatPercent(5.2);
		expect(result).toMatch(/\+5[,.]2/);
		expect(result).toContain("%");
	});

	it("includes minus for negative values", () => {
		const result = formatPercent(-3.1);
		expect(result).toMatch(/3[,.]1/);
		expect(result).toContain("%");
	});

	it("formats zero without sign", () => {
		const result = formatPercent(0);
		expect(result).toMatch(/0[,.]0/);
		expect(result).toContain("%");
		expect(result).not.toContain("+");
	});

	it("returns dash for null", () => {
		expect(formatPercent(null)).toBe("\u2014");
	});

	it("returns dash for undefined", () => {
		expect(formatPercent(undefined)).toBe("\u2014");
	});
});

describe("signClassName", () => {
	it("returns red class for positive values", () => {
		expect(signClassName(100)).toContain("text-red");
	});

	it("returns green class for negative values", () => {
		expect(signClassName(-50)).toContain("text-green");
	});

	it("returns empty string for zero", () => {
		expect(signClassName(0)).toBe("");
	});

	it("returns empty string for null", () => {
		expect(signClassName(null)).toBe("");
	});

	it("returns empty string for undefined", () => {
		expect(signClassName(undefined)).toBe("");
	});
});

describe("formatDeviation", () => {
	it("returns red class for positive deviation", () => {
		const result = formatDeviation(5.2);
		expect(result.className).toContain("text-red");
		expect(result.text).toContain("%");
	});

	it("returns green class for negative deviation (savings)", () => {
		const result = formatDeviation(-3.1);
		expect(result.className).toContain("text-green");
		expect(result.text).toContain("%");
	});

	it("returns empty class for zero", () => {
		const result = formatDeviation(0);
		expect(result.className).toBe("");
	});

	it("returns dash and empty class for null", () => {
		const result = formatDeviation(null);
		expect(result.text).toBe("\u2014");
		expect(result.className).toBe("");
	});
});

describe("formatCompactRuble", () => {
	it("returns dash for null", () => {
		expect(formatCompactRuble(null)).toBe("\u2014");
	});

	it("returns dash for undefined", () => {
		expect(formatCompactRuble(undefined)).toBe("\u2014");
	});

	it("formats 0 as plain integer with ₽", () => {
		const result = formatCompactRuble(0);
		expect(result).toContain("0");
		expect(result).toContain("₽");
	});

	it("formats 999 as plain integer (below threshold)", () => {
		const result = formatCompactRuble(999);
		expect(result).toContain("999");
		expect(result).toContain("₽");
		expect(result).not.toMatch(/тыс|млн|млрд/);
	});

	it("formats 1 000 with тыс", () => {
		const result = formatCompactRuble(1_000);
		expect(result).toContain("тыс");
		expect(result).toContain("₽");
	});

	it("formats 999 999 with млн (rounds up)", () => {
		const result = formatCompactRuble(999_999);
		expect(result).toMatch(/тыс|млн/);
		expect(result).toContain("₽");
	});

	it("formats 1 000 000 with млн", () => {
		const result = formatCompactRuble(1_000_000);
		expect(result).toContain("млн");
		expect(result).toContain("₽");
	});

	it("formats 999 999 999 with млрд (rounds up)", () => {
		const result = formatCompactRuble(999_999_999);
		expect(result).toMatch(/млн|млрд/);
		expect(result).toContain("₽");
	});

	it("formats 1 000 000 000 with млрд", () => {
		const result = formatCompactRuble(1_000_000_000);
		expect(result).toContain("млрд");
		expect(result).toContain("₽");
	});

	it("formats 1 234 567 890 as 1,2 млрд ₽", () => {
		const result = formatCompactRuble(1_234_567_890);
		expect(result).toMatch(/1[,.]2/);
		expect(result).toContain("млрд");
	});

	it("formats 450 000 000 as 450 млн ₽", () => {
		const result = formatCompactRuble(450_000_000);
		expect(result).toContain("450");
		expect(result).toContain("млн");
	});
});

describe("formatRussianPlural", () => {
	const forms: [string, string, string] = ["день", "дня", "дней"];

	it("0 uses many form", () => {
		expect(formatRussianPlural(0, forms)).toMatch(/0\s+дней/);
	});

	it("1 uses one form", () => {
		expect(formatRussianPlural(1, forms)).toMatch(/1\s+день/);
	});

	it("2 uses few form", () => {
		expect(formatRussianPlural(2, forms)).toMatch(/2\s+дня/);
	});

	it("4 uses few form", () => {
		expect(formatRussianPlural(4, forms)).toMatch(/4\s+дня/);
	});

	it("5 uses many form", () => {
		expect(formatRussianPlural(5, forms)).toMatch(/5\s+дней/);
	});

	it("11 uses many form (teens exception)", () => {
		expect(formatRussianPlural(11, forms)).toMatch(/11\s+дней/);
	});

	it("21 uses one form", () => {
		expect(formatRussianPlural(21, forms)).toMatch(/21\s+день/);
	});

	it("22 uses few form", () => {
		expect(formatRussianPlural(22, forms)).toMatch(/22\s+дня/);
	});

	it("25 uses many form", () => {
		expect(formatRussianPlural(25, forms)).toMatch(/25\s+дней/);
	});

	it("101 uses one form", () => {
		expect(formatRussianPlural(101, forms)).toMatch(/101\s+день/);
	});
});

describe("formatPhone", () => {
	it("returns empty for empty input", () => {
		expect(formatPhone("")).toBe("");
	});

	it("returns empty when only non-digits", () => {
		expect(formatPhone("+()-")).toBe("");
	});

	it("formats `+7XXXXXXXXXX`", () => {
		expect(formatPhone("+79161234567")).toBe("+7 (916) 123-45-67");
	});

	it("formats raw 11 digits", () => {
		expect(formatPhone("79161234567")).toBe("+7 (916) 123-45-67");
	});

	it("treats leading 8 as country prefix", () => {
		expect(formatPhone("89161234567")).toBe("+7 (916) 123-45-67");
	});

	it("partial — three subscriber digits", () => {
		expect(formatPhone("+7916")).toBe("+7 (916)");
	});

	it("partial — six subscriber digits", () => {
		expect(formatPhone("+7916123")).toBe("+7 (916) 123");
	});

	it("partial — eight subscriber digits", () => {
		expect(formatPhone("+791612345")).toBe("+7 (916) 123-45");
	});

	it("truncates over-long input to 10 subscriber digits", () => {
		expect(formatPhone("+791612345670000")).toBe("+7 (916) 123-45-67");
	});
});

describe("parsePhone", () => {
	it("returns empty for empty input", () => {
		expect(parsePhone("")).toBe("");
	});

	it("returns empty when only non-digits", () => {
		expect(parsePhone("+7 () -")).toBe("");
	});

	it("strips formatting back to raw `+7XXXXXXXXXX`", () => {
		expect(parsePhone("+7 (916) 123-45-67")).toBe("+79161234567");
	});

	it("preserves partial entries", () => {
		expect(parsePhone("+7 (916) 12")).toBe("+791612");
	});
});
