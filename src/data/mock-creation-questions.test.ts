import { describe, expect, test } from "vitest";
import { CREATION_QUESTIONS } from "./mock-creation-questions";

describe("CREATION_QUESTIONS", () => {
	test("exports exactly 5 questions", () => {
		expect(CREATION_QUESTIONS).toHaveLength(5);
	});

	test("every question has id, label, and non-empty options", () => {
		for (const q of CREATION_QUESTIONS) {
			expect(typeof q.id).toBe("string");
			expect(q.id.length).toBeGreaterThan(0);
			expect(q.label.length).toBeGreaterThan(0);
			expect(Array.isArray(q.options)).toBe(true);
			expect(q.options.length).toBeGreaterThan(0);
			for (const opt of q.options) {
				expect(typeof opt).toBe("string");
				expect(opt.length).toBeGreaterThan(0);
			}
		}
	});

	test("question ids are unique", () => {
		const ids = CREATION_QUESTIONS.map((q) => q.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
