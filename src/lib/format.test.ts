import { describe, expect, it } from "vitest";
import { formatCurrency, formatDeviation, formatPercent } from "./format";

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
