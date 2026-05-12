import { describe, expect, it } from "vitest";
import type { ProcurementItem } from "../types";
import { getProcurementInquiryStatus } from "./get-procurement-inquiry-status";

type ItemShape = Pick<ProcurementItem, "status" | "searchCompleted">;

const item = (status: ItemShape["status"], searchCompleted?: boolean): ItemShape => ({ status, searchCompleted });

describe("getProcurementInquiryStatus", () => {
	it("empty items → searching", () => {
		expect(getProcurementInquiryStatus([])).toBe("searching");
	});

	it("any active searching → searching", () => {
		expect(getProcurementInquiryStatus([item("searching"), item("completed")])).toBe("searching");
	});

	it("active searching dominates over searching_completed", () => {
		expect(getProcurementInquiryStatus([item("searching"), item("searching", true)])).toBe("searching");
	});

	it("any negotiating (no active search) → negotiating", () => {
		expect(getProcurementInquiryStatus([item("negotiating"), item("completed")])).toBe("negotiating");
	});

	it("negotiating beats searching_completed", () => {
		expect(getProcurementInquiryStatus([item("negotiating"), item("searching", true)])).toBe("negotiating");
	});

	it("all completed → completed", () => {
		expect(getProcurementInquiryStatus([item("completed"), item("completed")])).toBe("completed");
	});

	it("all searching_completed → searching_completed", () => {
		expect(getProcurementInquiryStatus([item("searching", true), item("searching", true)])).toBe("searching_completed");
	});

	it("mix of searching_completed and completed → searching_completed", () => {
		expect(getProcurementInquiryStatus([item("searching", true), item("completed")])).toBe("searching_completed");
	});

	it("single searching item → searching", () => {
		expect(getProcurementInquiryStatus([item("searching")])).toBe("searching");
	});

	it("single completed item → completed", () => {
		expect(getProcurementInquiryStatus([item("completed")])).toBe("completed");
	});
});
