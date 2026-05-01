import { describe, expect, it } from "vitest";
import { generateTenderSlug } from "./generate-tender-slug";

describe("generateTenderSlug", () => {
	it("returns T-001 for an empty list", () => {
		expect(generateTenderSlug([])).toBe("T-001");
	});

	it("returns the next sequential slug", () => {
		expect(generateTenderSlug(["T-001", "T-002"])).toBe("T-003");
	});

	it("zero-pads to 3 digits", () => {
		expect(generateTenderSlug(["T-008"])).toBe("T-001");
		expect(generateTenderSlug(Array.from({ length: 9 }, (_, i) => `T-00${i + 1}`))).toBe("T-010");
	});

	it("fills the lowest gap before extending the range", () => {
		expect(generateTenderSlug(["T-001", "T-003", "T-004"])).toBe("T-002");
	});

	it("ignores non-T slugs and malformed entries", () => {
		expect(generateTenderSlug(["X-001", "T-foo", "", "T-001"])).toBe("T-002");
	});

	it("renders 4+ digit slugs naturally beyond T-999", () => {
		const slugs = Array.from({ length: 999 }, (_, i) => `T-${String(i + 1).padStart(3, "0")}`);
		expect(generateTenderSlug(slugs)).toBe("T-1000");
	});

	it("is idempotent given the same input", () => {
		const slugs = ["T-001", "T-002"];
		expect(generateTenderSlug(slugs)).toBe(generateTenderSlug(slugs));
	});
});
