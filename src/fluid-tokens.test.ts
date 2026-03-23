import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const css = readFileSync(resolve(__dirname, "index.css"), "utf-8");

describe("Fluid design tokens", () => {
	test("defines fluid heading sizes with clamp() in @theme", () => {
		for (const token of ["--text-lg", "--text-xl", "--text-2xl"]) {
			const pattern = new RegExp(`${token}\\s*:\\s*clamp\\(`);
			expect(css).toMatch(pattern);
		}
	});

	test("defines fluid spacing tokens with clamp() in @theme", () => {
		for (const token of ["--spacing-sm", "--spacing-md", "--spacing-lg", "--spacing-xl"]) {
			const pattern = new RegExp(`${token}\\s*:\\s*clamp\\(`);
			expect(css).toMatch(pattern);
		}
	});

	test("does not override body text size (text-sm)", () => {
		expect(css).not.toMatch(/--text-sm\s*:\s*clamp\(/);
	});
});
