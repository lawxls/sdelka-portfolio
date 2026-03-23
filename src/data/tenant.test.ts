import { afterEach, describe, expect, it, vi } from "vitest";
import { getTenant } from "./tenant";

afterEach(() => {
	vi.restoreAllMocks();
});

function mockHostname(hostname: string) {
	vi.spyOn(window, "location", "get").mockReturnValue({
		...window.location,
		hostname,
	});
}

describe("getTenant", () => {
	it("extracts subdomain from acme.sdelka.ai", () => {
		mockHostname("acme.sdelka.ai");
		expect(getTenant()).toBe("acme");
	});

	it("extracts subdomain from test-company.sdelka.ai", () => {
		mockHostname("test-company.sdelka.ai");
		expect(getTenant()).toBe("test-company");
	});

	it("extracts subdomain from acme.localhost", () => {
		mockHostname("acme.localhost");
		expect(getTenant()).toBe("acme");
	});

	it("returns null for bare localhost", () => {
		mockHostname("localhost");
		expect(getTenant()).toBeNull();
	});

	it("returns null for bare sdelka.ai", () => {
		mockHostname("sdelka.ai");
		expect(getTenant()).toBeNull();
	});

	it("returns null for bare IP address", () => {
		mockHostname("127.0.0.1");
		expect(getTenant()).toBeNull();
	});

	it("extracts subdomain from multi-level like acme.staging.sdelka.ai", () => {
		mockHostname("acme.staging.sdelka.ai");
		expect(getTenant()).toBe("acme");
	});
});
