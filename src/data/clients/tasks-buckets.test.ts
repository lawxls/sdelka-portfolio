import { describe, expect, it } from "vitest";
import { statusesToBucketString, statusToBucket } from "./tasks-buckets";

describe("statusToBucket", () => {
	it("maps assigned → active", () => {
		expect(statusToBucket("assigned")).toBe("active");
	});

	it("maps in_progress → active", () => {
		expect(statusToBucket("in_progress")).toBe("active");
	});

	it("maps completed → completed", () => {
		expect(statusToBucket("completed")).toBe("completed");
	});

	it("maps archived → archived", () => {
		expect(statusToBucket("archived")).toBe("archived");
	});
});

describe("statusesToBucketString", () => {
	it("returns undefined for an empty array", () => {
		expect(statusesToBucketString([])).toBeUndefined();
	});

	it("returns undefined for undefined input", () => {
		expect(statusesToBucketString(undefined)).toBeUndefined();
	});

	it("[assigned] → 'active'", () => {
		expect(statusesToBucketString(["assigned"])).toBe("active");
	});

	it("[assigned, in_progress] → 'active' (deduplicated)", () => {
		expect(statusesToBucketString(["assigned", "in_progress"])).toBe("active");
	});

	it("[completed] → 'completed'", () => {
		expect(statusesToBucketString(["completed"])).toBe("completed");
	});

	it("[completed, archived] → 'completed,archived' (order canonical: active < completed < archived)", () => {
		expect(statusesToBucketString(["archived", "completed"])).toBe("completed,archived");
	});

	it("[assigned, completed] → 'active,completed'", () => {
		expect(statusesToBucketString(["assigned", "completed"])).toBe("active,completed");
	});

	it("[assigned, in_progress, completed, archived] → 'active,completed,archived'", () => {
		expect(statusesToBucketString(["assigned", "in_progress", "completed", "archived"])).toBe(
			"active,completed,archived",
		);
	});
});
