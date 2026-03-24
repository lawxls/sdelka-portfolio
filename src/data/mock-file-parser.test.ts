import { describe, expect, test, vi } from "vitest";
import { parseFile } from "./mock-file-parser";

describe("parseFile", () => {
	test("returns 23 items with required name field after delay", async () => {
		vi.useFakeTimers();
		const file = new File(["data"], "items.xlsx");
		const promise = parseFile(file);

		vi.advanceTimersByTime(1500);
		const items = await promise;

		expect(items).toHaveLength(23);
		for (const item of items) {
			expect(item.name).toBeTruthy();
		}

		vi.useRealTimers();
	});
});
