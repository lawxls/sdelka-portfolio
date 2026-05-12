import { describe, expect, it } from "vitest";
import { generateProcurementInquirySlug } from "./generate-procurement-inquiry-slug";

describe("generateProcurementInquirySlug", () => {
	it("returns T-001 for an empty list", () => {
		expect(generateProcurementInquirySlug([])).toBe("T-001");
	});

	it("returns the next sequential slug", () => {
		expect(generateProcurementInquirySlug(["T-001", "T-002"])).toBe("T-003");
	});

	it("zero-pads to 3 digits", () => {
		expect(generateProcurementInquirySlug(["T-008"])).toBe("T-001");
		expect(generateProcurementInquirySlug(Array.from({ length: 9 }, (_, i) => `T-00${i + 1}`))).toBe("T-010");
	});

	it("fills the lowest gap before extending the range", () => {
		expect(generateProcurementInquirySlug(["T-001", "T-003", "T-004"])).toBe("T-002");
	});

	it("ignores non-T slugs and malformed entries", () => {
		expect(generateProcurementInquirySlug(["X-001", "T-foo", "", "T-001"])).toBe("T-002");
	});

	it("renders 4+ digit slugs naturally beyond T-999", () => {
		const slugs = Array.from({ length: 999 }, (_, i) => `T-${String(i + 1).padStart(3, "0")}`);
		expect(generateProcurementInquirySlug(slugs)).toBe("T-1000");
	});

	it("is idempotent given the same input", () => {
		const slugs = ["T-001", "T-002"];
		expect(generateProcurementInquirySlug(slugs)).toBe(generateProcurementInquirySlug(slugs));
	});
});
